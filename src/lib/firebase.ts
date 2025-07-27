
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { logger } from "./logger";

// Firebase configuration is automatically injected by App Hosting.
// This configuration object is populated at build time by Firebase.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

let app: FirebaseApp | undefined = undefined;
let auth: Auth | undefined = undefined;
let db: Firestore | undefined = undefined;
let storage: FirebaseStorage | undefined = undefined;
let firebaseConfigError: string | null = null;

// This check ensures Firebase is only initialized on the client-side.
if (typeof window !== 'undefined') {
  // A simple check to see if the config values have been injected.
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes('YOUR_')) {
      firebaseConfigError = `Firebase configuration is missing or incomplete. 
The application cannot connect to Firebase services. 
Please ensure your project is properly linked to a Firebase backend in App Hosting.`;
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
          let friendlyError = `Firebase initialization failed: ${e.message}. This can be caused by an invalid or malformed configuration.`;
          
          if (e.code === 'auth/internal-error' || e.message?.includes('identitytoolkit.googleapis.com')) {
              const projectId = firebaseConfig.projectId || '[YOUR_PROJECT_ID]';
              const link = `https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=${projectId}`;
              friendlyError = `The authentication service (Identity Toolkit API) is not enabled for your project.\n\nPlease visit the following link to enable it, wait a few minutes, and then refresh the page:\n\n${link}`;
          }
          firebaseConfigError = friendlyError;
      }
  }
}

export { app, auth, db, storage, firebaseConfigError };
