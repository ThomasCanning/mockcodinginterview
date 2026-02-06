import { Agent } from "@mastra/core/agent";
import { google } from "@ai-sdk/google";
import { z } from "zod";

// --- AGENT 1: THE HIRING MANAGER (Gemini 3 Pro) ---
// Role: Research the company, define the problem, and write the guide.
export const briefingAgent = new Agent({
    id: "briefing-agent",
    name: "Hiring Manager",
    model: google("gemini-3-flash-preview"),

    instructions: `
    You are a Senior Bar Raiser at a top tech company.
    Your goal is to create a comprehensive **Interviewer Briefing Packet**.
    
    1. **Deep Research:** Analyze the specific engineering domain of the target company (e.g., if Uber -> Geospatial/Graph; if Stripe -> API Idempotency/ledger).
    2. **The Problem:** Design a "Medium" difficulty problem that models a real challenge at this company.
    3. **The Guide:** You must equip the interviewer with deep knowledge:
       - Why this question matters to the company.
       - The naive solution vs. the optimal solution.
       - Common bugs candidates introduce.
  `,
});

// --- AGENT 2: THE PLATFORM ENGINEER (Gemini 3 Flash Preview) ---
// Role: Take the specs and write the starter code.
export const platformAgent = new Agent({
    id: "platform-agent",
    name: "Platform Setup",
    model: google("gemini-3-flash-preview"),
    instructions: `
    You are setting up the CoderPad environment for an interview.
    1. Read the "Technical Spec" provided by the Hiring Manager.
    2. Generate the exact starter code (imports, class structure, comments).
    3. Ensure it compiles/runs in the target language.
  `,
});


// --- THE PIPELINE ---

export async function generateInterview(company: string, language: string) {

    // STEP 1: Gemini generates the "Knowledge"
    const briefingResult = await briefingAgent.generate(
        `Create an interview briefing for a coding round at **${company}**.`,
        {
            providerOptions: {
                google: {
                    thinkingConfig: {
                        thinkingLevel: "high",
                    }
                }
            },
            structuredOutput: {
                schema: z.object({
                    // This goes to the UI for the interviewer to read
                    interviewer_guide: z.object({
                        title: z.string(),
                        company_context: z.string().describe("Why this company asks this question (e.g. 'At Netflix, we care about bandwidth...')"),
                        solution_walkthrough: z.string().describe("High-level logic explanation of the optimal solution."),
                        common_pitfalls: z.array(z.string()).describe("List of mistakes candidates often make."),
                        evaluation_rubric: z.string().describe("What separates a Hire from a No-Hire."),
                    }),

                    // This goes to Agent 2 to build the code
                    technical_spec: z.object({
                        problem_description_for_candidate: z.string().describe("The text prompt the candidate will actually see."),
                        function_signature_requirement: z.string().describe("E.g. 'function findRoute(graph, start) returning List'"),
                        example_io: z.string().describe("Example inputs and outputs."),
                    }),
                }),
            },
        }
    );

    const briefing = briefingResult.object;

    // STEP 2: GPT-4o generates the "Artifact" (The Code)
    const codeResult = await platformAgent.generate(
        `
    Language: ${language}
    
    Here is the Technical Spec for the problem:
    
    Description: ${briefing.technical_spec.problem_description_for_candidate}
    Signature Requirements: ${briefing.technical_spec.function_signature_requirement}
    Examples: ${briefing.technical_spec.example_io}
    
    Generate the starter code file.
    `,
        {
            providerOptions: {
                google: {
                    thinkingConfig: {
                        thinkingLevel: "high",
                    }
                }
            },
            structuredOutput: {
                schema: z.object({
                    code: z.string().describe("The raw starter code string, including imports and comments."),
                }),
            },
        }
    );

    return {
        guide: briefing.interviewer_guide,       // Display this in the "Interviewer Panel"
        candidate_prompt: briefing.technical_spec.problem_description_for_candidate, // Display this in the "Question Tab"
        starter_code: codeResult.object.code     // Inject this into the Monaco/CodeMirror editor
    };
}
