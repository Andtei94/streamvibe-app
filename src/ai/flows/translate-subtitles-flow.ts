'use server';/**
 * @fileOverview An AI flow to translate subtitle files.
 *
 * - translateSubtitles - A function that handles translating the text content of an SRT or VTT file.
 */

import {ai} from '@/ai/init';
import {z} from 'genkit';
import { TranslateSubtitlesInputSchema, type TranslateSubtitlesInput, TranslateSubtitlesOutputSchema, type TranslateSubtitlesOutput } from '../schemas';
import { logger } from '@/lib/logger';
import { parse as parseVtt } from 'subtitle';
import { sanitizeString } from '@/utils/sanitize-string';

export async function translateSubtitles(input: TranslateSubtitlesInput): Promise<TranslateSubtitlesOutput> {  return translateSubtitlesFlow(input);}

const prompt = ai.definePrompt({
  name: 'translateSubtitlesPrompt',
  input: {schema: z.object({ subtitleContent: z.string(), targetLanguage: z.string() }) },
  output: {schema: TranslateSubtitlesOutputSchema},
  model: 'googleai/gemini-1.5-flash',
  system: `You are a JSON API. Your sole purpose is to return a valid, well-formed JSON object that strictly adheres to the provided output schema. Do not include any explanatory text, markdown formatting, or any content outside of the JSON structure. If the input subtitle is malformed or the translation fails, return a JSON object with a 'success' field set to false and an 'error' field containing a descriptive error code and message. Example: {"success": false, "error": {"code": "translation_failed", "message": "Failed to translate due to invalid input format."}}`,
  prompt: (input) => `You are a professional subtitle translator and localization expert for a major streaming platform. Your task is to translate the text portions of the provided subtitle file content (SRT or VTT) into the specified target language with the highest quality and cultural accuracy.

CRITICAL INSTRUCTIONS:
1.  **Preserve Structure:** You MUST preserve the original subtitle numbering, timestamps (e.g., '00:00:20,000 --> 00:00:24,400'), and any VTT-specific metadata (like position or alignment tags). Do NOT translate them or alter their format.
2.  **Translate Dialogue Only:** Only translate the lines of dialogue.
3.  **Context and Nuance:** Translate with context in mind. Capture the original tone, nuance, and cultural references. Adapt idioms and slang appropriately for the target language, rather than translating them literally.
4.  **Do Not Translate Names:** Do not translate proper nouns, character names, or specific technical terms unless it's a standard practice in the target language.
5.  **Return Full Content:** You must return the entire, complete, translated subtitle content.
6.  **Error Handling:** If the input subtitle file is malformed or cannot be translated, return a JSON object with 'success' set to false and an 'error' object.

Target Language: ${input.targetLanguage}

Subtitle Content to Translate:
---
${input.subtitleContent}
---

Return the complete, translated subtitle content in the required structured format.`,
  config: {
    safetySettings: [
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ]
  }
});

const translateSubtitlesFlow = ai.defineFlow(
  {
    name: 'translateSubtitlesFlow',
    inputSchema: TranslateSubtitlesInputSchema,
    outputSchema: TranslateSubtitlesOutputSchema,
  },
  async ({ subtitleContent, targetLanguage }) => {
    const startTime = Date.now();
    logger.info({ targetLanguage }, "Starting subtitle translation flow.");
    if (!subtitleContent || subtitleContent.trim().length === 0) {
      throw new Error('Subtitle content cannot be empty.');
    }

    try {
        const sanitizedContent = subtitleContent;
        
        try {
            parseVtt(sanitizedContent);
        } catch (e) {
            throw new Error("Invalid subtitle format. Content does not seem to be a valid SRT or VTT file.");
        }
        
        const { output } = await prompt({ subtitleContent: sanitizedContent, targetLanguage });

        if (!output) {
          throw new Error("AI model returned an empty response.");
        }

        const validationResult = TranslateSubtitlesOutputSchema.safeParse(output);
        if (!validationResult.success) {
            logger.error({ errors: validationResult.error.issues, response: output }, 'AI response failed Zod validation.');
            throw new Error(`AI response did not match the expected format: ${validationResult.error.message}`);
        }
        
        if (!validationResult.data.success) {
            const error = validationResult.data.error || { code: 'unknown_ai_error', message: 'Unknown AI error'};
            throw new Error(`AI reported a translation failure: ${error.message} (Code: ${error.code})`);
        }
        
        logger.info({ targetLanguage, processingTime: Date.now() - startTime }, "Subtitle translation successful.");
        return validationResult.data;
    } catch (error: any) {
        logger.error({ error, stack: error.stack, targetLanguage }, 'Error in translateSubtitlesFlow');
        throw new Error(`Subtitle translation failed: ${error.message}`);
    }
  }
);
