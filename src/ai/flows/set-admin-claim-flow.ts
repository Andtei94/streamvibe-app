
'use server';
/**
 * @fileOverview A secure flow to set admin custom claims on a user using the Firebase Admin SDK.
 * This is the definitive way to manage user roles.
 */

import { z } from 'genkit';
import { ai } from '@/ai/init';
import * as admin from 'firebase-admin';
import { serviceAccount, serviceAccountError as initError } from '@/lib/service-account';
import type { SetAdminClaimInput, SetAdminClaimOutput } from '../schemas';
import { SetAdminClaimInputSchema, SetAdminClaimOutputSchema } from '../schemas';
import { logger } from '@/lib/logger';


let adminAppPromise: Promise<admin.App> | null = null;
let adminInitializationError: string | null = initError;

const initializeAdminApp = (): Promise<admin.App> => {
    if (adminAppPromise) {
        return adminAppPromise;
    }

    adminAppPromise = new Promise((resolve, reject) => {
        if (adminInitializationError) {
            return reject(new Error(adminInitializationError));
        }

        if (admin.apps.length > 0) {
            return resolve(admin.app());
        }

        if (serviceAccount) {
            try {
                const credential = admin.credential.cert(serviceAccount);
                const app = admin.initializeApp({ credential, projectId: serviceAccount.project_id });
                logger.info("Firebase Admin SDK initialized successfully.");
                resolve(app);
            } catch (e: any) {
                adminInitializationError = `CRITICAL: Firebase Admin SDK initialization failed: ${e.message}`;
                logger.error({ error: e, code: e.code, stack: e.stack }, adminInitializationError);
                reject(new Error(adminInitializationError));
            }
        } else {
             adminInitializationError = "Service account is not available.";
             reject(new Error(adminInitializationError));
        }
    });

    return adminAppPromise;
};


export async function setAdminClaim(input: SetAdminClaimInput): Promise<SetAdminClaimOutput> {
  const parsedInput = SetAdminClaimInputSchema.parse(input);
  return setAdminClaimFlow(parsedInput);
}

const setAdminClaimFlow = ai.defineFlow(
  {
    name: 'setAdminClaimFlow',
    inputSchema: SetAdminClaimInputSchema,
    outputSchema: SetAdminClaimOutputSchema,
  },
  async ({ uid }) => {
    if (typeof uid !== 'string' || !/^[a-zA-Z0-9]{1,128}$/.test(uid)) {
        return { success: false, message: 'Invalid UID format provided.' };
    }

    try {
        const app = await initializeAdminApp();
        const auth = admin.auth(app);
        const user = await auth.getUser(uid);

        if (user.customClaims?.admin === true) {
            return { success: true, message: 'User is already an administrator.' };
        }

        await auth.setCustomUserClaims(uid, { admin: true });
        logger.info(`Successfully set admin claim for UID: ${uid}`);
        return { success: true, message: `User ${user.displayName || user.email || uid} has been promoted to administrator.` };

    } catch (error: any) {
        logger.error(`Failed to set admin claim for UID: ${uid}`, { code: error.code, message: error.message });
        
        if (error.message.includes('initialization failed')) {
            return { success: false, message: `Admin SDK not configured: ${error.message}` };
        }

        switch(error.code) {
            case 'auth/user-not-found':
                return { success: false, message: `Error: User with UID ${uid} not found.` };
            case 'auth/invalid-uid':
                return { success: false, message: `Error: The provided UID "${uid}" is invalid.`};
            case 'PERMISSION_DENIED':
                return { success: false, message: `Permission Denied. The service account may lack necessary IAM roles, such as 'Firebase Authentication Admin'.`};
            default:
                 return { success: false, message: `An unexpected server error occurred: ${error.message || 'Unknown auth error.'}` };
        }
    }
  }
);
