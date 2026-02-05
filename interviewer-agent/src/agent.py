import logging
import os
import asyncio
from typing import Optional
from urllib.parse import quote
import handlebars
import json
from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    RunContext,
    ToolError,
    cli,
    function_tool,
    get_job_context,
    room_io,
)
from livekit.plugins import (
    cartesia,
    deepgram,
    openai,
    silero,
    noise_cancellation,
)
from livekit.plugins.turn_detector.multilingual import MultilingualModel

load_dotenv(".env.local")

AGENT_NAME = os.getenv("AGENT_NAME", "interviewer-agent")

logger = logging.getLogger(f"agent-{AGENT_NAME}")

# Interview Time Configuration (Seconds)
# Production values: 15m, 25m, 30m
TIME_LIMIT_MINIMUM_SECONDS = 15 * 60
TIME_LIMIT_SOFT_WARNING_SECONDS = 25 * 60
TIME_LIMIT_HARD_CUTOFF_SECONDS = 30 * 60
TIME_REMAINING_WARNING_SECONDS = TIME_LIMIT_HARD_CUTOFF_SECONDS - TIME_LIMIT_SOFT_WARNING_SECONDS


class VariableTemplater:
    def __init__(self, metadata: str, additional: dict[str, dict[str, str]] | None = None) -> None:
        self.variables = {
            "metadata": self._parse_metadata(metadata),
        }
        if additional:
            self.variables.update(additional)
        self._cache = {}
        self._compiler = handlebars.Compiler()

    def _parse_metadata(self, metadata: str) -> dict:
        try:
            value = json.loads(metadata)
            if isinstance(value, dict):
                return value
            else:
                logger.warning(f"Job metadata is not a JSON dict: {metadata}")
                return {}
        except json.JSONDecodeError:
            logger.warning(f"Failed to decode metadata JSON: {metadata}")
            return {}

    def _compile(self, template: str):
        if template in self._cache:
            return self._cache[template]
        self._cache[template] = self._compiler.compile(template)
        return self._cache[template]

    def render(self, template: str):
        return self._compile(template)(self.variables)


