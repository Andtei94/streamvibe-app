
'use server';
/**
 * @fileOverview An AI flow to download a media file from a public URL and store it in Firebase Storage.
 * This acts as a pre-processing step for transcription or other analyses.
 */
import { z } from 'genkit';
import { ai } from '@/ai/init';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, StorageError } from 'firebase/storage';
import { ProcessExternalUrlInputSchema, ProcessExternalUrlOutputSchema } from '../schemas';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { sanitizeString } from '@/utils/sanitize-string';

const ALLOWED_PROTOCOLS = ['https:', 'http:'];
const ALLOWED_EXTENSIONS = ['.mp3', '.mp4', '.wav', '.m4a', '.aac', '.ogg', 'webm', 'mkv', 'mov', 'avi'];
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

export const processExternalUrl = ai.defineFlow(
  {
    name: 'processExternalUrlFlow',
    inputSchema: ProcessExternalUrlInputSchema,
    outputSchema: ProcessExternalUrlOutputSchema,
  },
  async ({ mediaUrl }) => {
    const validatedInput = ProcessExternalUrlInputSchema.parse({ mediaUrl });
    const url = new URL(validatedInput.mediaUrl);
    
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
        throw new Error('Invalid URL protocol. Only http and https are allowed.');
    }

    logger.info({ mediaUrl: validatedInput.mediaUrl }, `[START] Downloading external media from URL.`);
    
    let response;
    try {
      response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36' } });
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status} ${response.statusText}. Check if the URL is public and correct.`);
      }
    } catch (error: any) {
      logger.error({ error, mediaUrl: validatedInput.mediaUrl }, "Failed to fetch external URL.");
      throw new Error(`Could not download from the provided URL. Error: ${error.message}`);
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = response.headers.get('content-disposition');
    let originalFileName = 'external-media';
    if (contentDisposition) {
        const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (match && match[1]) {
            originalFileName = path.basename(match[1].replace(/['"]/g, ''));
        }
    } else {
        originalFileName = path.basename(url.pathname);
    }
    
    const sanitizedFileName = sanitizeString(originalFileName, 255).replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileExtension = path.extname(sanitizedFileName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
        throw new Error(`Unsupported file type: "${fileExtension}". Only common media formats are allowed.`);
    }

    const mediaBuffer = await response.arrayBuffer();
    if (mediaBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
        throw new Error(`File size (${(mediaBuffer.byteLength / 1024 / 1024).toFixed(2)}MB) exceeds the limit of ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`);
    }

    const uniqueFileName = `${uuidv4()}_${sanitizedFileName}`;
    const storagePath = `uploads/${uniqueFileName}`;
    const fileRef = ref(storage, storagePath);
    
    try {
        await uploadBytes(fileRef, mediaBuffer, { contentType });
        logger.info({ storagePath, contentType, originalFileName, size: mediaBuffer.byteLength }, `Successfully downloaded and stored external media.`);
    } catch (uploadError: any) {
        const isStorageError = uploadError instanceof StorageError;
        const errorCode = isStorageError ? uploadError.code : 'UNKNOWN';
        const errorMessage = `Storage upload failed with code: ${errorCode}. Message: ${uploadError.message}.`;
        logger.error({ error: uploadError, storagePath, errorCode }, errorMessage);
        throw new Error(`Could not save downloaded file. Please check storage permissions. Details: ${uploadError.message}`);
    }
    
    return { storagePath, contentType, fileName: sanitizedFileName };
  }
);
