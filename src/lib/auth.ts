
import 'server-only';
import { cookies } from 'next/headers';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth as getAdminAuth, DecodedIdToken } from 'firebase-admin/auth';
import { serviceAccount, serviceAccountError } from './service-account';
import { logger } from './logger';

let adminApp: App | null = null;
if (!getApps().length) {
    if (serviceAccount) {
        try {
            adminApp = initializeApp({
                credential: {
                    projectId: serviceAccount.project_id,
                    clientEmail: serviceAccount.client_email,
                    privateKey: serviceAccount.private_key,
                },
            });
        } catch (e: any) {
             logger.error({ error: e }, "Firebase Admin SDK initialization failed on server.");
        }
    }
} else {
    adminApp = getApps()[0];
}

async function getDecodedIdToken(): Promise<DecodedIdToken | null> {
    const sessionCookie = cookies().get('__session')?.value;
    if (!sessionCookie) return null;
    
    if (!adminApp) {
        logger.warn("Admin app not initialized, cannot verify session cookie.");
        return null;
    }

    try {
        const decodedIdToken = await getAdminAuth(adminApp).verifySessionCookie(sessionCookie, true);
        return decodedIdToken;
    } catch (error) {
        logger.warn({ error }, 'Failed to verify session cookie.');
        return null;
    }
}

export async function getAuthenticatedUser() {
    const decodedToken = await getDecodedIdToken();
    if (!decodedToken) return null;

    return {
        uid: decodedToken.uid,
        name: decodedToken.name || decodedToken.email || 'Anonymous',
        email: decodedToken.email,
        isAdmin: decodedToken.admin === true,
    };
}
