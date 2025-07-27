
'use server';/**
 * @fileOverview An AI flow to batch-import content by generating metadata and posters for a list of titles.
 * 
 * - batchImportFromTitles - A function that handles the batch import process.
 */

import { z } from 'genkit';
import { ai } from '@/ai/init';
import { addContentFromTitle } from './add-content-from-title-flow';
import { BatchImportInputSchema, type BatchImportInput, BatchImportOutputSchema, type BatchImportOutput } from '../schemas';
import { logger } from '@/lib/logger';

const sanitizeTitle = (title: string) => {
  if (title === null || title === undefined) return '';
  return title.replace(/[^a-zA-Z0-9.,\s-]/g, '').trim();
};

export async function batchImportFromTitles(input: BatchImportInput): Promise<BatchImportOutput> {
  try {
    const parsedInput = BatchImportInputSchema.parse(input);
    const { titles } = parsedInput;
    if (!Array.isArray(titles) || titles.length === 0) {
        return { addedCount: 0, skippedCount: 0, failedItems: [], addedTitles: [] };
    }
    const numTitles = titles.length;
    logger.info({ numTitles }, 'Starting batch import process.');
    const result = await batchImportFlow(parsedInput);
    logger.info({ ...result, numTitles }, 'Batch import completed.');
    return result;
  } catch (error: any) {
    const errorMessage = error instanceof z.ZodError ? JSON.stringify(error.issues) : (error instanceof Error ? error.message : 'An unexpected error occurred.');
    logger.error({ error, stack: (error as Error).stack, input }, `An unexpected error occurred in batchImportFromTitles. Error: ${errorMessage}`);
    return { addedCount: 0, skippedCount: 0, failedItems: [{ title: 'Batch Operation', error: errorMessage }], addedTitles: [] };
  }
}

const batchImportFlow = ai.defineFlow(
  {
    name: 'batchImportFlow',
    inputSchema: BatchImportInputSchema,
    outputSchema: BatchImportOutputSchema,
  },
  async ({ titles }) => {
    const sanitizedTitles = titles.map(sanitizeTitle).filter(Boolean);
    const uniqueTitles = [...new Set(sanitizedTitles)];
    
    if (uniqueTitles.length === 0) {
      return { addedCount: 0, skippedCount: 0, failedItems: [], addedTitles: [] };
    }
    
    logger.info({ uniqueTitlesCount: uniqueTitles.length }, `Processing ${uniqueTitles.length} unique titles.`);

    const results = await Promise.allSettled(uniqueTitles.map((title, index) => 
        addContentFromTitle({ title }).catch(err => Promise.reject({ title: title, error: err, index }))
    ));

    const processResults = () => {
        return results.reduce((acc, result, index) => {
            const originalTitle = uniqueTitles[index];
            const logContext = { title: originalTitle, index };
            if (result.status === 'fulfilled') {
                const value = result.value;
                if (value.success && value.finalTitle) {
                    acc.addedCount++;
                    acc.addedTitles.push(value.finalTitle);
                    logger.info({ ...logContext, finalTitle: value.finalTitle }, 'Batch import item successfully added.');
                } else {
                    const errorMessage = typeof value.error === 'string' ? value.error : JSON.stringify(value.error);
                    if (errorMessage.includes('already exists')) {
                        acc.skippedCount++;
                        logger.info({ ...logContext, error: errorMessage }, 'Batch import item skipped (duplicate).');
                    } else {
                        acc.failedItems.push({ title: originalTitle, error: errorMessage });
                        logger.error({ ...logContext, error: errorMessage }, 'Batch import item failed during addContent flow.');
                    }
                }
            } else { // status is 'rejected'
                const errorMessage = result.reason instanceof Error ? result.reason.message : 'An unknown processing error occurred.';
                acc.failedItems.push({ title: originalTitle, error: errorMessage });
                logger.error({ ...logContext, error: errorMessage, reason: result.reason }, 'Batch import item failed with a rejected promise.');
            }
            return acc;
        }, { addedCount: 0, skippedCount: 0, failedItems: [] as { title: string; error: string }[], addedTitles: [] as string[] });
    }

    return processResults();
  }
);
