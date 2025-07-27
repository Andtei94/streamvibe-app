'use server';
/**
 * @fileOverview An AI flow to generate base content metadata from a title.
 *
 * - generateContentMetadata - A function that orchestrates metadata generation.
 */
import { z } from 'genkit';
import { ai } from '@/ai/init';
import { GenerateContentMetadataOutputSchema, type GenerateContentMetadataOutput, GenerateContentMetadataInputSchema, type GenerateContentMetadataInput } from '../schemas';

export async function generateContentMetadata(input: GenerateContentMetadataInput): Promise<GenerateContentMetadataOutput> {
  return generateContentMetadataFlow(input);
}

const metadataGenerationPrompt = ai.definePrompt({
  name: 'generateContentMetadataPrompt',
  input: { schema: GenerateContentMetadataInputSchema },
  output: { schema: GenerateContentMetadataOutputSchema },
  model: 'googleai/gemini-1.5-flash',
  prompt: `You are a media specialist for a streaming service. A new file has been uploaded. Based on its title, your task is to generate all the necessary metadata for the content library.

File Title: "{{{title}}}"

Based on this title, generate the following:
1.  A creative and professional final title (it can be the same or improved).
2.  A short and a long description.
3.  The content type (movie, tv-show, music, sports). If the content appears to be a telenovela, classify its type as 'tv-show'.
4.  For the 'collection' field, identify the primary franchise, cinematic universe, or production studio. For example, for "Spider-Man: No Way Home", the collection should be "Marvel Studios". For "The Lord of the Rings: The Fellowship of the Ring", it should be "The Lord of the Rings". For a TV show like "Friends", the collection should be "Friends". If the title contains a famous character name that is known to have multiple movies or series (e.g., Hercules, Dracula, Tarzan, James Bond), use that character's name as the collection name.
5.  Suitable genres. Be specific and creative (e.g., 'Cyberpunk Thriller', 'Historical Drama', 'Indie Pop', 'Formula 1').
6.  If the title or context suggests the content is dubbed or originally in Romanian (e.g., contains "Dublat", "in Romana", or is a Romanian production), you MUST include "Dublat in Romana" or "Romanesc" in the genres list.
7.  If the title or context suggests the content is from India, you MUST include "Bollywood" in the genres list.
8.  Plausible actors and directors.
9.  A plausible release date in YYYY-MM-DD format.
10. A plausible content rating (like TV-G or TV-14).
11. A plausible duration (e.g., 2h 15m for a movie, 45m for a TV episode).
12. A 1-2 word "AI Hint" for generating a poster image.
13. A plausible URL to a trailer for the content (or an empty string if none is found).
14. A comprehensive list of relevant search keywords. These should be lowercased and contain only letters, numbers, spaces, or hyphens. Crucially, they must support Unicode characters to include diacritics (e.g., 'muzică', 'acțiune').
15. Plausible intro start and end times in seconds (e.g. introStart: 30, introEnd: 90). Only for TV shows.

---

Return the entire response in the required structured JSON format. Note: Season and episode numbers should NOT be included in this response.`,
  config: {
    safetySettings: [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ]
  }
});

const generateContentMetadataFlow = ai.defineFlow(
  {
    name: 'generateContentMetadataFlow',
    inputSchema: GenerateContentMetadataInputSchema,
    outputSchema: GenerateContentMetadataOutputSchema,
  },
  async (input) => {
    const maxRetries = 3;
    let retries = 0;
    while (retries < maxRetries) {
      try {
        const { output } = await metadataGenerationPrompt(input);
        if (!output) {
          throw new Error('AI model returned an empty output. This could be due to a content policy violation or a model configuration issue.');
        }
        return output;
      } catch (error: any) {
        retries++;
        const delay = 2 ** retries * 1000; // Exponential backoff
        console.error(`[AI_FLOW_ERROR] Retrying metadata generation for title: "${input.title}" (Attempt ${retries}/${maxRetries}). Error:`, error);
        if (retries < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          console.error(`[AI_FLOW_ERROR] Failed to generate metadata for title: "${input.title}" after ${maxRetries} retries. Original error:`, error);
          throw new Error(`Failed to generate metadata after multiple retries: ${error.message}`);
        }
      }
    }
    // This line should be unreachable if the loop logic is correct.
    // It's here to satisfy TypeScript's requirement that the function must return a value.
    throw new Error('Exhausted all retries for metadata generation.');
  }
);
