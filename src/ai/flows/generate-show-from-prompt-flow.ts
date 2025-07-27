'use server';/**
 * @fileOverview An AI flow to generate a full audio documentary from a single text prompt.
 * It writes a script, generates audio with TTS, and creates a new content entry in Firestore.
 */

import { z } from 'genkit';
import { ai } from '@/ai/init';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import { generateContentMetadata } from './generate-content-metadata-flow';
import { textToSpeech } from './text-to-speech-flow';
import { generateImage } from './generate-image-flow';
import type { Content } from '@/lib/types';
import { 
  GenerateShowFromPromptInputSchema,
  GenerateShowFromPromptOutputSchema,
  type GenerateShowFromPromptInput,
  type GenerateShowFromPromptOutput
} from '../schemas';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeString } from '@/utils/sanitize-string';
import { moderateContent } from '@/lib/contentModeration';

const ScriptGenerationSchema = z.object({ 
  script: z.string().describe("A compelling and well-structured documentary script, approximately 300-500 words long. It should have a clear narrative arc with an introduction, body, and conclusion. The tone should be engaging and informative."),
});

const scriptGenerationPrompt = ai.definePrompt({
  name: 'scriptGenerationPrompt',
  input: { schema: z.object({ prompt: z.string().max(500) }) },
  output: { schema: ScriptGenerationSchema },
  model: 'googleai/gemini-1.5-flash',
  prompt: `You are an expert documentary scriptwriter. Based on the following prompt, write a compelling and well-structured script of about 300-500 words. The script must be engaging, informative, and have a clear narrative structure.

Prompt: 
{{{prompt}}}

Return your full script in the required structured JSON format.`,
});


export const generateShowFromPrompt = ai.defineFlow(
  {
    name: 'generateShowFromPromptFlow',
    inputSchema: GenerateShowFromPromptInputSchema,
    outputSchema: GenerateShowFromPromptOutputSchema,
  },
  async ({ prompt }) => {
    const sanitizedPrompt = sanitizeString(prompt, 500);

    const moderationResult = await moderateContent(sanitizedPrompt);
    if (!moderationResult.isSafe) {
        throw new Error(`Inappropriate content detected: ${moderationResult.reason}`);
    }

    const logContext = { flow: 'generateShowFromPrompt', prompt: sanitizedPrompt };
    logger.info(logContext, `[+] Starting audio show generation for prompt.`);
    
    try {
      const [metadataResult, scriptResult] = await Promise.all([
          generateContentMetadata({ title: sanitizedPrompt }).catch(err => { throw new Error(`Metadata generation failed: ${err.message}`) }),
          scriptGenerationPrompt({ prompt: sanitizedPrompt }).catch(err => { throw new Error(`Script generation failed: ${err.message}`) }),
      ]);
      
      const metadata = metadataResult;
      const script = scriptResult.output?.script;

      if (!metadata?.title) throw new Error("Metadata generation failed to return a title.");
      if (!script) throw new Error("Script generation failed to return a script.");
      
      logger.info({ ...logContext, title: metadata.title }, `[1/3] Metadata and script generated.`);

      const [imageResult, audioResult] = await Promise.allSettled([
          generateImage({ prompt: metadata.aiHint || metadata.title, fileName: metadata.title }),
          textToSpeech({ text: script, voiceName: 'Algenib' }),
      ]);

      if (imageResult.status === 'rejected' || !imageResult.value?.imageUrl) {
        throw new Error(`Image generation failed: ${imageResult.status === 'rejected' ? imageResult.reason.message : 'No URL returned'}`);
      }
      if (audioResult.status === 'rejected' || !audioResult.value) {
          throw new Error(`Text-to-speech conversion failed: ${audioResult.status === 'rejected' ? audioResult.reason.message : 'No data returned'}`);
      }
      
      const imageUrl = imageResult.value.imageUrl;
      const audioDataUri = audioResult.value;

      logger.info({ ...logContext, title: metadata.title }, `[2/3] Poster and narration audio generated.`);

      const audioFileName = `generated_audio/show_${uuidv4()}.wav`;
      const audioRef = ref(storage, audioFileName);
      await uploadString(audioRef, audioDataUri, 'data_url', {contentType: 'audio/wav'});
      const audioUrl = await getDownloadURL(audioRef);
      
      logger.info({ ...logContext, audioUrl }, `[3/3] Main audio uploaded to storage.`);

      const newContent: Omit<Content, 'id'> = {
        ...metadata,
        title: metadata.title,
        videoUrl: audioUrl,
        imageUrl: imageUrl,
        quality: 'Audio',
        status: 'published',
        canPlay: true,
        canDownload: true,
        subtitles: [],
        title_lowercase: metadata.title.toLowerCase(),
      };
      
      const docRef = await addDoc(collection(db, 'content'), newContent);
      logger.info({ ...logContext, contentId: docRef.id }, `[SUCCESS] Content created successfully.`);
      
      return { success: true, contentId: docRef.id };

    } catch (error: any) {
       logger.error({ ...logContext, error: error.message, stack: error.stack }, "Critical error in generateShowFromPrompt flow");
       throw new Error(`Show generation failed for prompt "${prompt.substring(0,30)}...": ${error.message}`);
    }
  }
);
