
'use server';
/**
 * @fileOverview An AI flow to count the total lines of code in the project.
 *
 * - countLinesOfCode - A function that reads all project files and returns the line count.
 */
import { ai } from '@/ai/init';
import { z } from 'genkit';
import { getProjectFiles } from './utils/file-reader';
import { CountLinesOfCodeOutputSchema, type CountLinesOfCodeOutput } from '../schemas';
import { logger } from '@/lib/logger';

export async function countLinesOfCode(): Promise<CountLinesOfCodeOutput> {
  return countLinesOfCodeFlow();
}

const countLinesOfCodeFlow = ai.defineFlow(
  {
    name: 'countLinesOfCodeFlow',
    inputSchema: z.void(),
    outputSchema: CountLinesOfCodeOutputSchema,
  },
  async () => {
    try {
      const files = await getProjectFiles();
      if (!Array.isArray(files)) {
          throw new Error("getProjectFiles did not return an array.");
      }
      let totalLines = 0;
      for (const file of files) {
        if (!file || typeof file.path !== 'string' || typeof file.content !== 'string') {
          logger.warn({filePath: file?.path}, `Skipping invalid file object: structure is not as expected.`);
          continue;
        }
        if (file.content.length === 0) {
          logger.debug({filePath: file.path}, `Skipping empty file.`);
          continue;
        }
        totalLines += file.content.split('\n').length;
      }
      return { totalLines, fileCount: files.length };
    } catch (error: any) {
      logger.error({error, stack: (error as Error).stack}, "Failed to count lines of code");
      throw new Error(`Could not count lines of code: ${error.message}`);
    }
  }
);
