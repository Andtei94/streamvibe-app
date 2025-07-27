
'use server';
/**
 * @fileOverview An AI flow to perform a focused, in-depth analysis of a single code file.
 *
 * - analyzeFile - A function that sends file content to an AI for deep analysis.
 */
import { ai } from '@/ai/init';
import { z } from 'zod';
import {
  AnalyzeFileInputSchema,
  type AnalyzeFileInput,
  AnalyzeFileOutputSchema,
  type AnalyzeFileOutput,
} from '../schemas';

// Define the prompt for the AI model
const analysisPrompt = ai.definePrompt({
    name: 'focusedFileAnalysisPrompt',
    input: { schema: AnalyzeFileInputSchema },
    output: { schema: AnalyzeFileOutputSchema },
    model: 'googleai/gemini-1.5-flash',
    prompt: `You are an expert code reviewer and senior software engineer. Your task is to perform a deep analysis of the provided code file.

File Path: {{{filePath}}}

Your analysis should identify the following:
- **Bugs & Logic Errors:** Look for potential bugs, logical inconsistencies, and unhandled edge cases.
- **Performance Bottlenecks:** Identify inefficient code, memory leaks, or areas that could be optimized for speed.
- **Security Vulnerabilities:** Check for common security risks (e.g., XSS, lack of validation).
- **Best Practices & Readability:** Suggest improvements for code structure, naming conventions, and adherence to modern best practices.

For each issue you find, provide the line number, a clear description, a concrete suggestion for fixing it, and a severity rating ('Low', 'Medium', 'High', 'Critical').

If the file is clean and follows best practices, return an empty "issues" array and a positive overall summary.

File Content to Analyze:
\`\`\`
{{{fileContent}}}
\`\`\`

Return your full analysis in the required structured JSON format.`,
});


export async function analyzeFile(input: AnalyzeFileInput): Promise<AnalyzeFileOutput> {
    const validatedInput = AnalyzeFileInputSchema.parse(input);
    const { output } = await analysisPrompt(validatedInput);
    if (!output) {
      throw new Error("The AI failed to return an analysis. The model's response was empty.");
    }
    return output;
}
