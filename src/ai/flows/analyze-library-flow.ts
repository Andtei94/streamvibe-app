
'use server';/**
 * @fileOverview An AI flow to analyze the content library and generate statistics and insights.
 * 
 * - analyzeLibrary - A function that analyzes content data.
 * - AnalyzeLibraryOutput - The return type for a function that returns statistics and insights.
 */import {ai} from '@/ai/init';
import {z} from 'genkit';
import { collection, getDocs, FirestoreError, query, limit, startAfter, DocumentSnapshot, orderBy, CollectionReference } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Content } from '@/lib/types';
import { documentToPlainObject } from '@/lib/utils';
import { AnalyzeLibraryOutputSchema, ContentItemSchema, type AnalyzeLibraryOutput } from '../schemas';
import { logger } from '@/lib/logger';
import { isValid, parseISO } from 'date-fns';

// The client doesn't need to provide any input anymore.
export async function analyzeLibrary(): Promise<AnalyzeLibraryOutput> { 
  return analyzeLibraryFlow();
}

const statsForAISchema = z.object({
    totalItems: z.number(),
    movies: z.number(),
    tvShows: z.number(),
    music: z.number(),
    sports: z.number(),
    topGenres: z.array(z.object({ genre: z.string(), count: z.number() })),
    itemsPerDecade: z.array(z.object({ decade: z.string(), count: z.number() })),
});

// This prompt is now much simpler. It only receives pre-calculated stats.
const summaryPrompt = ai.definePrompt({
  name: 'analyzeLibrarySummaryPrompt',
  input: { schema: statsForAISchema },
  output: { schema: z.object({ aiSummary: z.string().describe("An insightful 1-2 paragraph summary of the library's profile based on the provided statistics.") }) },
  model: 'googleai/gemini-1.5-flash',
  prompt: (stats) => {
      let statsJson: string;
      try {
          statsJson = JSON.stringify(stats);
      } catch (e: any) {
          logger.error({ error: e, stats }, "Failed to stringify library stats for AI prompt.");
          throw new Error(`Failed to stringify library stats: ${e.message}`);
      }
      return `You are a media library analyst. Analyze these statistics of a video content library, considering potential data biases. Provide an insightful 1-2 paragraph summary, including dominant genres, historical distribution, and speculation about the curator.  If data is insufficient, state that.

Statistics:
${statsJson}
`;
  },
});

const analyzeLibraryFlow = ai.defineFlow(
  {
    name: 'analyzeLibraryFlow',
    inputSchema: z.void(), // Flow now takes no input
    outputSchema: AnalyzeLibraryOutputSchema,
  },
  async () => {
    try {
        const libraryStats = await calculateLibraryStatistics();
        const { output } = await summaryPrompt(libraryStats);
        if (!output) {
            throw new Error('AI summary generation failed to produce an output.');
        }
        const validatedSummary = z.string().parse(output.aiSummary);
        return {
            totalMovies: libraryStats.movies,
            totalTvShows: libraryStats.tvShows,
            totalMusic: libraryStats.music,
            totalSports: libraryStats.sports,
            totalItems: libraryStats.totalItems,
            topGenres: libraryStats.topGenres,
            itemsPerDecade: libraryStats.itemsPerDecade,
            aiSummary: validatedSummary,
        };
    } catch (error: any) {
        logger.error({ error }, '[ANALYZE_LIBRARY_FLOW_ERROR] An unexpected error occurred during library analysis.');
        if (error instanceof CustomLibraryAnalysisError) {
          throw error; // Re-throw custom error for specific handling
        } else {
          throw new CustomLibraryAnalysisError('An unexpected error occurred during library analysis.', { originalError: error });
        }
    }
  }
);

class CustomLibraryAnalysisError extends Error {
    originalError?: any;
    batchNumber?: number;
    constructor(message: string, details?: { originalError?: any, batchNumber?: number, processedItems?: number }) {
        super(message);
        this.name = 'CustomLibraryAnalysisError';
        if (details) {
            this.originalError = details.originalError;
            this.batchNumber = details.batchNumber;
        }
    }
}

/**
 * Validates a single content item.
 * Throws a specific error for invalid items.
 */
const processContentItem = (item: Record<string, any>): Content => {
    if (!item || typeof item !== 'object' || !item.id) {
        throw new CustomLibraryAnalysisError(`Invalid content item structure: Missing ID or item is not an object.`, { originalError: 'Invalid structure' });
    }
    try {
        return ContentItemSchema.parse(item);
    } catch (error: unknown) { // Catch specific error types
        if (error instanceof z.ZodError) {
            const specificIssues = error.issues.map(issue => `Field '${issue.path.join('.')}': ${issue.message}`).join('; ');
            logger.warn({ itemId: item.id, error: specificIssues, itemData: item }, 'Content item failed Zod validation and will be skipped.');
            throw new CustomLibraryAnalysisError(`Invalid data for item ${item.id}: ${specificIssues}`, { originalError: error });
        } else {
            logger.warn({ itemId: item.id, error, item }, 'An unknown error occurred during item processing.');
            throw new CustomLibraryAnalysisError(`An unknown error occurred during processing of item ${item.id}.`, { originalError: error });
        }
    }
};


