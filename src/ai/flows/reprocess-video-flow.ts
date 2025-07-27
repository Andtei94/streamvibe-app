
'use server';/**
 * @fileOverview An AI flow to manually reprocess a video file from storage or a URL.
 * This flow generates metadata, a poster image, and creates a new content entry in Firestore.
 */import { z } from 'genkit';
import { ai } from '@/ai/init';
import { collection, addDoc, query, where, getDocs, limit, FirestoreError } from 'firebase/firestore';
import { ref, getDownloadURL, StorageError } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { generateContentMetadata } from './generate-content-metadata-flow';
import { generateImage } from './generate-image-flow';
import type { Content } from '@/lib/types';
import { DEFAULT_POSTER_URL } from '@/lib/constants';
import { ReprocessVideoInputSchema, type ReprocessVideoInput, ReprocessVideoOutputSchema, type ReprocessVideoOutput } from '../schemas';
import { logger } from '@/lib/logger';
import { extractEpisodeInfo } from './utils/episode-parser';

class ReprocessError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message);
    this.name = 'ReprocessError';
  }
}

export async function reprocessVideo(input: ReprocessVideoInput): Promise<ReprocessVideoOutput> {
  return reprocessVideoFlow(input);
}

const reprocessVideoFlow = ai.defineFlow(
  {
    name: 'reprocessVideoFlow',
    inputSchema: ReprocessVideoInputSchema,
    outputSchema: ReprocessVideoOutputSchema,
  },
  async (rawInput) => {
    logger.info({ input: rawInput }, 'Reprocessing video flow started.');
    const { storagePath, fileName, videoUrl: directVideoUrl, isPlayable, isDownloadable } = ReprocessVideoInputSchema.parse(rawInput);
    
    let videoSourceUrl = directVideoUrl;
    if (storagePath) {
        try {
            const downloadUrl = await getDownloadURL(ref(storage, storagePath));
            if(!downloadUrl) throw new Error("getDownloadURL returned empty.");
            videoSourceUrl = downloadUrl;
        } catch (error) {
            if (error instanceof StorageError && error.code === 'storage/object-not-found') {
                throw new ReprocessError(`File not found in storage at path: ${storagePath}`, 'file_not_found');
            }
            logger.error({ error, storagePath }, 'Failed to get download URL from storage.');
            throw new ReprocessError('Could not resolve video URL from storage path.', 'url_error', {cause: error});
        }
    }

    if (!videoSourceUrl || typeof videoSourceUrl !== 'string') {
      throw new ReprocessError('A valid videoUrl or storagePath must be provided.', 'validation_error');
    }

    const episodeInfo = extractEpisodeInfo(fileName);
    const cleanTitleForAI = episodeInfo.cleanedTitle;
    logger.info({ episodeInfo, cleanTitleForAI }, 'Episode info extracted.');
    
    const aiResult = await generateContentMetadata({ title: cleanTitleForAI });
    if (!aiResult) {
        throw new ReprocessError('AI failed to generate any content metadata.', 'ai_error');
    }
    logger.info({ aiResult }, 'AI metadata generated successfully.');

    const contentCollectionRef = collection(db, 'content');
    const titleQuery = query(contentCollectionRef, where('title_lowercase', '==', aiResult.title.toLowerCase()));
    const duplicateSnapshot = await getDocs(titleQuery);

    if (!duplicateSnapshot.empty) {
      const existingDoc = duplicateSnapshot.docs[0];
      throw new ReprocessError(`Content with a similar title already exists: "${existingDoc.data().title}"`, 'duplicate_content');
    }
    logger.info({ title: aiResult.title }, 'Duplicate check completed.');

    let finalImageUrl = DEFAULT_POSTER_URL;
    try {
      const imageResult = await generateImage({
          prompt: aiResult.aiHint || `A poster for ${aiResult.title}`,
          fileName: aiResult.title,
          actors: aiResult.actors,
          releaseDate: aiResult.releaseDate
      });
      if (imageResult?.imageUrl) {
        finalImageUrl = imageResult.imageUrl;
      } else {
        throw new ReprocessError("Image generation succeeded but returned no URL.", 'image_generation_error');
      }
    } catch (error: any) {
        logger.error({ error, stack: error.stack, title: aiResult.title }, `Image generation failed; using default poster. Reason: ${error.message}`);
    }
    logger.info({ finalImageUrl }, 'Image generation completed or skipped.');
    
    const finalContent: Omit<Content, 'id'> = {
        ...aiResult,
        ...(episodeInfo.season !== null && { seasonNumber: episodeInfo.season }),
        ...(episodeInfo.episode !== null && { episodeNumber: episodeInfo.episode }),
        videoUrl: videoSourceUrl,
        imageUrl: finalImageUrl,
        ...(storagePath && { sourceStoragePath: storagePath }),
        canPlay: isPlayable,
        canDownload: isDownloadable,
        featured: aiResult.featured || false,
        subtitles: [],
        status: 'published',
        title_lowercase: aiResult.title.toLowerCase(),
    };
    
    try {
        const docRef = await addDoc(contentCollectionRef, finalContent);
        logger.info({ contentId: docRef.id }, 'Document added to Firestore successfully.');
        return { success: true, contentId: docRef.id, title: aiResult.title };
    } catch (error: any) {
        logger.error({ error }, "Firestore write operation failed.");
        if (error instanceof FirestoreError) {
             throw new ReprocessError(`Failed to save to database: ${error.message}`, `firestore_${error.code}`, { cause: error });
        }
        throw new ReprocessError("Failed to save the new content to the database.", "firestore_error", {cause: error});
    }
  }
);
