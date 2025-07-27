/**
 * @fileOverview
 * Provides a robust utility function to sanitize strings.
 */

/**
 * Sanitizes a string by removing potentially harmful characters,
 * trimming whitespace, and truncating it to a maximum length.
 *
 * @param input The string to sanitize.
 * @param maxLength The maximum allowed length for the sanitized string.
 * @returns A sanitized and truncated string.
 */
export function sanitizeString(input: string, maxLength?: number): string {
  if (!input) {
    return '';
  }

  // 1. Remove unwanted characters. This regex allows alphanumeric, spaces, hyphens, and apostrophes.
  // It's designed to be safer than allowing a wide range of special characters.
  const sanitized = input.replace(/[^a-zA-Z0-9\s'-]/g, '');

  // 2. Collapse multiple whitespace characters into a single space and trim.
  const trimmed = sanitized.replace(/\s+/g, ' ').trim();

  // 3. Truncate to the maximum length if maxLength is provided.
  if (maxLength !== undefined) {
    return trimmed.substring(0, maxLength);
  }
  
  return trimmed;
}
