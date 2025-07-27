'use server';/**
 * @fileOverview An AI flow to generate a full "cinematic scene" audio show from a single text prompt.
 * It writes a script, generates narration audio, generates a sequence of images (scenes),
 * and creates a new content entry in Firestore.
 */

import { z } from 'genkit';
import { ai } from '@/ai/init';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import { generateContentMetadata } from './generate-content-metadata-flow';
import { textToSpeech } from './text-to-speech-flow';
import { generateImage } from './generate-image-flow';
import type { Content, Scene } from '@/lib/types';
import { GenerateVideoFromPromptInputSchema, GenerateVideoFromPromptOutputSchema, type GenerateVideoFromPromptInput, type GenerateVideoFromPromptOutput } from '../schemas';
import { v4 as uuidv4 } from 'uuid';
import { moderateContent } from '@/lib/contentModeration';
import { sanitizeString } from '@/utils/sanitize-string';


const StoryboardSchema = z.object({
  scenes: z.array(z.object({
    narration: z.string().describe("A short line of narration for this specific scene (1-2 sentences)."),
    imagePrompt: z.string().describe("A detailed, cinematic image generation prompt for this scene."),
  })).min(3).max(8).describe("A storyboard of 3 to 8 scenes, each with narration and an image prompt."),
});

const storyboardGenerationPrompt = ai.definePrompt({
  name: 'storyboardGenerationPrompt',
  input: { schema: z.object({ prompt: z.string().max(500) }) },
  output: { schema: StoryboardSchema },
  model: 'googleai/gemini-1.5-flash',
  prompt: `You are a film director creating a storyboard for a short, cinematic scene based on a prompt. Create a sequence of 3 to 8 scenes. For each scene, provide a short piece of narration and a detailed, vivid image prompt suitable for an AI image generator. The final output should feel like a cohesive, visually stunning short story.

Prompt: {{{prompt}}}

Return the full storyboard in the required structured JSON format.`,
});

export const generateVideoFromPrompt = ai.defineFlow(
  {
    name: 'generateStoryFromPromptFlow',
    inputSchema: GenerateVideoFromPromptInputSchema,
    outputSchema: GenerateVideoFromPromptOutputSchema,
  },
  async ({ prompt }) => {
    const flowId = uuidv4();
    const startTime = new Date();
    
    const sanitizedPrompt = sanitizeString(prompt, 500);
    
    const moderationResult = await moderateContent(sanitizedPrompt);
    if (!moderationResult.isSafe) {
      throw new Error(`Inappropriate content detected: ${moderationResult.reason}`);
    }
    
    const logContext = { flowId, prompt: sanitizedPrompt, startTime: startTime.toISOString() };
    logger.info(logContext, `[+] Starting cinematic scene generation.`);
    
    const generatedAssetPaths: string[] = [];

    try {
        const metadata = await generateContentMetadata({ title: sanitizedPrompt }).catch(err => { throw new Error(`Metadata generation failed: ${err.message}`) });
        logger.info({ ...logContext, title: metadata.title, step: 'Metadata Generation' }, `[1/4] Metadata generated successfully.`);

        const storyboardOutput = await storyboardGenerationPrompt({ prompt: sanitizedPrompt }).catch(err => { throw new Error(`Storyboard generation failed: ${err.message}`) });
        const storyboard = storyboardOutput.output;
        if (!metadata?.title) throw new Error("Metadata generation failed to return a title.");
        if (!storyboard?.scenes || storyboard.scenes.length === 0) throw new Error("Storyboard generation failed to produce scenes.");
        logger.info({ ...logContext, sceneCount: storyboard.scenes.length, step: 'Storyboard Generation' }, `[2/4] Storyboard generated successfully.`);

        const fullNarration = storyboard.scenes.map(s => s.narration).join('\n\n');
        const audioDataUri = await textToSpeech({ text: fullNarration }).catch(err => { throw new Error(`Audio generation failed: ${err.message}`) });
        if (!audioDataUri) throw new Error("Audio generation returned empty data.");
        logger.info({ ...logContext, audioDataUriLength: audioDataUri.length, step: 'Audio Generation' }, `[3/4] Full narration audio generated.`);

        const imageGenerationPromises = storyboard.scenes.map((scene, index) => 
            generateImage({ prompt: scene.imagePrompt, fileName: `${metadata.title}_scene_${index + 1}` })
            .catch(error => {
                logger.error({ ...logContext, error, sceneIndex: index, step: 'Image Generation' }, `Error generating image for scene ${index + 1}`);
                throw new Error(`Failed to generate image for scene ${index + 1}: ${error.message}`);
            })
        );
        const imageResults = await Promise.all(imageGenerationPromises);
        
        const scenes: Scene[] = imageResults.map((result, index) => ({
            imageUrl: result.imageUrl,
            text: storyboard.scenes[index].narration,
            duration: 5,
        }));
        logger.info({ ...logContext, sceneCount: scenes.length, step: 'Image Generation' }, `[4/4] All scene images generated successfully.`);
      
        const audioFileName = `generated_audio/scene_${uuidv4()}.wav`;
        const audioRef = ref(storage, audioFileName);
        generatedAssetPaths.push(audioFileName);
        await uploadString(audioRef, audioDataUri, 'data_url', {contentType: 'audio/wav'});
        const audioUrl = await getDownloadURL(audioRef);
        logger.info({ ...logContext, audioUrl, step: 'Upload' }, `[5/5] Main audio uploaded to storage.`);

        const newContent: Omit<Content, 'id'> = {
            ...metadata,
            title: metadata.title,
            videoUrl: audioUrl,
            imageUrl: scenes[0]?.imageUrl || '',
            quality: 'Audio',
            scenes: scenes,
            status: 'published',
            canPlay: true,
            canDownload: false,
            subtitles: [],
            title_lowercase: metadata.title.toLowerCase(),
        };
      
        const docRef = await addDoc(collection(db, 'content'), newContent);
        logger.info({ ...logContext, contentId: docRef.id, elapsedTime: Date.now() - startTime.getTime() }, `[SUCCESS] Cinematic scene created.`);
        return { success: true, contentId: docRef.id };

    } catch (error: any) {
       logger.error({ ...logContext, error: error.message, stack: error.stack, elapsedTime: Date.now() - startTime.getTime() }, "Critical error in generateVideoFromPrompt flow.");
       
       // Cleanup partially uploaded files
        if (generatedAssetPaths.length > 0) {
            logger.info({ ...logContext, paths: generatedAssetPaths }, "Attempting cleanup of generated assets.");
            const cleanupPromises = generatedAssetPaths.map(path => deleteObject(ref(storage, path)).catch(e => logger.warn({path, error: e}, "Failed to delete asset during cleanup.")));
            await Promise.all(cleanupPromises);
        }
       
       throw new Error(`Video generation failed: ${error.message}`);
    }
  }
);
