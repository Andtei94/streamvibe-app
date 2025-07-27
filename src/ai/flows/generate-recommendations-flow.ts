
'use server';/**
 * @fileOverview An AI flow to generate personalized content recommendations for a user.
 * 
 * - generateRecommendations - Generates a list of recommended content based on user's watch history.
 */

import { z } from 'genkit';
import { ai } from '@/ai/init';
import { collection, getDocs, query, where, documentId, limit, orderBy, FirestoreError } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Content } from '@/lib/types';
import { documentToPlainObject } from '@/lib/utils';
import { CAROUSEL_ITEM_LIMIT, INITIAL_RECOMMENDATIONS_LIMIT } from '@/lib/constants';
import { GenerateRecommendationsInputSchema, type GenerateRecommendationsInput, GenerateRecommendationsOutputSchema, type GenerateRecommendationsOutput } from '../schemas';
import { logger } from '@/lib/logger';


export async function generateRecommendations(input: GenerateRecommendationsInput): Promise<GenerateRecommendationsOutput> {
  return generateRecommendationsFlow(input);
}

class RecommendationError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message);
    this.name = 'RecommendationError';
  }
}

const RecommendationAnalysisSchema = z.object({
    watchedContent: z.array(z.object({
        title: z.string(),
        type: z.string(),
        genres: z.array(z.string()).optional(),
        
    })).describe("A list of content that the user has watched or added to their list."),
});

const RecommendationCriteriaSchema = z.object({
    reasoning: z.string().describe("A brief, 1-2 sentence explanation of the user's taste profile based on their history."),
    recommendedGenres: z.array(z.string()).describe("A list of genres the user would likely enjoy."),
    recommendedKeywords: z.array(z.string()).describe("A list of specific keywords (like actors, themes, or directors) to search for."),
});

const recommendationAnalysisPrompt = ai.definePrompt({
    name: 'recommendationAnalysisPrompt',
    input: { schema: RecommendationAnalysisSchema },
    output: { schema: RecommendationCriteriaSchema },
    model: 'googleai/gemini-1.5-flash',
    prompt: (input) => `You are a sophisticated recommendation engine for a streaming service. Your task is to analyze a user's watched content and generate a search profile to find new content for them.

User's Watched Content:
${JSON.stringify(input.watchedContent)}

Based on the user's taste profile from their watched content (analyzing genres, themes, and styles):
1. Write a short, 1-2 sentence summary of your reasoning for the user's profile.
2. Generate a list of genres they are most likely to enjoy. If the watched content lacks clear genre patterns, generate broader, popular genres like 'Action' or 'Comedy'.
3. Generate a list of specific keywords (e.g., an actor's name, a director, a specific theme like "space exploration" or "heist") that would be good search terms. If patterns are unclear, suggest thematic keywords like 'critically acclaimed' or 'blockbuster'.

Return this analysis in the required JSON format.
`,
});

