'use server';/**
 * @fileOverview An AI flow to trigger a video transcription job.
 * This version uses the Gemini 1.5 Flash model and handles media sources
 * via a robust GCS URI, ensuring scalability and reliability.
 */import { logger } from '@/lib/logger';
import { TriggerTranscodingInputSchema, TriggerTranscodingOutputSchema } from '../schemas';
import { ai } from '@/ai/init';
import { z as zod } from 'genkit';

const transcriptionPrompt = ai.definePrompt({
    name: 'transcriptionPrompt',
    input: { schema: zod.object({ media: zod.object({ url: zod.string().url(), contentType: zod.string() }), languageCode: zod.string() }) },
    output: { schema: TriggerTranscodingOutputSchema },
    model: 'googleai/gemini-1.5-flash',
    prompt: `You are an expert A/V post-production engineer specializing in transcription and subtitle generation.
Your task is to analyze the provided media source and generate a complete and accurate subtitle file in WebVTT format.

Media Source: {{media url=media.url contentType=media.contentType}}

Language: {{{languageCode}}}

Instructions:
1.  Listen to the audio from the media source carefully.
2.  Transcribe the spoken content accurately.
3.  Include timestamps in the correct HH:MM:SS.ms format.
4.  Ensure the output is a valid WebVTT file format, starting with "WEBVTT".
5.  If you cannot process the media or it contains no discernible speech, you MUST return a valid JSON object with the 'subtitleContent' field containing only the string "WEBVTT".

Return the result in the required structured JSON format.`,
});

export const triggerTranscoding = ai.defineFlow(
  {
    name: 'triggerTranscodingFlow',
    inputSchema: TriggerTranscodingInputSchema,
    outputSchema: TriggerTranscodingOutputSchema,
  },
  async ({ storagePath, contentType, languageCode }): Promise<zod.infer<typeof TriggerTranscodingOutputSchema>> => {
    
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
        throw new Error('Firebase Storage Bucket name is not configured in environment variables.');
    }
    
    const gcsUri = `gs://${bucketName}/${storagePath}`;
    const logContext = { gcsUri, contentType, storagePath, languageCode };
    logger.info(logContext, `[+] Starting GCS transcription job.`);
    
    const media = { url: gcsUri, contentType };

    try {
        const { output } = await transcriptionPrompt({ media, languageCode });

        if (!output || !output.subtitleContent) {
            throw new Error("The AI model returned an empty or invalid response.");
        }
        
        if (output.subtitleContent.trim().length < 10) {
            throw new Error("Transcription resulted in empty or very short content. No recognizable speech found.");
        }
        
        const summary = `Generated VTT of length ${output.subtitleContent.length} chars.`;
        logger.info({ ...logContext, summary }, `[+] Gemini transcription complete.`);
        
        return {
          jobId: `gemini-job-${Date.now()}`,
          subtitleContent: output.subtitleContent,
        };

    } catch (e: any) {
        const errorDetails = {
            code: e.code,
            message: e.message,
            stack: e.stack,
        };
        logger.error({ ...logContext, error: errorDetails }, `Error during Gemini transcription operation.`);
        
        let errorMessage = "An unknown error occurred during transcription.";
        if (e.code && typeof e.code === 'string') {
            switch(true) {
                case e.code.includes('INVALID_ARGUMENT'):
                   errorMessage = 'The source file may be inaccessible, unsupported, or corrupt.';
                   break;
                case e.code.includes('RESOURCE_EXHAUSTED'):
                   errorMessage = 'The AI service is currently unavailable due to high demand. Please try again later.';
                   break;
            }
        }
        if (e.message) {
             switch(true) {
                case e.message.includes("Request payload"):
                  errorMessage = "The provided media format is not supported or the file is too large or corrupt.";
                  break;
                case e.message.includes("SAFETY"):
                  errorMessage = "The media content was blocked by a safety filter.";
                  break;
                case e.message.includes('is inaccessible') || e.message.includes('404'):
                  errorMessage = 'The AI model could not access the source file. Please ensure it exists and permissions are correct.';
                  break;
             }
        }
        throw new Error(errorMessage, { cause: e });
    }
  }
);
