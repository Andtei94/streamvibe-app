
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { logger } from "./logger";

// Firebase configuration is now read from environment variables.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Helper to check for undefined, null, or common placeholder values.
const isInvalidConfig = (value: string | undefined): boolean => {
    if (!value) return true;
    const lower = value.toLowerCase();
    return lower.includes('replace_with') || lower.includes('your_') || lower.includes('introduceti');
};

const requiredKeys: { name: string; value: string | undefined }[] = [
    { name: 'NEXT_PUBLIC_FIREBASE_API_KEY', value: firebaseConfig.apiKey },
    { name: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', value: firebaseConfig.authDomain },
    { name: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', value: firebaseConfig.projectId },
    { name: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', value: firebaseConfig.storageBucket },
];

const missingKeys = requiredKeys.filter(k => isInvalidConfig(k.value)).map(k => k.name);

let app: FirebaseApp | undefined = undefined;
let auth: Auth | undefined = undefined;
let db: Firestore | undefined = undefined;
let storage: FirebaseStorage | undefined = undefined;
let firebaseConfigError: string | null = null;

if (typeof window !== 'undefined' && missingKeys.length > 0) {
    firebaseConfigError = `The application cannot start due to missing or invalid configuration.\n\nPlease add the following keys with their correct values to your .env file or hosting environment:\n\n${missingKeys.join('\n')}`;
    logger.error(firebaseConfigError);
} else {
    try {
        if (!getApps().length) {
            app = initializeApp(firebaseConfig);
        } else {
            app = getApp();
        }
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
    } catch (e: any) {
        logger.error({ error: e }, "Firebase initialization failed:");
        let friendlyError = `Firebase initialization failed: ${e.message}. This can be caused by an invalid or malformed configuration in your environment variables.`;
        if (e.code === 'auth/internal-error' || e.message?.includes('identitytoolkit.googleapis.com')) {
            const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '[YOUR_PROJECT_ID]';
            const link = `https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=${projectId}`;
            friendlyError = `The authentication service (Identity Toolkit API) is not enabled for your project.\n\nPlease visit the following link to enable it, wait a few minutes, and then refresh the page:\n\n${link}`;
        }
        firebaseConfigError = friendlyError;
    }
}

export { app, auth, db, storage, firebaseConfigError };
