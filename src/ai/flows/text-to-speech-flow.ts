
'use server';
/**
 * @fileOverview A reusable AI flow to convert text to speech and return a data URI.
 * This version requests WAV output directly from the model, removing the need for
 * the 'wav' package. It also allows specifying the voice.
 */

import { z } from 'genkit';
import { ai } from '@/ai/init';
import { logger } from '@/lib/logger';

export const textToSpeech = ai.defineFlow(
  {
    name: 'textToSpeechFlow',
    inputSchema: z.object({
      text: z.string(),
      voiceName: z.string().optional().default('Algenib'), // Default voice, can be overridden
    }),
    outputSchema: z
      .string()
      .describe('A data URI of the generated WAV audio file.'),
  },
  async ({ text, voiceName }) => {
    logger.info(
      { voiceName },
      `Generating speech for text (length: ${text.length}).`
    );
    try {
      const { media } = await ai.generate({
        model: 'googleai/gemini-2.5-flash-preview-tts',
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
            // Explicitly request WAV output to avoid raw PCM data.
            outputAudioConfig: { audioEncoding: 'WAV' },
          },
        },
        prompt: text,
      });

      if (!media?.url) {
        throw new Error('Text-to-speech model did not return any media.');
      }
      
      // The model now returns a 'data:audio/wav;base64,...' string directly.
      // No conversion is needed.
      return media.url;

    } catch (error) {
      logger.error({ error }, 'Error in text-to-speech flow.');
      throw error;
    }
  }
);
