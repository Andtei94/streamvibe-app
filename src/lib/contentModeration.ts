
/**
 * @fileOverview
 * Provides a basic content moderation utility.
 * In a real-world application, this should be replaced with a robust,
 * AI-powered moderation service like Google's Perspective API.
 */
import { logger } from './logger';

interface ModerationResult {
  isSafe: boolean;
  reason?: string;
  filteredText?: string;
}

const profanityList = [
  'profanity1', 'profanity2' // Placeholder for a more comprehensive list
  // In a real app, use a proper library or service.
];

const profanityRegex = new RegExp(`\\b(${profanityList.join('|')})\\b`, 'i');


/**
 * Checks a given text for profanity using a simple blocklist.
 *
 * @param text The input string to moderate.
 * @returns A promise that resolves to a ModerationResult object.
 */
export async function moderateContent(text: string): Promise<ModerationResult> {
  if (!text || typeof text !== 'string') {
    return { isSafe: true };
  }
  
  try {
    if (profanityRegex.test(text)) {
      return {
        isSafe: false,
        reason: 'The prompt contains inappropriate language.',
        filteredText: text.replace(profanityRegex, '***'),
      };
    }
    return { isSafe: true, filteredText: text };
  } catch (error) {
    logger.debug({ error }, "Content moderation check failed.");
    logger.error({ error, text: text.substring(0, 50) }, "Content moderation check failed.");
    // Fail open: If the filter crashes, assume the content is safe but log the error.
    return { isSafe: true };
  }
}