// Generator function to fetch documents in batches with exponential backoff
async function* getDocsInBatches(collectionRef: CollectionReference, batchSize: number, maxRetries: number = 3) {
    let lastDoc: DocumentSnapshot | null = null;
    let attempts = 0;
    while (true) {
        try {
            let q = query(collectionRef, orderBy('title_lowercase'), limit(batchSize));
            if (lastDoc) {
                q = query(q, startAfter(lastDoc));
            }
            const snapshot = await getDocs(q);
            if (snapshot.empty) break;

            yield snapshot.docs;

            lastDoc = snapshot.docs[snapshot.docs.length - 1];
            attempts = 0; // Reset attempts on successful fetch
        } catch (error: any) {
            attempts++;
            const delay = Math.pow(2, attempts) * 1000; // Exponential backoff
            logger.error({error, attempt: attempts, delay, details: error.stack}, 'Error fetching documents from Firestore. Retrying...');
            if (attempts >= maxRetries) {
                throw new Error(`Failed to fetch documents after ${maxRetries} attempts: ${error.message}`);
            }
            await new Promise(res => setTimeout(res, delay));
        }
    }
}

const countItemType = (items: Content[]): Record<string, number> => {
    return items.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
};

const countGenres = (items: Content[]): Record<string, number> => {
    return items.reduce((acc, item) => {
        (item.genres || []).forEach(genre => acc[genre] = (acc[genre] || 0) + 1);
        return acc;
    }, {} as Record<string, number>);
};

const countDecades = (items: Content[]): Record<string, number> => {
    return items.reduce((acc, item) => {
        if (!item.releaseDate || typeof item.releaseDate !== 'string') {
            logger.warn({ itemId: item.id }, "Invalid or missing release date. Skipping item for decade statistics.");
            return acc;
        }
        const releaseDate = parseISO(item.releaseDate);
        if (!isValid(releaseDate)) {
            logger.warn({ itemId: item.id, releaseDate: item.releaseDate }, "Invalid release date format. Skipping item for decade statistics.");
            return acc;
        }
        const year = releaseDate.getFullYear();
        const decade = `${Math.floor(year / 10) * 10}s`;
        acc[decade] = (acc[decade] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
};

const calculateLibraryStatistics = async () => {
    const batchSize = 100;
    let processedItems: Content[] = [];
    logger.info('Starting library statistics calculation...');
    
    let batchNumber = 1;
    let processedCount = 0;
    try {
        const contentCollectionRef = collection(db, 'content');
        const docGenerator = getDocsInBatches(contentCollectionRef, batchSize);

        for await (const docBatch of docGenerator) {
             const newItems = docBatch.map(doc => {
                const plainObject = documentToPlainObject(doc);
                try {
                    return processContentItem(plainObject as Record<string, any>);
                } catch(e) {
                    // Log the validation error but continue with other items
                    logger.warn({error: e, item: plainObject}, "Skipping invalid content item.");
                    return null;
                }
             }).filter((item): item is Content => item !== null);

             processedItems = processedItems.concat(newItems);
             processedCount += newItems.length;
             logger.info({ batchSize: newItems.length, totalProcessed: processedCount, batchNumber }, 'Processed a batch of content items.');
             batchNumber++;
        }

        if (processedItems.length === 0) {
            logger.info('No valid content items found in the library.');
            return { totalItems: 0, movies: 0, tvShows: 0, music: 0, sports: 0, topGenres: [], itemsPerDecade: [] };
        }

        logger.info({ itemCount: processedItems.length }, 'Starting statistical aggregation...');
        
        const typeCounts = countItemType(processedItems);
        const genreCounts = countGenres(processedItems);
        const decadeCounts = countDecades(processedItems);

        const genreStats = Object.entries(genreCounts).map(([genre, count]) => ({ genre, count })).sort((a, b) => b.count - a.count);
        const decadeStats = Object.entries(decadeCounts).map(([decade, count]) => ({ decade, count })).sort((a, b) => a.decade.localeCompare(b.decade));

        const finalResult = {
            totalItems: processedItems.length,
            movies: typeCounts['movie'] || 0,
            tvShows: typeCounts['tv-show'] || 0,
            music: typeCounts['music'] || 0,
            sports: typeCounts['sports'] || 0,
            topGenres: genreStats,
            itemsPerDecade: decadeStats,
        };
        logger.info({ result: finalResult }, 'Library statistics calculation completed.');
        return finalResult;
    } catch (error: any) {
         if (error instanceof FirestoreError) {
             const errorMessage = `Database Error (Code: ${error.code}) while processing batch ${batchNumber}. Please check Firestore permissions and indexes.`;
             logger.error({ code: error.code, message: error.message, batchNumber, processedCount }, errorMessage);
             throw new CustomLibraryAnalysisError(errorMessage, { originalError: error, batchNumber, processedItems: processedCount });
        }
        logger.error({ error, batchNumber, processedCount }, 'An unexpected error occurred during library statistics calculation.');
        throw new CustomLibraryAnalysisError(`An unexpected error occurred at batch ${batchNumber}.`, { originalError: error, batchNumber, processedItems: processedCount });
    }
};
