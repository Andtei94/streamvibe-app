
'use server';
/**
 * @fileOverview A utility flow to fetch content from a URL on the server.
 * This acts as a proxy to bypass client-side CORS issues.
 */

import { z } from 'genkit';
import { ai } from '@/ai/init';
import { FetchUrlContentInputSchema, FetchUrlContentOutputSchema } from '../schemas';
import type { FetchUrlContentInput, FetchUrlContentOutput } from '../schemas';
import { logger } from '@/lib/logger';

export async function fetchUrlContent(input: FetchUrlContentInput): Promise<FetchUrlContentOutput> {
  return fetchUrlContentFlow(input);
}

const fetchUrlContentFlow = ai.defineFlow(
  {
    name: 'fetchUrlContentFlow',
    inputSchema: FetchUrlContentInputSchema,
    outputSchema: FetchUrlContentOutputSchema,
  },
  async ({ url }) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch from URL: ${response.status} ${response.statusText}`);
      }
      const content = await response.text();
      return { success: true, content };
    } catch (error: any) {
      logger.error({ error, url }, 'Failed to fetch URL content in flow.');
      return { success: false, error: error.message || 'An unknown error occurred while fetching the URL.' };
    }
  }
);
