import { Agent } from "@mastra/core/agent";
import { google } from "@ai-sdk/google";
import { z } from "zod";

import { SHARED_CONFIG } from '@/lib/shared_config';

const { TIME_LIMIT_HARD_CUTOFF_SECONDS } = SHARED_CONFIG;

// --- AGENT 1: THE HIRING MANAGER (Gemini 3 Pro) ---
// Role: Research the company, define the problem, and write the guide.
export const questionGeneratorAgent = new Agent({
    id: "question-generator-agent",
    name: "Question Generator",
    model: google("gemini-3-flash-preview"),

    instructions: `
    You are an expert Technical Interview Designer at a FAANG-level company (Google, Meta, Netflix, etc.).
    
    **YOUR GOAL:**
    Design a ${Math.floor(TIME_LIMIT_HARD_CUTOFF_SECONDS / 60)}-minute coding interview problem tailored to a specific company's domain.
    You must output a **comprehensive Interviewer Reference Guide** that an AI interviewer will use to conduct the session.

    **REQUIRED SECTIONS IN THE GUIDE:**
    1. **Problem Context:** Why is this problem relevant to [Company Name]? (e.g. "At Uber, efficient graph traversal is key for routing...").
    2. **Problem Statement:** A clear, concise definition of the algorithmic challenge.
    3. **Solution Walkthrough:** 
       - The "Naive" Approach (Brute Force).
       - The "Optimal" Approach (Target complexity).
    4. **Evaluation Criteria:**
       - **Strong Signals:** What does a "Hire" candidate do? (e.g. "Uses Hash Map for O(1) lookups").
       - **Red Flags:** What indicates a "No Hire"? (e.g. "Fails to handle edge case X").
    5. **Hints:** Progressive hints to give if the candidate is stuck.
    
    The problem should be challenging enough to reveal signal but solvable in ${Math.floor(TIME_LIMIT_HARD_CUTOFF_SECONDS / 60)} minutes.
  `,
});

// --- AGENT 2: THE PLATFORM ENGINEER (Gemini 3 Flash Preview) ---
// Role: Take the specs and write the starter code.
export const startingCodeAgent = new Agent({
    id: "starting-code-agent",
    name: "Starting Code",
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
    const question_generation_result = await questionGeneratorAgent.generate(
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
                    interviewer_problem_reference_guide: z.string().describe("A comprehensive guide for the interviewer including context, solution walkthrough, pitfalls, and evaluation criteria."),
                }),
            },
        }
    );

    const interviewer_problem_reference_guide = question_generation_result.object.interviewer_problem_reference_guide;

    const starting_code_result = await startingCodeAgent.generate(
        `
    Language: ${language}
    
    You have the Interviewer Guide (below). 
    Your job is to create the CANDIDATE FACING content based on this guide.
    
    1. Create a clear, simple problem description for the candidate.
    2. Create the starter code with necessary scaffolding (imports, class structure, TODOs).
    
    --- INTERVIEWER GUIDE ---
    ${interviewer_problem_reference_guide}
    -------------------------
    `,
        {
            structuredOutput: {
                schema: z.object({
                    text_based_problem_description_given_to_user: z.string().describe("The simple text prompt the candidate will actually see."),
                    starter_code: z.string().describe("The raw starter code string, including imports and comments."),
                }),
            },
            providerOptions: {
                google: {
                    thinkingConfig: {
                        thinkingLevel: "low",
                    }
                }
            },
        }
    );

    return {
        interviewer_problem_reference_guide: interviewer_problem_reference_guide,
        text_based_problem_description_given_to_user: `${starting_code_result.object.text_based_problem_description_given_to_user}\n\n${starting_code_result.object.starter_code}`
    };
}