const generateRecommendationsFlow = ai.defineFlow(
  {
    name: 'generateRecommendationsFlow',
    inputSchema: GenerateRecommendationsInputSchema,
    outputSchema: GenerateRecommendationsOutputSchema,
  },
  async (rawInput) => {
    const { userId } = GenerateRecommendationsInputSchema.parse(rawInput);
    if (!userId || typeof userId !== 'string' || !userId.match(/^[a-zA-Z0-9]{1,128}$/)) {
        throw new RecommendationError("Invalid user ID format.", "validation_error");
    }
    const logContext = { flow: 'generateRecommendations', userIdLength: userId.length };
    logger.info(logContext, `[START] Generating recommendations.`);

    try {
        const watchHistoryRef = collection(db, 'users', userId, 'watch-history');
        const watchHistorySnapshot = await getDocs(watchHistoryRef);
        const watchedContentIds = watchHistorySnapshot.docs.map(doc => doc.id);
        
        logger.info({ ...logContext, historyCount: watchedContentIds.length }, "User's watch history IDs fetched.");

        if (watchedContentIds.length === 0) {
          logger.warn(logContext, "Cannot generate recommendations without a watch history.");
          throw new RecommendationError('No watch history found for user.', 'no_history', { recommendations: [] });
        }
        
        if (!Array.isArray(watchedContentIds) || watchedContentIds.some(id => typeof id !== 'string' || id.trim() === '')) {
            throw new RecommendationError('Invalid watch history IDs found in database.', 'validation_error');
        }

        const contentQuery = query(collection(db, 'content'), where(documentId(), 'in', watchedContentIds));
        const querySnapshot = await getDocs(contentQuery);
        const watchedContent = querySnapshot.docs.map(doc => {
            try {
                const data = documentToPlainObject(doc) as Content;
                if (!data.title || !data.type) {
                    logger.warn({ ...logContext, contentId: doc.id }, "Skipping watched content item due to missing title or type.");
                    return null;
                }
                return data;
            } catch (error: any) {
                logger.error({ ...logContext, error, contentId: doc.id, docData: doc.data() }, "Error processing document to plain object");
                throw new RecommendationError(`Failed to process document with ID ${doc.id}.`, 'data_processing_error', { originalError: error });
            }
        }).filter(Boolean) as Content[];
        
        logger.info({ ...logContext, watchedContentCount: watchedContent.length }, "Fetched watched content details.");

        if (watchedContent.length === 0) {
            throw new RecommendationError("No valid content found in user's watch history.", 'no_valid_content', { recommendations: [] });
        }

        let criteria;
        try {
            const { output } = await recommendationAnalysisPrompt({
                watchedContent: watchedContent.map(c => ({ title: c.title, type: c.type, genres: c.genres || [] }))
            });
            if (!output) throw new RecommendationError("AI failed to generate a response.", "ai_error");
            criteria = RecommendationCriteriaSchema.parse(output);
        } catch (error: any) {
            logger.error({ ...logContext, error, stack: error.stack }, 'Error in recommendationAnalysisPrompt.');
            throw new RecommendationError(`AI failed to analyze viewing history: ${error.message}`, "ai_error", { originalError: error });
        }

        logger.info({ ...logContext, criteria: { reasoning: criteria.reasoning, genresCount: criteria.recommendedGenres.length, keywordsCount: criteria.recommendedKeywords.length } }, `AI generated criteria.`);

        const contentCollectionRef = collection(db, 'content');
        const searchKeywords = [...new Set([...criteria.recommendedGenres, ...criteria.recommendedKeywords])];
        
        if (searchKeywords.length === 0) {
            logger.warn(logContext, "No search keywords were generated by AI.");
            throw new RecommendationError('AI generated no keywords for recommendations.', 'no_keywords', { recommendations: [] });
        }

        const recommendationsQuery = query(contentCollectionRef, where('keywords', 'array-contains-any', searchKeywords), orderBy('releaseDate', 'desc'), where(documentId(), 'not-in', watchedContentIds), limit(INITIAL_RECOMMENDATIONS_LIMIT));
        const recommendationsSnapshot = await getDocs(recommendationsQuery);
        
        if (recommendationsSnapshot.empty) {
            logger.info(logContext, "No recommendations found matching AI criteria.");
            return { recommendations: [] };
        }
        
        const potentialRecommendations = recommendationsSnapshot.docs.map(doc => documentToPlainObject(doc) as Content);
        const finalRecommendations = potentialRecommendations.slice(0, CAROUSEL_ITEM_LIMIT);

        logger.info({ ...logContext, finalCount: finalRecommendations.length }, `[SUCCESS] Returning recommendations.`);
        return { recommendations: finalRecommendations };
    } catch (error: any) {
        if (error instanceof RecommendationError) throw error;
        if (error instanceof FirestoreError) {
             throw new RecommendationError(`Database error: ${error.message}`, `firestore_${error.code}`, { originalError: error });
        }
        logger.error({ ...logContext, error, stack: error.stack }, "[FAIL] Unhandled error generating recommendations.");
        throw new RecommendationError(`An unexpected error occurred: ${error.message}`, 'unknown_error', { originalError: error });
    }
  }
);
