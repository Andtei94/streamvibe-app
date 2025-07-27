'use server';/**
 * @fileOverview An AI flow to generate metadata and a Program Guide (EPG) for a Live TV channel.
 * 
 * - generateChannelMetadata - A function that generates a logo, category, and EPG for a TV channel.
 */

import {ai} from '@/ai/init';
import {z} from 'genkit';
import { LIVE_TV_CATEGORIES } from '@/lib/constants';
import { generateImage } from './generate-image-flow';
import { GenerateChannelMetadataInputSchema, type GenerateChannelMetadataInput, GenerateChannelMetadataOutputSchema, type GenerateChannelMetadataOutput, ProgramSchema } from '../schemas';
import { isAfter, isValid, parseISO, differenceInMilliseconds } from 'date-fns';
import { logger } from '@/lib/logger';
import { DEFAULT_POSTER_URL } from '@/lib/constants';
import { sanitizeString } from '@/utils/sanitize-string';

const CombinedMetadataSchema = z.object({
  category: z.string().describe(`The most plausible category for the channel. Choose from: ${LIVE_TV_CATEGORIES.join(', ')}.`),
  epg: z.array(ProgramSchema).describe('A plausible electronic program guide (EPG) for the channel. If you cannot generate a valid EPG, return an empty array.'),
});

const metadataPrompt = ai.definePrompt({
    name: 'generateChannelMetadataPrompt',
    input: { schema: z.object({ channelName: z.string(), currentDate: z.date(), categoryList: z.string(), epgLengthHours: z.number().min(1).max(72).default(24) }) },
    output: { schema: CombinedMetadataSchema },
    model: 'googleai/gemini-1.5-flash',
    prompt: (input) => `You are an expert TV scheduler. For the given TV channel, you need to determine its category and create a realistic, plausible electronic program guide (EPG). The EPG must be valid, with no overlaps or gaps. If you encounter issues or cannot generate a valid EPG, return a JSON object with an empty EPG array and category "General".

Channel Name: ${input.channelName}
The schedule should be based around the current date: ${input.currentDate.toISOString()}

First, determine the most likely category for the channel from this list: ${input.categoryList}.
Then, generate a schedule for a ${input.epgLengthHours}-hour block based on that category. It should be varied and logical.
Examples:
- News channel: news bulletins on the hour and special reports.
- Movie channel: films of appropriate lengths (90-150 minutes).
- Kids channel: cartoons and educational shows for different age groups.

Each program must have a startDateTime and endDateTime in full ISO 8601 format (e.g., YYYY-MM-DDTHH:mm:ssZ). The schedule must not have gaps or overlapping times. The schedule must cover a continuous ${input.epgLengthHours}-hour period based on the provided current date. Be creative and avoid repetitive patterns.

If you cannot generate a valid EPG (e.g., for an obscure channel name), you MUST return a valid JSON object with an empty array for the "epg" field and "General" for the "category".

Return the category and the EPG in the required JSON format.
`,
});

const validateEpg = (epg: z.infer<typeof ProgramSchema>[]): { isValid: boolean; error?: string } => {
    if(!epg || epg.length === 0) return { isValid: true }; // Empty EPG is valid

    for (let i = 0; i < epg.length; i++) {
        const current = epg[i];
        if (!current || !current.title || !current.startDateTime || !current.endDateTime) {
            return { isValid: false, error: `Program at index ${i} is missing required fields.` };
        }
        const start = parseISO(current.startDateTime);
        const end = parseISO(current.endDateTime);

        if (!isValid(start) || !isValid(end)) {
            return { isValid: false, error: `Invalid date format for program "${current.title}" at index ${i}.` };
        }
        if (isAfter(start, end)) {
            return { isValid: false, error: `Program "${current.title}" has an end time before its start time.` };
        }
        if (i > 0) {
            const prevEnd = parseISO(epg[i - 1].endDateTime);
            if (isAfter(prevEnd, start)) {
                return { isValid: false, error: `Overlapping schedule between "${epg[i-1].title}" and "${current.title}".` };
            }
            if (differenceInMilliseconds(start, prevEnd) > 5 * 60 * 1000) { // Allow up to 5 minute gaps
                logger.warn({ gapFound: true, programIndex: i, gapMs: differenceInMilliseconds(start, prevEnd) }, "Gap found in generated EPG, but will proceed.");
            }
        }
    }
    return { isValid: true };
};


