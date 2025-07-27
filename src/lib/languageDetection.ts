
/**
 * @fileOverview
 * Provides a utility function to detect language from a filename and content.
 */

import { franc } from 'franc';
import { logger } from './logger';

interface LanguageInfo {
  lang: string;
  srclang: string;
}

const languageMap: Record<string, LanguageInfo> = {
  'romanian': { lang: 'Romanian', srclang: 'ro' },
  'romana': { lang: 'Romanian', srclang: 'ro' },
  'ro': { lang: 'Romanian', srclang: 'ro' },
  'english': { lang: 'English', srclang: 'en' },
  'eng': { lang: 'English', srclang: 'en' },
  'en': { lang: 'English', srclang: 'en' },
  'french': { lang: 'French', srclang: 'fr' },
  'fr': { lang: 'French', srclang: 'fr' },
  'german': { lang: 'German', srclang: 'de' },
  'de': { lang: 'German', srclang: 'de' },
  'spanish': { lang: 'Spanish', srclang: 'es' },
  'es': { lang: 'Spanish', srclang: 'es' },
  'italian': { lang: 'Italian', srclang: 'it' },
  'it': { lang: 'Italian', srclang: 'it' },
};

/**
 * Detects language information from a filename and content.
 * It uses a combination of filename heuristics and content analysis for improved accuracy.
 *
 * @param fileName The name of the subtitle file.
 * @param subtitleContent The content of the subtitle.
 * @returns A promise resolving to an object with lang and srclang.
 */
export async function detectLanguage(fileName: string, subtitleContent: string): Promise<LanguageInfo> {
  const normalizedFileName = fileName.toLowerCase().replace(/[._-]/g, ' ');

  for (const key in languageMap) {
    const regex = new RegExp(`\\b${key}\\b`);
    if (regex.test(normalizedFileName)) {
      return languageMap[key];
    }
  }

  try {
    return detectLanguageFromContent(subtitleContent);
  } catch (error) {
    logger.error({ error }, "Error during content-based language detection. Defaulting to English.");
    return { lang: 'English', srclang: 'en' };
  }
}

function detectLanguageFromContent(content: string): LanguageInfo {
  const languageCode = franc(content, { minLength: 10 });
  if (languageCode === 'und') {
    return { lang: 'Unknown', srclang: 'zz' };
  }
  const langKey = languageCode.substring(0, 2);
  return languageMap[langKey] || { lang: languageCode, srclang: langKey };
}
