'use server';/**
 * @fileOverview An AI flow to generate a new poster image for a piece of content and update it in Firestore.
 *
 * - updateContentImage - A function that handles the image generation and database update.
 */

import { z } from 'genkit';
import { ai } from '@/ai/init';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateImage } from './generate-image-flow';
import { UpdateContentImageInputSchema, type UpdateContentImageInput, UpdateContentImageOutputSchema, type UpdateContentImageOutput } from '../schemas';
import type { Content } from '@/lib/types';
import { sanitizeString as sanitize } from '@/utils/sanitize-string';

export const updateContentImage = ai.defineFlow(
  {
    name: 'updateContentImageFlow',
    inputSchema: UpdateContentImageInputSchema,
    outputSchema: UpdateContentImageOutputSchema,
  },
  async ({ contentId, prompt }) => {
    // Explicit input validation as a best practice.
    UpdateContentImageInputSchema.parse({ contentId, prompt });

    let imageUrl: string;

    // Step 1: Fetch the full content document to get all context for the image generator.
    const contentDocRef = doc(db, 'content', contentId);
    const contentSnap = await getDoc(contentDocRef);
    if (!contentSnap.exists()) {
        throw new Error('The content item to update could not be found in the database.');
    }
    const contentData = contentSnap.data() as Content;

    // Step 2: Generate the new image, with specific error handling and full context.
    try {
      // Sanitize prompt using a more robust method.
      const sanitizedPrompt = sanitize(prompt, 500);

      const imageResult = await generateImage({
        prompt: sanitizedPrompt,
        fileName: `poster_${contentId}`,
        actors: contentData.actors,
        releaseDate: contentData.releaseDate
      });
      // This check is critical. If generateImage fails and returns nothing, we throw an error.
      if (!imageResult || !imageResult.imageUrl) {
        throw new Error('Image generation process did not return a valid URL.');
      }
      imageUrl = imageResult.imageUrl;
    } catch (error: any) {
      console.error(`[IMAGE_UPDATE_FLOW] Image generation failed for contentId "${contentId}":`, error);
      // Re-throw the error with more context so the client can display it.
      throw new Error(`Image generation failed: ${error.message}`);
    }

    // Step 3: Update the imageUrl field in the specified Firestore document, with specific error handling.
    try {
      await updateDoc(contentDocRef, {
        imageUrl: imageUrl,
      });
    } catch (error: any) {
      console.error(`[IMAGE_UPDATE_FLOW] Firestore update failed for contentId "${contentId}":`, error);
      let message = 'Could not save the new image to the database.';
      if (error.code === 'permission-denied') {
        message = 'Permission denied when trying to update the content in the database.';
      } else if (error.code === 'not-found') {
        message = 'The content item to update could not be found in the database.';
      }
      throw new Error(message);
    }
    
    // Step 4: Return a success response.
    return {
      success: true,
      imageUrl: imageUrl,
    };
  }
);
