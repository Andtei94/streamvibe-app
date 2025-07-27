
'use server';
/**
 * @fileOverview An AI flow to generate metadata and a poster for a single title and add it to the library.
 * This is the master flow for adding new content and ensures no duplicates are created.
 *
 * - addContentFromTitle - A function that handles the creation process.
 */

import { z } from 'genkit';
import { ai } from '@/ai/init';
import { generateContentMetadata } from './generate-content-metadata-flow';
import { generateImage } from './generate-image-flow';
import { collection, addDoc, getDocs, query, where, FirestoreError } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Content } from '@/lib/types';
import { AddContentFromTitleInputSchema, type AddContentFromTitleInput, AddContentFromTitleOutputSchema, type AddContentFromTitleOutput } from '../schemas';
import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';
import { extractEpisodeInfo } from './utils/episode-parser';
import { sanitizeString } from '@/utils/sanitize-string';

export async function addContentFromTitle(input: AddContentFromTitleInput): Promise<AddContentFromTitleOutput> {
  return addContentFromTitleFlow(input);
}

const addContentFromTitleFlow = ai.defineFlow(
  {
    name: 'addContentFromTitleFlow',
    inputSchema: AddContentFromTitleInputSchema,
    outputSchema: AddContentFromTitleOutputSchema,
  },
  async (input) => {
    const startTime = Date.now();
    // Use a more structured requestId for better traceability
    const requestId = `add-content-${new Date().toISOString()}-${randomUUID()}`;
    const logMeta = { requestId, flow: 'addContentFromTitleFlow', inputTitle: input.title };
    let finalTitle = input.title;

    logger.info(logMeta, `[START]`);

    try {
      // Step 1: Input validation and robust sanitization.
      logger.info({ ...logMeta, step: 'Input Validation' }, 'Starting input validation and sanitization.');
      const parsedInput = AddContentFromTitleInputSchema.parse(input);
      const sanitizedTitle = sanitizeString(parsedInput.title, 500);

      if (sanitizedTitle.length > 500) {
        throw new Error("Title too long. Must be under 500 characters.");
      }
      if (sanitizedTitle.length === 0) {
        throw new Error("Title is empty after sanitization.");
      }
      
      const episodeInfo = extractEpisodeInfo(sanitizedTitle);
      const cleanTitleForAI = episodeInfo.cleanedTitle;
      logger.info({ ...logMeta, step: 'Input Validation', sanitizedTitle, cleanTitleForAI }, 'Input validation and sanitization complete.');

      // Step 2: Generate metadata to get the AI-cleaned title and release year.
      logger.info({ ...logMeta, step: 'Metadata Generation', cleanTitleForAI }, 'Generating content metadata...');
      const metadataResult = await generateContentMetadata({ title: cleanTitleForAI });
      if (!metadataResult || !metadataResult.title || !metadataResult.releaseDate) {
        throw new Error('AI failed to generate valid metadata including title and release date.');
      }
      finalTitle = metadataResult.title;
      const releaseYear = new Date(metadataResult.releaseDate).getFullYear();
      logger.info({ ...logMeta, step: 'Metadata Generation', finalTitle, releaseYear }, 'Metadata generated successfully.');


      // Step 3: Efficiently check for duplicates using the AI-generated title and release year.
      logger.info({ ...logMeta, step: 'Duplicate Check', finalTitle, releaseYear }, 'Checking for duplicate content...');
      const contentCollectionRef = collection(db, 'content');
      const q = query(
          contentCollectionRef, 
          where('title_lowercase', '==', finalTitle.toLowerCase()),
      );
      const duplicateSnapshot = await getDocs(q);

      // A duplicate exists if any document with the same lowercase title also has the same release year.
      const aDuplicateExists = duplicateSnapshot.docs.some(doc => {
          const data = doc.data();
          // Ensure releaseDate exists and is valid before comparing
          if (data.releaseDate && typeof data.releaseDate === 'string') {
              try {
                  return new Date(data.releaseDate).getFullYear() === releaseYear;
              } catch (e) {
                  return false; // Treat invalid date as not a match
              }
          }
          return false;
      });

      if (aDuplicateExists) {
        const existingDoc = duplicateSnapshot.docs.find(doc => new Date(doc.data().releaseDate).getFullYear() === releaseYear);
        logger.warn({ ...logMeta, step: 'Duplicate Check', finalTitle, duplicateId: existingDoc?.id }, 'Duplicate content found.');
        return { success: false, error: `Content with title '${finalTitle}' from ${releaseYear} already exists.`, finalTitle: finalTitle };
      }
      logger.info({ ...logMeta, step: 'Duplicate Check' }, 'Duplicate check complete.');

      // Step 4: Generate poster image with a more flexible and contextual prompt.
      logger.info({ ...logMeta, step: 'Image Generation', finalTitle }, 'Generating poster image...');
      // Use template literals for better readability.
      const imagePrompt = `A captivating poster for "${metadataResult.title}", style: ${parsedInput.image_prompt_style || 'cinematic'}. AI hint: ${metadataResult.aiHint}. Genre: ${metadataResult.genres.join(', ')}.`;
      
      let imageResult;
      try {
        imageResult = await generateImage({ prompt: imagePrompt, fileName: finalTitle, actors: metadataResult.actors, releaseDate: metadataResult.releaseDate });
      } catch (error: any) {
        logger.error({ ...logMeta, step: 'Image Generation', errorName: error.name, errorMessage: error.message }, 'Image generation failed');
        // Re-throw the original error to preserve the stack trace and original message.
        throw error;
      }

      if (!imageResult || !imageResult.imageUrl) {
        throw new Error(`Image generation process succeeded but returned an invalid result. Response: ${imageResult ? JSON.stringify(imageResult) : 'empty'}`);
      }
      logger.info({ ...logMeta, step: 'Image Generation', imageUrl: imageResult.imageUrl }, 'Poster image generated.');

      // Step 5: Add content to Firestore
      logger.info({ ...logMeta, step: 'Firestore Write' }, 'Adding content to Firestore...');
      const newContent: Omit<Content, 'id'> = {
        ...metadataResult,
        ...(episodeInfo.season !== null && { seasonNumber: episodeInfo.season }),
        ...(episodeInfo.episode !== null && { episodeNumber: episodeInfo.episode }),
        imageUrl: imageResult.imageUrl,
        title_lowercase: finalTitle.toLowerCase(),
      };
      const docRef = await addDoc(contentCollectionRef, newContent);
      logger.info({ ...logMeta, step: 'Firestore Write', contentId: docRef.id }, 'Successfully added document.');

      const processingTime = Date.now() - startTime;
      logger.info({ ...logMeta, contentId: docRef.id, processingTime }, `[SUCCESS] Flow completed in ${processingTime}ms.`);
      return { success: true, contentId: docRef.id, finalTitle };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      const errorId = randomUUID();
      let errorMessage = 'An unexpected error occurred during content creation.';
      let errorDetails: Record<string, any> = {};

      if (error instanceof z.ZodError) {
        errorMessage = 'Input validation failed.';
        errorDetails = { issues: error.issues.map(issue => `'${issue.path.join('.')}': ${issue.message}`).join(', ') };
      } else if (error instanceof FirestoreError) {
        errorMessage = `Database Error: Could not access Firestore.`;
        errorDetails = { code: error.code, message: error.message };
      } else if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = { name: error.name, cause: error.cause }; // Exclude stack from client-facing logs
      }
      
      logger.error({ ...logMeta, errorId, errorMessage, errorDetails, processingTime }, `[FAIL] Error in addContentFromTitleFlow`);
      
      // Provide a more specific error message to the client.
      const clientErrorMessage = `Failed to create content for "${input.title}". Reason: ${errorMessage}`;
      return { success: false, error: clientErrorMessage, finalTitle: input.title };
    }
  }
);