class DefaultAgent(Agent):
    def __init__(self, metadata: str) -> None:
        self._templater = VariableTemplater(
            metadata,
            additional={
                "time_limit_minimum": f"{TIME_LIMIT_MINIMUM_SECONDS} seconds",
                "time_limit_soft_warning": f"{TIME_LIMIT_SOFT_WARNING_SECONDS} seconds",
                "time_limit_hard_cutoff": f"{TIME_LIMIT_HARD_CUTOFF_SECONDS} seconds",
                "time_remaining_warning": f"{TIME_REMAINING_WARNING_SECONDS} seconds",
            },
        )
        super().__init__(
            instructions=self._templater.render("""You are an experienced Technical Interviewer at a top-tier tech company. 
Your goal is to assess the candidate's coding skills in {{metadata.programming_language}}.

=== THE PROBLEM ===
Here is the problem description the user sees:
{{metadata.text_based_problem_description_given_to_user}}

=== REFERENCE GUIDE (FOR YOUR EYES ONLY) ===
Use this guide to evaluate the candidate's approach and provide hints if necessary. Do not enforce specific implementation details if their logic is valid.
{{metadata.interviewer_problem_reference_guide}}

=== BEHAVIORAL PHASES ===
1. **INTRODUCTION:** - Greet the candidate, introduce the format of the interview and the problem.

2. **DURING CODING (PASSIVE MODE):**
- **CRITICAL:** Be quiet while the user is typing. Do not interrupt their thought process.
- Only speak if:
a) The candidate asks a direct question.
b) The candidate has been silent for a dangerously long time (e.g., > 2 minutes).
c) The candidate explicitly asks for feedback (e.g., "Does this look right?").
- If the candidate is stuck, offer a small nudge based on the Reference Guide. **Do not reveal the full solution.**
- As the candidate writes code or discusses their solution, ask them questions to test their understanding as an interviewer would, and ask questions about things like time complexity if appropriate.


=== TIME MANAGEMENT ===
- The interview is strictly {{time_limit_hard_cutoff}} long.
- **PHASE 1 (First {{time_limit_minimum}}):** The interview cannot end early. If the candidate tries to finish, prompt them to extend the session (e.g., "Let's optimize this", "What if we changed the constraints?").
- **PHASE 2 ({{time_limit_soft_warning}} Mark):** You will receive a system warning when {{time_remaining_warning}} remain. At that point, stop new coding tasks and move to wrap-up/summary.
- **ENDING EARLY:** You can end the interview before the hard cutoff if the candidate has finished or the discussion is naturally over. Use the `end_interview` tool to do this.
=== TOOLS & DATA ===
- **Reading Code:** You cannot see the screen directly. You must use the `get_codepad_state` tool to see their code. Call it only when requested or necessary.
- **Cursor/Selection:** The tool output will contain `<CURSOR>` (caret position) or `<SELECTION>...</SELECTION>` (highlighted text). Use these to understand exactly what line or variable the user is focusing on.
- **System Events:** You may receive messages starting with `SYSTEM_EVENT`. These are logs from the code runner (e.g., "User ran code: SyntaxError"). React to these naturally (e.g., "Ah, looks like a syntax error on line 5").

=== VOICE OUTPUT RULES ===
- Speak naturally and concisely, as an interviewer would.
- **DO NOT** read the example code, test cases, function signatures, or input/output samples aloud.
- Do not read code character-by-character (e.g., never say underscore, don't say "def underscore two underscore sum").
- You are interviewing for strong candidates, so don't give the solution away or be overly helpful.
- Do not use markdown, lists, or JSON in your response."""),
        )

    async def on_enter(self):
        self._monitor_task = asyncio.create_task(self.monitor_interview_time())
        await self.session.generate_reply(
            instructions=self._templater.render("Greet the candidate professionally with a 'hello, I'll be your interviewer for this coding interview'. Introduce the format and purpose of the interview, which is to understand the candidates problem solving ability. Then say 'I'll read through the problem then give you a chance to ask any questions and say what you're thinking'. Then summarize the problem description from {{metadata.text_based_problem_description_given_to_user}} to the candidate. Do NOT read any examples, function signatures, input/output samples, or test cases out loud. Mention that they can interrupt you at any point, and to please walk you what they are thinking throughout. Make a key point about wanting to hear you think outloud. Then finish by asking: 'Do you have any questions?'"),
            allow_interruptions=False,
        )

    async def monitor_interview_time(self):
        logger.info(f"Starting interview timer. Limits: Soft={TIME_LIMIT_SOFT_WARNING_SECONDS}s, Hard={TIME_LIMIT_HARD_CUTOFF_SECONDS}s")
        try:
            # Phase 2: Soft Warning
            await asyncio.sleep(TIME_LIMIT_SOFT_WARNING_SECONDS)
            
            logger.info(f"Triggering soft warning at {TIME_LIMIT_SOFT_WARNING_SECONDS}s mark")
            soft_warning = (
                f"[URGENT] We have {TIME_REMAINING_WARNING_SECONDS} seconds remaining. "
                f"1. Verbally acknowledge the time: 'We have about {TIME_REMAINING_WARNING_SECONDS} seconds left.'"
                "2. Stop the user from writing new code. "
                "3. Ask them to summarize their approach or discuss complexity. "
                "4. If they have an incomplete solution, discuss how they might finish it."
                "5. Do not start new topics, end the interview when it feels natural. Use the `end_interview` tool to close the session."
            )
            await self.session.generate_reply(
                instructions=soft_warning,
                allow_interruptions=True
            )

            # Phase 3: Hard Cut-off
            # Calculate remaining sleep time relative to previous sleep
            remaining_sleep = TIME_LIMIT_HARD_CUTOFF_SECONDS - TIME_LIMIT_SOFT_WARNING_SECONDS
            if remaining_sleep > 0:
                await asyncio.sleep(remaining_sleep)

            logger.info(f"Triggering hard cut-off at {TIME_LIMIT_HARD_CUTOFF_SECONDS}s mark")
            try:
                await self.session.say(
                    "Ok great, that brings us to the end of the interview. Thanks for your time today, you will recive feedback shortly. Goodbye.",
                    allow_interruptions=False
                )
            except Exception as e:
                logger.error(f"Error saying goodbye: {e}")

            self.session.shutdown(drain=True)
            
        except asyncio.CancelledError:
            logger.info("Interview timer cancelled")
        except Exception as e:
            logger.error(f"Error in interview timer: {e}")

    @function_tool(name="get_codepad_state")
    async def _client_tool_get_codepad_state(
        self, context: RunContext
    ) -> str | None:
        """
        Use this tool to retrieve the current state of the candidate's code editor, including the full code text and an indicator of what the user is currently focused on. The code may contain a <CURSOR> token marking the exact caret position, or <SELECTION> and </SELECTION> tags wrapping any text the user has highlighted. You should call this tool primarily when the candidate explicitly asks for feedback (e.g., \"Is this correct?\", \"I'm stuck\"), references a specific part of their code, or if the user has been silent for a long period and you need to check if they are actively writing code or require a nudge.
        """

        room = get_job_context().room
        linked_participant = context.session.room_io.linked_participant
        if not linked_participant:
            raise ToolError("No linked participant found")

        payload = {}

        try:
            response = await room.local_participant.perform_rpc(
                destination_identity=linked_participant.identity,
                method="get_codepad_state",
                payload=json.dumps(payload),
                response_timeout=10.0,
            )
            return response
        except ToolError:
            raise
        except Exception as e:
            raise ToolError(f"error: {e!s}") from e

    @function_tool(name="end_interview")
    async def _client_tool_end_interview(self, context: RunContext) -> None:
        """
        Use this tool to end the interview session immediately. 
        You should call this when the interview has reached a natural conclusion, or if the candidate has successfully completed the task and follow-up discussion before the time limit.
        Always say a polite goodbye before calling this tool, for example 'Ok great, that brings us to the end of the interview. Thanks for your time today, you will recive feedback shortly. Goodbye.',
        """
        logger.info("Agent initiated interview end")
        
        if hasattr(self, '_monitor_task') and self._monitor_task:
            self._monitor_task.cancel()
             
        self.session.shutdown(drain=True)


server = AgentServer()

def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()

server.setup_fnc = prewarm

@server.rtc_session(agent_name=AGENT_NAME)
async def entrypoint(ctx: JobContext):
    session = AgentSession(
        stt=deepgram.STT(model="nova-3"),
        llm=openai.LLM(model="gpt-4o-mini"),
        tts=cartesia.TTS(voice="a167e0f3-df7e-4d52-a9c3-f949145efdab"),
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],
        preemptive_generation=True,
    )

    await session.start(
        agent=DefaultAgent(metadata=ctx.job.metadata),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: noise_cancellation.BVCTelephony() if params.participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP else noise_cancellation.BVC(),
            ),
        ),
    )


if __name__ == "__main__":
    cli.run_app(server)
