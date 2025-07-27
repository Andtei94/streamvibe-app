
'use server';
/**
 * @fileOverview An AI flow to automatically fix selected code issues in a file.
 * This flow's single responsibility is to generate the corrected code as text.
 */

import { ai } from '@/ai/init';
import { z } from 'zod';
import {
  FixCodeIssuesInputSchema,
  type FixCodeIssuesInput,
  FixCodeIssuesOutputSchema,
  type FixCodeIssuesOutput,
} from '../schemas';
import { logger } from '@/lib/logger';

// This prompt is responsible for generating the corrected code and a summary.
const fixCodePrompt = ai.definePrompt({
  name: 'fixCodeIssuesPrompt',
  input: { schema: z.object({ fileContent: z.string(), issuesToFix: z.array(z.string()) }) },
  output: { schema: FixCodeIssuesOutputSchema },
  model: 'googleai/gemini-1.5-flash',
  prompt: `You are an expert software engineer specializing in code refactoring and bug fixing for Next.js and React applications.
Your task is to rewrite the provided code file to fix a specific list of issues.

IMPORTANT:
1.  You MUST return the ENTIRE, complete, final content of the file. Do not provide partial snippets, diffs, or explanations outside of the JSON structure.
2.  Fix ONLY the issues listed below. Do not make any other changes.
3.  Preserve the original code structure and logic as much as possible, only modifying what is necessary to fix the specified issues.

File Content to fix:
\`\`\`
{{{fileContent}}}
\`\`\`

List of issues to fix:
{{#each issuesToFix}}
- {{{this}}}
{{/each}}

Please provide the full corrected code and a brief summary of the changes you made in the required structured JSON format.`,
});

// This flow is now a clean wrapper around the AI prompt.
// It no longer writes to the file system, adhering to the Single Responsibility Principle.
export const fixCodeIssues = ai.defineFlow(
  {
    name: 'fixCodeIssuesFlow',
    inputSchema: FixCodeIssuesInputSchema,
    outputSchema: FixCodeIssuesOutputSchema,
  },
  async ({ filePath, fileContent, issuesToFix }) => {
    // Basic input validation to prevent unnecessary AI calls.
    if (issuesToFix.length === 0) {
      return {
        fixedContent: fileContent,
        summaryOfChanges: 'No issues were selected to be fixed.',
      };
    }

    try {
      const { output: fixResult } = await fixCodePrompt({ fileContent, issuesToFix });

      // Rigorous validation to ensure the AI returns a valid, non-empty object.
      if (!fixResult || typeof fixResult.fixedContent !== 'string') {
        throw new Error('The AI failed to return the fixed code content in the expected format.');
      }
      
      // Return the result to the orchestrator flow (`fix-all-issues...`).
      // The orchestrator is responsible for writing the content to disk.
      return {
        fixedContent: fixResult.fixedContent,
        summaryOfChanges: fixResult.summaryOfChanges || 'AI fixed the issues but did not provide a summary.',
      };
    } catch (error: any) {
      logger.error({ error, stack: error.stack, filePath, issuesToFix }, "Error in fixCodeIssuesFlow");
      // Re-throw the original error to be handled by the calling flow.
      throw new Error(`AI failed to generate a fix for ${filePath}: ${error.message}`);
    }
  }
);
