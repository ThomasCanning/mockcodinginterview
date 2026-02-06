import { NextResponse } from 'next/server';
import { AccessToken, type AccessTokenOptions, type VideoGrant } from 'livekit-server-sdk';
import { RoomConfiguration } from '@livekit/protocol';
import { Agent } from "@mastra/core/agent";
import { z } from "zod";

type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
  initialCode?: string;
};

// NOTE: you are expected to define the following environment variables in `.env.local`:
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

// don't cache the results
export const revalidate = 0;

export const questionGenerationAgent = new Agent({
  id: "question-generation-agent",
  name: "Question Generation Agent",
  instructions: `
      You are an expert technical interviewer at a top-tier tech company. 
      Your goal is to generate a realistic coding interview question.
      
      You must generate two distinct parts:
      1. **User Code Context**: This is the starting code given to the candidate in their IDE. It MUST be valid, compilable/interpretable code in the requested language. It should include:
         - Necessary imports (e.g., \`import java.util.*;\` or \`from typing import List\`).
         - A clear problem description inside a multi-line comment block at the top.
         - The function signature/class structure they need to implement.
         - A \`pass\` or \`return null\` placeholder so the code is syntactically valid immediately.
      
      2. **Interviewer Guide**: A secret cheat sheet for the AI interviewer agent. It must include:
         - A concise summary of the problem.
         - Some example approaches..
         - Common pitfalls or bugs candidates make.
         - Specific hints to nudge the candidate if they get stuck.
         - Edge cases to watch out for.
      
      Keep the problem difficulty to "Medium" - something solvable in 20-30 minutes while explaining thoughts.
      
      IMPORTANT: Do NOT wrap the "User Code Context" in markdown code blocks (e.g. \`\`\`python ... \`\`\`). Return ONLY the raw code.
  `,
  model: "openai/gpt-4o", // Updated to a valid model identifier (check your provider's slug)
});

export async function POST(req: Request) {
  try {
    if (LIVEKIT_URL === undefined) {
      throw new Error('LIVEKIT_URL is not defined');
    }
    if (API_KEY === undefined) {
      throw new Error('LIVEKIT_API_KEY is not defined');
    }
    if (API_SECRET === undefined) {
      throw new Error('LIVEKIT_API_SECRET is not defined');
    }

    // Parse agent configuration from request body
    const body = await req.json();
    const agentName: string = body?.room_config?.agents?.[0]?.agent_name || "interviewer-agent";

    // Extract user preferences with fallbacks
    // In a real app, you would pass these from the client in the request body
    const programming_language = body?.programming_language || 'python';
    const company_name = body?.company_name || 'Generic Tech Company';

    // Generate participant token
    const participantName = 'user';
    const participantIdentity = `voice_assistant_user_${Math.floor(Math.random() * 10_000)}`;
    const roomName = `voice_assistant_room_${Math.floor(Math.random() * 10_000)}`;

    const prompt = `Generate a coding interview question for a software engineer position at ${company_name}. 
    The programming language MUST be ${programming_language}. 
    Ensure the coding style matches ${company_name}'s typical interview flavor (e.g., functional vs OOP, algorithmic depth).`;

    // Call the Mastra Agent
    const result = await questionGenerationAgent.generate(prompt, {
      structuredOutput: {
        schema: z.object({
          text_based_problem_description_given_to_user: z.string().describe("The starting code and comments presented to the user. Must be valid syntax."),
          interviewer_problem_reference_guide: z.string().describe("The hidden guide for the AI interviewer agent containing solution, hints, and complexities."),
        }),
      },
    });

    // Handle the result safely
    const generatedContent = result.object;

    if (generatedContent?.text_based_problem_description_given_to_user) {
      // Strip markdown code fences if present
      generatedContent.text_based_problem_description_given_to_user = generatedContent.text_based_problem_description_given_to_user
        .replace(/^```[\w]*\n/, '')
        .replace(/\n```$/, '');
    }

    if (!generatedContent) {
      throw new Error("Failed to generate interview question");
    }

    const { text_based_problem_description_given_to_user, interviewer_problem_reference_guide } = generatedContent;

    // Pack into metadata for the LiveKit agent to read
    const metadata = JSON.stringify({
      programming_language,
      text_based_problem_description_given_to_user,
      interviewer_problem_reference_guide,
    });

    const participantToken = await createParticipantToken(
      { identity: participantIdentity, name: participantName, metadata },
      roomName,
      agentName
    );

    // Return connection details
    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantToken: participantToken,
      participantName,
      initialCode: text_based_problem_description_given_to_user,
    };

    const headers = new Headers({
      'Cache-Control': 'no-store',
    });

    return NextResponse.json(data, { headers });
  } catch (error) {
    if (error instanceof Error) {
      console.error(error);
      return new NextResponse(error.message, { status: 500 });
    }
    return new NextResponse("Unknown error", { status: 500 });
  }
}

function createParticipantToken(
  userInfo: AccessTokenOptions,
  roomName: string,
  agentName?: string
): Promise<string> {
  const at = new AccessToken(API_KEY, API_SECRET, {
    ...userInfo,
    ttl: '15m',
  });
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  at.addGrant(grant);

  if (agentName) {
    at.roomConfig = new RoomConfiguration({
      agents: [{ agentName, metadata: userInfo.metadata }],
    });
  }

  return at.toJwt();
}