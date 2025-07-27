/**
 * @fileOverview
 * Provides a utility function for creating safe filenames.
 */

/**
 * Creates a safe, URL-friendly filename from a given string.
 * It converts the string to lowercase, replaces spaces and multiple
 * hyphens with a single hyphen, removes unsafe characters,
 * and truncates it to a reasonable length.
 *
 * @param input The string to convert into a filename.
 * @returns A sanitized, safe filename string.
 */
export function createFilename(input: string): string {
  if (!input) {
    return 'untitled';
  }

  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with a single hyphen
    .replace(/[^a-z0-9-]/g, '') // Remove all characters that are not lowercase letters, numbers, or hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens into one
    .substring(0, 100); // Truncate to 100 characters to prevent overly long filenames
}
