
/**
 * @fileOverview
 * Provides a utility function to extract season and episode numbers from a string.
 */

/**
 * Extracts season and episode information from a title string using a robust regex.
 *
 * @param title The raw title string (e.g., from a filename).
 * @returns An object containing the cleaned title, season number, and episode number.
 *          Returns null for season/episode if not found.
 */
export function extractEpisodeInfo(title: string): {
  cleanedTitle: string;
  season: number | null;
  episode: number | null;
} {
  if (!title) {
    return { cleanedTitle: '', season: null, episode: null };
  }

  const regex = /(?:s|season|sezon|sezonul)?\s*(\d{1,2})\s*[ex]s*(?:ep|episode|episodul)?\s*(\d{1,3})/i;
  const match = title.match(regex);

  if (match) {
    const season = parseInt(match[1], 10);
    const episode = parseInt(match[2], 10);
    
    if (isNaN(season) || isNaN(episode)) {
        // Fallback to basic cleaning if parsing fails for some reason
        const basicCleanedTitle = title.replace(/\.[^/.]+$/, '').replace(/[._]/g, ' ').replace(/\s+/g, ' ').trim();
        return { cleanedTitle: basicCleanedTitle, season: null, episode: null };
    }

    const cleanedTitle = title
      .replace(match[0], '')
      .replace(/[\][()]/g, '') 
      .replace(/\.[^/.]+$/, '') 
      .replace(/[._]/g, ' ')   
      .replace(/\s+/g, ' ')      
      .trim();

    return {
      cleanedTitle: cleanedTitle || '',
      season,
      episode,
    };
  }

  // If no SxxExx pattern, just clean the title
  const basicCleanedTitle = title
    .replace(/\.[^/.]+$/, '')
    .replace(/[._]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { cleanedTitle: basicCleanedTitle, season: null, episode: null };
}
