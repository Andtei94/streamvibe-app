
/**
 * @fileOverview
 * This file securely loads and validates the Firebase service account credentials.
 * The logic is designed to run ONLY on the server to prevent exposing secrets
 * and to avoid client/server mismatches (hydration errors).
 */

import 'server-only';
import { logger } from './logger';
import { z } from 'zod';

const serviceAccountSchema = z.object({
  type: z.string().min(1, "type is required"),
  project_id: z.string().min(1, "project_id is required"),
  private_key_id: z.string().min(1, "private_key_id is required"),
  private_key: z.string().min(1, "private_key is required"),
  client_email: z.string().email("client_email must be a valid email"),
  client_id: z.string().min(1, "client_id is required"),
  auth_uri: z.string().url("auth_uri must be a valid URL"),
  token_uri: z.string().url("token_uri must be a valid URL"),
  auth_provider_x509_cert_url: z.string().url("auth_provider_x509_cert_url must be a valid URL"),
  client_x509_cert_url: z.string().url("client_x509_cert_url must be a valid URL"),
  universe_domain: z.string().optional(),
}).strict();

type ServiceAccount = z.infer<typeof serviceAccountSchema>;

let serviceAccount: ServiceAccount | null = null;
let serviceAccountError: string | null = null;
let isAdminSdkConfigured: boolean = false;

try {
  const encodedServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!encodedServiceAccount || encodedServiceAccount.trim() === '' || encodedServiceAccount.startsWith('PASTE_YOUR_BASE64')) {
    throw new Error('The FIREBASE_SERVICE_ACCOUNT environment variable is not set or is a placeholder.');
  }

  const decodedJson = Buffer.from(encodedServiceAccount, 'base64').toString('utf-8');
  const parsedJson = JSON.parse(decodedJson);

  const validationResult = serviceAccountSchema.safeParse(parsedJson);

  if (!validationResult.success) {
    const issues = validationResult.error.issues.map(issue => `  - Field '${issue.path.join('.')}': ${issue.message}`).join('\n');
    throw new Error(`Service account JSON validation failed:\n${issues}`);
  }

  const validatedAccount = validationResult.data;
  validatedAccount.private_key = validatedAccount.private_key.replace(/\\n/g, '\n');
  
  serviceAccount = validatedAccount;
  isAdminSdkConfigured = true;

} catch (error: any) {
  let message = `Admin features disabled. ${error.message}`;
  if (error instanceof SyntaxError) {
      message = "Admin features disabled. The FIREBASE_SERVICE_ACCOUNT value is not a valid JSON string. Please ensure it's correctly copied and Base64 encoded.";
  }
  serviceAccountError = message;
  logger.warn({ error: error.message }, "Service account initialization failed.");
  serviceAccount = null;
  isAdminSdkConfigured = false;
}

export { serviceAccount, serviceAccountError, isAdminSdkConfigured };