export const generateChannelMetadata = ai.defineFlow(
  {
    name: 'generateChannelMetadataFlow',
    inputSchema: GenerateChannelMetadataInputSchema,
    outputSchema: GenerateChannelMetadataOutputSchema,
  },
  async (input) => {
    const validatedInput = GenerateChannelMetadataInputSchema.parse(input);
    const sanitizedChannelName = sanitizeString(validatedInput.channelName, 50);
    
    const parsedDate = validatedInput.currentDate ? new Date(validatedInput.currentDate) : new Date();
    if (!isValid(parsedDate)) {
        throw new Error('Invalid date format provided. Please use a valid Date object.');
    }

    try {
        const [metadataResult, imageResult] = await Promise.allSettled([
            metadataPrompt({
                channelName: sanitizedChannelName,
                currentDate: parsedDate,
                categoryList: LIVE_TV_CATEGORIES.join(', '),
                epgLengthHours: validatedInput.epgLengthHours
            }),
            generateImage({
                prompt: `A minimalist, modern logo for a TV channel named "${sanitizedChannelName}". Style: ${validatedInput.logoStyle || 'abstract vibrant'}.`,
                fileName: `logo_${sanitizedChannelName}`
            }),
        ]);

        if (metadataResult.status === 'rejected') {
            throw new Error(`AI failed to generate schedule: ${metadataResult.reason?.message || 'Unknown reason'}`);
        }
        let imageUrl = DEFAULT_POSTER_URL;
        if (imageResult.status === 'fulfilled' && imageResult.value.imageUrl) {
            imageUrl = imageResult.value.imageUrl;
        } else {
            logger.error({ error: imageResult.status === 'rejected' ? imageResult.reason : 'No image URL returned' }, `Image generation failed for channel ${sanitizedChannelName}, but flow will continue with a blank logo.`);
        }
        
        const metadata = metadataResult.value.output;
        if (!metadata || !metadata.epg || !Array.isArray(metadata.epg)) {
          throw new Error('AI returned an invalid or empty EPG structure.');
        }

        const epgValidation = validateEpg(metadata.epg);
        if (!epgValidation.isValid) {
            logger.error({ error: epgValidation.error, epg: metadata.epg }, "AI generated an invalid EPG.");
            throw new Error(`AI generated an invalid EPG: ${epgValidation.error}`);
        }

        if (!LIVE_TV_CATEGORIES.includes(metadata.category)) {
             logger.warn({ generatedCategory: metadata.category, channelName: sanitizedChannelName }, "AI generated an invalid category. Falling back to 'General'.");
            metadata.category = 'General';
        }

        return {
          logoUrl: imageUrl,
          category: metadata.category,
          epg: metadata.epg,
        };

    } catch (error: any) {
        const errorContext = { input: validatedInput, channelName: sanitizedChannelName };
        logger.error({ error, stack: error.stack, ...errorContext }, `[FAIL] Error in generateChannelMetadataFlow`);
        
        let clientMessage = `Failed to generate metadata for ${sanitizedChannelName}`;
        if (error.message.includes('invalid EPG')) {
            clientMessage += `: The AI returned a schedule with errors.`;
        } else if (error.message.includes('AI failed')) {
            clientMessage += `: The AI model could not generate data for this channel.`;
        }
        
        throw new Error(`${clientMessage} Original error: ${error.message}`);
    }
  }
);
