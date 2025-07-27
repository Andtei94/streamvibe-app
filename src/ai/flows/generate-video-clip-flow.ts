
'use server';
/**
 * @fileOverview An AI flow to generate a full video clip from a single text prompt using Veo.
 * It generates a video, creates metadata for it, and adds a new content entry to Firestore.
 */

import { z } from 'genkit';
import { ai } from '@/ai/init';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import { generateContentMetadata } from './generate-content-metadata-flow';
import { generateImage } from './generate-image-flow';
import type { Content } from '@/lib/types';
import { 
  GenerateVideoFromPromptInputSchema,
  GenerateVideoClipOutputSchema,
  type GenerateVideoFromPromptInput,
  type GenerateVideoClipOutput
} from '../schemas';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeString } from '@/utils/sanitize-string';
import { moderateContent } from '@/lib/contentModeration';

export const generateVideoClip = ai.defineFlow(
  {
    name: 'generateVideoClipFlow',
    inputSchema: GenerateVideoFromPromptInputSchema,
    outputSchema: GenerateVideoClipOutputSchema,
  },
  async ({ prompt }) => {
    const sanitizedPrompt = sanitizeString(prompt, 500);

    const moderationResult = await moderateContent(sanitizedPrompt);
    if (!moderationResult.isSafe) {
        throw new Error(`Inappropriate content detected: ${moderationResult.reason}`);
    }

    const logContext = { flow: 'generateVideoClipFlow', prompt: sanitizedPrompt };
    logger.info(logContext, `[+] Starting video clip generation for prompt.`);
    
    // Step 1: Generate metadata and poster image in parallel
    const [metadataResult, imageResult] = await Promise.all([
        generateContentMetadata({ title: `Video about: ${sanitizedPrompt}` }).catch(err => { throw new Error(`Metadata generation failed: ${err.message}`) }),
        generateImage({ prompt: sanitizedPrompt, fileName: `poster_${sanitizedPrompt.substring(0, 20)}` }).catch(err => { throw new Error(`Image generation failed: ${err.message}`) }),
    ]);

    if (!metadataResult?.title) throw new Error("Metadata generation failed to return a title.");
    if (!imageResult?.imageUrl) throw new Error("Image generation failed to return a valid URL.");

    logger.info({ ...logContext, title: metadataResult.title }, `[1/3] Metadata and poster generated.`);
    
    // Step 2: Generate the video
    let operation;
    try {
        const genResult = await ai.generate({
            model: 'googleai/veo-2.0-generate-001',
            prompt: sanitizedPrompt,
            config: {
              durationSeconds: 5,
              aspectRatio: '16:9',
            },
        });
        operation = genResult.operation;

        if (!operation) {
            throw new Error('Expected the model to return an operation for video generation.');
        }

        // Wait for the operation to complete
        while (!operation.done) {
            logger.info({ ...logContext, operationName: operation.name }, "Checking video generation status...");
            await new Promise((resolve) => setTimeout(resolve, 5000));
            operation = await ai.checkOperation(operation);
        }

        if (operation.error) {
            throw new Error(`Failed to generate video: ${operation.error.message}`);
        }

    } catch (e: any) {
        logger.error({ ...logContext, error: e.message, stack: e.stack }, "Video generation failed.");
        throw new Error(`Video generation process failed. This might be due to model quota or an invalid prompt. Error: ${e.message}`);
    }
    
    logger.info({ ...logContext }, `[2/3] Video clip generated successfully.`);

    // Step 3: Upload the video to Firebase Storage
    const video = operation.output?.message?.content.find((p) => !!p.media);
    if (!video || !video.media?.url) {
        throw new Error('Failed to find the generated video in the operation result.');
    }
    
    // The video URL is a data URI
    const videoDataUri = video.media.url;
    const videoFileName = `generated_video/clip_${uuidv4()}.mp4`;
    const videoRef = ref(storage, videoFileName);
    
    await uploadString(videoRef, videoDataUri, 'data_url', { contentType: 'video/mp4' });
    const videoUrl = await getDownloadURL(videoRef);

    logger.info({ ...logContext, videoUrl }, `[3/3] Video uploaded to storage.`);

    // Step 4: Create the new content entry in Firestore
    const newContent: Omit<Content, 'id'> = {
      ...metadataResult,
      title: metadataResult.title,
      videoUrl: videoUrl,
      imageUrl: imageResult.imageUrl,
      quality: 'HD',
      status: 'published',
      canPlay: true,
      canDownload: true,
      subtitles: [],
      title_lowercase: metadataResult.title.toLowerCase(),
      type: 'movie', // Treat generated clips as short movies
    };
    
    const docRef = await addDoc(collection(db, 'content'), newContent);
    logger.info({ ...logContext, contentId: docRef.id }, `[SUCCESS] Video content created successfully.`);
    
    return { success: true, contentId: docRef.id };
  }
);
