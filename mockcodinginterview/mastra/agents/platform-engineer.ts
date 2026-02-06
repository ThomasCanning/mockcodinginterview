import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';

// --- AGENT 2: THE PLATFORM ENGINEER (Gemini 3 Flash Preview) ---
// Role: Take the specs and write the starter code.
export const startingCodeAgent = new Agent({
    id: 'starting-code-agent',
    name: 'Starting Code',
    model: google('gemini-3-flash-preview'),
    instructions: `
    You are setting up the CoderPad environment for an interview.
    1. Read the "Technical Spec" provided by the Hiring Manager.
    2. Create a "Problem Description" that will be displayed in the editor.
    3. IMPORTANT: The "Problem Description" MUST be formatted as **COMMENTS** in the target language (e.g., using # for Python, // for JS) so the file is runnable.
    4. Generate the exact starter code (imports, class structure, comments).
    5. Ensure the final output is syntactically valid code.
  `,
});
