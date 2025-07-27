'use server';
/**
 * @fileOverview An AI flow to synchronize subtitle timings.
 *
 * - synchronizeSubtitles - A function that analyzes subtitle content and corrects timing issues.
 */

import {ai} from '@/ai/init';
import {z} from 'genkit';
import { SynchronizeSubtitlesInputSchema, type SynchronizeSubtitlesInput, SynchronizeSubtitlesOutputSchema, type SynchronizeSubtitlesOutput } from '../schemas';
import { logger } from '@/lib/logger';
import { parse as parseVtt } from 'subtitle';

export async function synchronizeSubtitles(input: SynchronizeSubtitlesInput): Promise<SynchronizeSubtitlesOutput> {
  return synchronizeSubtitlesFlow(input);
} 

const prompt = ai.definePrompt({
  name: 'synchronizeSubtitlesPrompt',
  input: {schema: z.object({ subtitleContent: z.string(), subtitleFormat: z.enum(['srt', 'vtt']) }) },
  output: {schema: SynchronizeSubtitlesOutputSchema },
  model: 'googleai/gemini-1.5-flash',
  prompt: `You are an expert A/V post-production engineer specializing in subtitle synchronization for streaming services. Your task is to meticulously analyze the provided subtitle file content and correct any and all timing issues with surgical precision.

File Format: {{{subtitleFormat}}}
Subtitle Content to Synchronize:
---
{{{subtitleContent}}}
---

CRITICAL INSTRUCTIONS:
1.  **Preserve Structure:** You MUST preserve the original subtitle numbering (if SRT) and the exact dialogue text. Do NOT alter VTT metadata like alignment unless it causes an error.
2.  **Only Adjust Timestamps:** ONLY modify the HH:MM:SS,ms (SRT) or HH:MM:SS.ms (VTT) timestamps. Do not change the format.
3.  **Fix Common Issues:**
    *   **Consistent Offset:** Determine if the entire track is early or late and apply a consistent time shift.
    *   **Progressive Drift:** Analyze if subtitles gradually desynchronize and apply a progressive correction factor. This is often due to framerate mismatches (e.g., 23.976 vs. 25 fps).
    *   **Overlapping Cues:** Ensure there are no overlapping timestamps. There must be a small gap (at least 1ms) between one cue's end and the next cue's start.
    *   **Invalid Durations:** Correct cues that are too short (less than 0.5s) or too long (over 10s) for their text content.
4.  **Handle Malformed Cues:**
    *   If a cue has missing or invalid timestamps (e.g., 'aa:bb:cc,ddd'), attempt to infer the correct timing from surrounding cues.
    *   If a cue is unrecoverable, remove the entire block (number, timestamp, and text).
5.  **Return Full Content:** Return the ENTIRE, complete, corrected subtitle content in the required structured JSON format with the key "synchronizedSrtContent".

Example of a fix for overlapping cues:
Original:
1
00:00:05,000 --> 00:00:08,000
Text one.
2
00:00:07,500 --> 00:00:10,000
Text two.

Corrected:
1
00:00:05,000 --> 00:00:07,499
Text one.
2
00:00:07,500 --> 00:00:10,000
Text two.
`,
});

const synchronizeSubtitlesFlow = ai.defineFlow(
  {
    name: 'synchronizeSubtitlesFlow',
    inputSchema: SynchronizeSubtitlesInputSchema,
    outputSchema: SynchronizeSubtitlesOutputSchema,
  },
  async ({ subtitleContent, subtitleFormat }) => {
    const minLength = 10; // A reasonable minimum length for a subtitle file
    if (!subtitleContent || subtitleContent.trim().length < minLength) {
      throw new Error(`Subtitle content is too short to be valid. Minimum length is ${minLength} characters.`);
    }
    
    try {
      // Preliminary validation with the parser
      parseVtt(subtitleContent);
    } catch (parseError: any) {
        logger.error({ error: parseError, inputLength: subtitleContent.length }, "Invalid subtitle format before sending to AI.");
        throw new Error(`Invalid subtitle format: ${parseError.message}`);
    }
    
    try {
      const { output } = await prompt({ subtitleContent, subtitleFormat });
      
      if (!output?.synchronizedSrtContent) {
        throw new Error("The AI failed to return any synchronized content.");
      }

      // Final validation to ensure the AI's output is usable
      try {
          const parsedVtt = parseVtt(output.synchronizedSrtContent);
          if (parsedVtt.length === 0) {
            throw new Error('AI returned an empty or unparsable subtitle file.');
          }
          if (parsedVtt.some((cue, i) => i > 0 && cue.start < parsedVtt[i-1].end)) {
            throw new Error("AI failed to fix overlapping subtitles. Manual correction may be needed.");
          }
      } catch (parseError: any) {
        logger.error({ error: parseError, response: output.synchronizedSrtContent }, "Failed to parse AI-generated subtitles");
        throw new Error(`The AI returned malformed subtitle data: ${parseError.message}`, {cause: parseError});
      }
      
      return { synchronizedSrtContent: output.synchronizedSrtContent };

    } catch (error: any) {
       const errorMessage = `Subtitle synchronization failed.`;
       const logContext = {
         error,
         stack: error.stack,
         inputLength: subtitleContent.length,
         subtitleFormat,
         cause: error.cause,
       };
       logger.error(logContext, errorMessage);
       // Re-throw the original error to preserve the stack trace and original message
       throw error;
    }
  }
);
