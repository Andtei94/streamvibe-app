'use server';/**
 * @fileOverview An AI flow to generate an image based on a text prompt.
 * 
 * - generateImage - A function that handles generating an image from a text prompt.
 */import {ai} from '@/ai/init';
import {z} from 'genkit';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { GenerateImageInputSchema, type GenerateImageInput, GenerateImageOutputSchema, type GenerateImageOutput } from '../schemas';
import { v4 as uuidv4 } from 'uuid'; // For unique filenames
import { logger } from '@/lib/logger';
import { sanitizeString } from '@/utils/sanitize-string'; // Import robust sanitization function
import { createFilename } from '@/utils/filename-creation'; //Import filename creation utility

const DEFAULT_IMAGE_MODEL = 'googleai/gemini-2.0-flash-preview-image-generation';

function sanitizeActorName(actor: string, maxLength: number = 100): string {
  if (!actor || typeof actor !== 'string') return '';
  try {
    return sanitizeString(actor, maxLength);
  } catch(e: any) {
      logger.error({ error: e, actor }, `Failed to sanitize actor name. Returning empty string.`);
      return '';
  }
}

export async function generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
  return generateImageFlowImplementation(input);
}

const buildImagePrompt = (input: GenerateImageInput): string => {
    let promptText = `Generate a high-quality, cinematic movie poster for: "${input.prompt}". The poster should be visually appealing and suitable for a streaming platform thumbnail. Do not include any text, titles, or logos on the poster.`;

    if (input.actors && Array.isArray(input.actors) && input.actors.length > 0) {
        const sanitizedActors = input.actors.map(actor => sanitizeActorName(actor, 50)).filter(Boolean);
        if (sanitizedActors.length > 0) {
            promptText += ` It stars the following actors, and the poster should reflect their likeness, especially the first one: ${sanitizedActors.join(', ')}.`;
        }
    }

    if (input.releaseDate) {
        try {
            const date = new Date(input.releaseDate);
            if (!isNaN(date.getTime())) {
                const year = date.getFullYear();
                promptText += ` The film's style should be appropriate for its release year, ${year}.`;
            }
        } catch (e) {
            // Ignore invalid date format
        }
    }

    return promptText;
}

const generateImageFlowImplementation = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async (rawInput) => {
    const input = GenerateImageInputSchema.parse(rawInput);
    
    try {
      const fullPromptText = buildImagePrompt(input);
      logger.info({ prompt: fullPromptText, input }, `[IMAGE_GEN_START]`);

      const { media } = await ai.generate({
        model: input.model || DEFAULT_IMAGE_MODEL,
        prompt: fullPromptText,
        config: { responseModalities: ['TEXT', 'IMAGE'] },
      });

      if (!media || !media.url || typeof media.url !== 'string' || media.url.trim() === '') {
        throw new Error('AI model did not return a valid media URL.');
      }
      
      let imageBuffer: Buffer, mimeType: string;
      try {
        const response = await fetch(media.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch image from AI. Status: ${response.status} ${response.statusText}.`);
        }
        const arrayBuffer = await response.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
        mimeType = response.headers.get('content-type') || 'image/png'; 
      } catch (fetchError: any) {
        throw new Error(`Failed to download generated image: ${fetchError.message}`, { cause: fetchError });
      }

      const sanitizedFileName = sanitizeString(input.fileName || 'image', 255);
      const uniqueFileName = `${createFilename(sanitizedFileName)}_${uuidv4()}.${mimeType.split('/')[1] || 'png'}`;
      const storagePath = `images/${uniqueFileName}`;
      const imageRef = ref(storage, storagePath);
      const fileSizeInBytes = imageBuffer.length;

      logger.info({ fileSizeInBytes, storagePath, mimeType }, 'Uploading image to Firebase Storage...');
      
      await uploadBytes(imageRef, imageBuffer, { contentType: mimeType });
      const downloadURL = await getDownloadURL(imageRef);
      
      logger.info({ storagePath, downloadURL, fileSizeInBytes }, 'Image uploaded successfully.');
      return { imageUrl: downloadURL };

    } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        const logContext = {
            error: errorMessage,
            stack: error.stack,
            cause: error.cause,
            userInput: input,
        };
        logger.error(logContext, 'Image generation flow failed');
      throw new Error(`Image generation failed: ${errorMessage}`, { cause: error });
    }
  }
);
