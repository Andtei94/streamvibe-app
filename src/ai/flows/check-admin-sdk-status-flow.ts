
'use server';
/**
 * @fileOverview A simple flow to check if the Firebase Admin SDK is configured.
 * This is used by the client to determine if admin-related UI should be enabled.
 */

import { z } from 'genkit';
import { ai } from '@/ai/init';
import { serviceAccount } from '@/lib/service-account';
import { CheckAdminSdkStatusOutputSchema } from '../schemas';
import type { CheckAdminSdkStatusOutput } from '../schemas';

export async function checkAdminSdkStatus(): Promise<CheckAdminSdkStatusOutput> {
  return checkAdminSdkStatusFlow();
}

const checkAdminSdkStatusFlow = ai.defineFlow(
  {
    name: 'checkAdminSdkStatusFlow',
    inputSchema: z.void(),
    outputSchema: CheckAdminSdkStatusOutputSchema,
  },
  async () => {
    // This is the definitive check. The presence of a valid project_id in the 
    // dedicated service account file is the gate for all Firebase Admin SDK functionality.
    const isConfigured = !!serviceAccount?.project_id;
    
    return { isConfigured };
  }
);
