'use server';
/**
 * @fileOverview An AI flow to generate trivia for a piece of content.
 *
 * - generateTrivia - A function that generates trivia facts.
 */

import {ai} from '@/ai/init';
import {z} from 'genkit';
import { GenerateTriviaInputSchema, type GenerateTriviaInput, GenerateTriviaOutputSchema, type GenerateTriviaOutput } from '../schemas';
import { logger } from '@/lib/logger';

export async function generateTrivia(input: GenerateTriviaInput): Promise<GenerateTriviaOutput> {
  return generateTriviaFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTriviaPrompt',
  input: {schema: GenerateTriviaInputSchema},
  output: {schema: GenerateTriviaOutputSchema},
  model: 'googleai/gemini-1.5-flash',
  system: `You are a JSON API. Your sole purpose is to return a valid, well-formed JSON object that strictly adheres to the provided output schema. Do not include any explanatory text, markdown formatting, or any content outside of the JSON structure.`,
  prompt: `You are a film and television expert. Generate exactly 5 interesting, little-known trivia facts for the content provided below. Focus on behind-the-scenes stories, casting choices, or cultural impact. Avoid common knowledge.

Title: {{{title}}}
{{#if context}}
Context: {{{context}}}
{{/if}}

CRITICAL: Return a single JSON object with a root key "trivia", which is an array of exactly 5 strings. Each string must be a factual and interesting trivia point.
Example: {"trivia": ["Fact 1...", "Fact 2...", "Fact 3...", "Fact 4...", "Fact 5..."]}
`,
  config: {
    safetySettings: [
        {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_ONLY_HIGH',
        },
    ]
  }
});

const generateTriviaFlow = ai.defineFlow(
  {
    name: 'generateTriviaFlow',
    inputSchema: GenerateTriviaInputSchema,
    outputSchema: GenerateTriviaOutputSchema,
  },
  async (input) => {
    try {
      const {output} = await prompt(input);
      // Rigorous validation of the AI's output
      const validationResult = GenerateTriviaOutputSchema.safeParse(output);
      
      if (!validationResult.success) {
        logger.error({ response: output, errors: validationResult.error.format() }, "Invalid trivia response from model");
        throw new Error("The AI failed to generate trivia in the expected format (an array of 5 strings).");
      }
      
      return validationResult.data;
    } catch (error: any) {
        logger.error({ error, stack: error.stack, input }, `[TRIVIA_FLOW_ERROR] Failed to generate trivia for "${input.title}"`);
        // Re-throw a more user-friendly error
        throw new Error(`The AI failed to generate trivia. The model's response was either empty or invalid. Please try again. Original error: ${error.message}`);
    }
  }
);
