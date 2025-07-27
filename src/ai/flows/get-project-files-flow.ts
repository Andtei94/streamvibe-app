
'use server';
/**
 * @fileOverview An AI flow to retrieve all relevant project file paths and their content.
 *
 * - getProjectFiles - A function that reads all project files and returns their paths and content.
 */
import { ai } from '@/ai/init';
import { z } from 'genkit';
import { getProjectFiles as readProjectFiles } from './utils/file-reader';
import { GetProjectFilesOutputSchema, type GetProjectFilesOutput } from '../schemas';
import { logger } from '@/lib/logger';

export async function getProjectFiles(): Promise<GetProjectFilesOutput> {
  return getProjectFilesFlow();
}

const getProjectFilesFlow = ai.defineFlow(
  {
    name: 'getProjectFilesFlow',
    inputSchema: z.void(),
    outputSchema: GetProjectFilesOutputSchema,
  },
  async () => {
    try {
      const files = await readProjectFiles();
      if (!Array.isArray(files)) {
          throw new Error("readProjectFiles did not return an array.");
      }
      return { files };
    } catch (error: any) {
      logger.error({error, stack: (error as Error).stack}, "Failed to get project files");
      throw new Error(`Could not read project files: ${error.message}`);
    }
  }
);
