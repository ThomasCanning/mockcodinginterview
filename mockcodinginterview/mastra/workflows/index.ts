import { z } from 'zod';
import { feedbackAgent } from '../agents/feedback';
import { startingCodeAgent } from '../agents/platform-engineer';
import { questionGeneratorAgent } from '../agents/question-generator';

export async function generateInterview(company: string, language: string) {
  // STEP 1: Gemini generates the "Knowledge"
  const question_generation_result = await questionGeneratorAgent.generate(
    `Create an interview briefing for a coding round inspired by **${company}**. Make it as close to what would be asked in a real software engineering coding round at that company as possible. IMPORTANT: Do NOT mention the company name in the output. The problem context should be applicable to any major tech company.`,
    {
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingLevel: 'high',
          },
        },
      },
      structuredOutput: {
        schema: z.object({
          interviewer_problem_reference_guide: z
            .string()
            .describe(
              'A comprehensive guide for the interviewer including context, solution walkthrough, pitfalls, and evaluation criteria.'
            ),
        }),
      },
    }
  );

  const interviewer_problem_reference_guide =
    question_generation_result.object.interviewer_problem_reference_guide;

  const starting_code_result = await startingCodeAgent.generate(
    `
    Language: ${language}
    
    You have the Interviewer Guide (below). 
    Your job is to create the CANDIDATE FACING content based on this guide.
    
    1. Create a clear, simple problem description for the candidate. Do NOT mention any specific company name.
    2. Create the starter code with necessary scaffolding (imports, class structure, TODOs).
    
    --- INTERVIEWER GUIDE ---
    ${interviewer_problem_reference_guide}
    -------------------------
    `,
    {
      structuredOutput: {
        schema: z.object({
          text_based_problem_description_given_to_user: z
            .string()
            .describe('The problem description formatted as COMMENTS in the target language.'),
          starter_code: z
            .string()
            .describe('The raw starter code string, including imports and comments.'),
        }),
      },
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingLevel: 'low',
          },
        },
      },
    }
  );

  const codeOutput = starting_code_result.object;

  console.log('--- GENERATED INTERVIEWER GUIDE ---');
  console.log(interviewer_problem_reference_guide);
  console.log('-----------------------------------');

  console.log('--- GENERATED CANDIDATE DESCRIPTION ---');
  console.log(codeOutput.text_based_problem_description_given_to_user);
  console.log('---------------------------------------');

  console.log('--- GENERATED STARTER CODE ---');
  console.log(codeOutput.starter_code);
  console.log('------------------------------');

  return {
    interviewer_problem_reference_guide: interviewer_problem_reference_guide,
    text_based_problem_description_given_to_user: `${codeOutput.text_based_problem_description_given_to_user}\n\n${codeOutput.starter_code}`,
  };
}

export async function generateFeedback(transcript: any[], code: string, language: string) {
  console.log('--- GENERATING FEEDBACK ---');
  console.log(`Language: ${language}`);
  console.log(`Transcript segments: ${transcript.length}`);
  console.log(`Code size: ${code.length} characters`);
  console.log('--- CODE PREVIEW ---');
  console.log(code.slice(0, 500) + (code.length > 500 ? '...' : ''));
  console.log('--------------------');

  const result = await feedbackAgent.generate(
    `
    Evaluate the candidate's performance.
    
    Language: ${language}

    --- CODE SUBMITTED BY CANDIDATE ---
    ${code}
    -----------------------------------

    --- INTERVIEW TRANSCRIPT ---
    ${JSON.stringify(transcript)}
    ----------------------------
    `,
    {
      structuredOutput: {
        schema: z.object({
          technical_score: z.number().min(1).max(10),
          technical_feedback: z.string(),
          communication_score: z.number().min(1).max(10),
          communication_feedback: z.string(),
          problem_solving_score: z.number().min(1).max(10),
          problem_solving_feedback: z.string(),
          overall_summary: z.string(),
          strengths: z.array(z.string()),
          improvements: z.array(z.string()),
        }),
      },
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingLevel: 'medium',
          },
        },
      },
    }
  );

  return result.object;
}
