'use server';
/**
 * @fileOverview An AI flow to upload a subtitle file to storage and attach it to a content document in Firestore.
 */

import { z } from 'genkit';
import { ai } from '@/ai/init';
import { doc, updateDoc, arrayUnion, FirestoreError } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL, StorageError } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { AttachSubtitleInputSchema, AttachSubtitleOutputSchema } from '../schemas';
import type { Subtitle } from '@/lib/types';
import { logger } from '@/lib/logger';
import { detectLanguage } from '@/lib/languageDetection';
import path from 'path';
import { parse as parseVtt } from 'subtitle';

// Helper to validate subtitle content before upload
const validateSubtitleContent = (content: string): boolean => {
    if (!content.trim().startsWith('WEBVTT') && !/^\d+\r?\n\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/.test(content)) {
        return false;
    }
    try {
        const cues = parseVtt(content);
        return cues.length > 0;
    } catch (error) {
        logger.warn({ error }, "Subtitle validation failed during parsing.");
        return false;
    }
};

export const attachSubtitle = ai.defineFlow(
  {
    name: 'attachSubtitleFlow',
    inputSchema: AttachSubtitleInputSchema,
    outputSchema: AttachSubtitleOutputSchema,
  },
  async ({ contentId, subtitleContent, fileName }) => {
    const logMeta = { contentId, fileName: fileName || 'unknown', fileSize: subtitleContent.length };
    logger.info(logMeta, "Starting subtitle attachment flow.");

    if (!subtitleContent || subtitleContent.trim().length === 0) {
      throw new Error('Subtitle content cannot be empty.');
    }
    if (subtitleContent.length > 5 * 1024 * 1024) { // 5MB limit
      throw new Error('Subtitle file size exceeds the 5MB limit.');
    }
    if (!validateSubtitleContent(subtitleContent)) {
        throw new Error('Invalid subtitle format. Content must be a valid VTT or SRT file.');
    }
    
    const sanitizedFileName = fileName ? path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, '_') : 'untitled';

    // Step 1: Upload to Cloud Storage
    const uniqueFileName = `subtitles/${contentId}_${uuidv4()}_${sanitizedFileName}.vtt`;
    const subtitleRef = ref(storage, uniqueFileName);
    let downloadURL: string;

    try {
        logger.info({ ...logMeta, storagePath: uniqueFileName }, "Uploading subtitle to storage.");
        const snapshot = await uploadString(subtitleRef, subtitleContent, 'raw', { contentType: 'text/vtt;charset=utf-8' });
        downloadURL = await getDownloadURL(snapshot.ref);
        logger.info({ ...logMeta, downloadURL }, "Subtitle uploaded successfully.");
    } catch (error: any) {
        const isStorageError = error instanceof StorageError;
        const errorCode = isStorageError ? error.code : 'UNKNOWN';
        const errorMessage = `Storage upload failed with code: ${errorCode}. Message: ${error.message}.`;
        logger.error({ ...logMeta, error, errorCode, stack: error.stack }, errorMessage);
        throw new Error(`Failed to upload subtitle. Please check storage permissions. Details: ${error.message}`, {cause: error});
    }
    
    // Step 2: Prepare Firestore entry
    let langInfo;
    try {
        langInfo = await detectLanguage(fileName || '', subtitleContent);
    } catch(error) {
        logger.error({ ...logMeta, error }, "Language detection failed.");
        langInfo = { lang: 'Unknown', srclang: 'zz' }; // Fallback
    }

    const label = (fileName?.split('.').slice(0, -1).join('.') || 'Uploaded Subtitle').trim();
    logger.info({ ...logMeta, detectedLang: langInfo.lang, label }, "Language detection complete.");

    const newSubtitleEntry: Subtitle = {
        lang: langInfo.lang,
        srclang: langInfo.srclang,
        url: downloadURL,
        label: label
    };

    // Step 3: Update Firestore document
    const contentDocRef = doc(db, 'content', contentId);
    try {
        logger.info({ ...logMeta, newSubtitleEntry }, "Updating Firestore document.");
        await updateDoc(contentDocRef, { subtitles: arrayUnion(newSubtitleEntry) });
        logger.info({ ...logMeta }, "Successfully attached new subtitle to content.");

        return { success: true, newSubtitleUrl: downloadURL };
    } catch (error: any) {
        const isDbError = error instanceof FirestoreError;
        const errorCode = isDbError ? error.code : 'UNKNOWN';
        let errorMessage = `Database update failed with code: ${errorCode}. Message: ${error.message}`;
        if (errorCode === 'permission-denied') errorMessage = 'Permission denied. Could not update the content document.';
        else if (errorCode === 'not-found') errorMessage = 'The content item to update was not found.';
        
        logger.error({ ...logMeta, error, errorCode, stack: error.stack }, errorMessage);
        throw new Error(errorMessage, {cause: error});
    }
  }
);
