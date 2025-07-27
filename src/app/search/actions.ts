
'use server';

import { collection, getDocs, query, where, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Content } from '@/lib/types';
import { documentToPlainObject } from '@/lib/utils';
import { cache } from 'react';
import { logger } from '@/lib/logger';

const STOP_WORDS = new Set(['a', 'an', 'the', 'in', 'on', 'of', 'for', 'to', 'with']);

/**
 * Calculates a relevance score for a search item.
 * A higher score means a more relevant result.
 * @param item The content item from Firestore.
 * @param keywords The search keywords derived from the user's query.
 * @param sanitizedQuery The original, sanitized user query.
 * @returns A numeric relevance score.
 */
const calculateScore = (
    item: Pick<Content, 'id' | 'title' | 'type' | 'keywords' | 'featured' | 'releaseDate'>, 
    keywords: string[], 
    sanitizedQuery: string
): number => {
    let score = 0;
    const title = item.title.toLowerCase();
    
    // 1. Direct Title Match (Highest Priority)
    if (title.includes(sanitizedQuery)) {
        score += 50;
    }

    // 2. Keyword Scoring (Granular)
    keywords.forEach(kw => {
        if (title.includes(kw)) {
            score += 10; // High score for keywords found in the title
        }
        if (item.keywords?.includes(kw)) {
            score += 5;  // Medium score for keywords found in the tags
        }
    });
    
    // 3. Type Match Boost
    if (
        (sanitizedQuery.includes('movie') && item.type === 'movie') ||
        ((sanitizedQuery.includes('tv show') || sanitizedQuery.includes('serial')) && item.type === 'tv-show')
    ) {
        score += 8;
    }

    // 4. Featured Content Boost - High impact
    if (item.featured) {
        score += 25;
    }

    return score;
};


export const getSearchSuggestions = cache(async (searchQuery: string): Promise<Pick<Content, 'id' | 'title' | 'type' | 'imageUrl'>[]> => {
  if (!searchQuery || searchQuery.trim().length < 2) {
    return [];
  }

  try {
    const sanitizedQuery = searchQuery.toLowerCase().replace(/[^a-z0-9\s-']/g, '');
    const contentCollectionRef = collection(db, 'content');
    const keywords = [...new Set(sanitizedQuery.split(' ').filter(k => k && !STOP_WORDS.has(k)))];

    if (keywords.length === 0) {
      return [];
    }

    const q = query(
      contentCollectionRef,
      where('keywords', 'array-contains-any', keywords),
      limit(20) // Fetch more results initially to allow for better local scoring
    );

    const snapshot = await getDocs(q);
    
    const results = snapshot.docs.map(doc => {
        const data = documentToPlainObject(doc) as Content;
        return {
            id: data.id,
            title: data.title,
            keywords: data.keywords || [],
            releaseDate: data.releaseDate,
            type: data.type,
            imageUrl: data.imageUrl,
            featured: data.featured || false,
        };
    });

    // Use the improved scoring function for sorting
    results.sort((a, b) => {
        const scoreA = calculateScore(a, keywords, sanitizedQuery);
        const scoreB = calculateScore(b, keywords, sanitizedQuery);

        if (scoreB !== scoreA) {
            return scoreB - scoreA;
        }
        
        // Fallback to release date for items with the same score
        try {
            return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
        } catch(e) {
            logger.error({ error: e, itemA: a.id, itemB: b.id }, "Invalid date encountered during search suggestions sort");
            return 0;
        }
    });

    // Return the top 10 most relevant results
    return results.slice(0, 10).map(({id, title, type, imageUrl}) => ({id, title, type, imageUrl}));

  } catch (error) {
    logger.error({ error, stack: (error as Error).stack, searchQuery }, "Failed to fetch search suggestions");
    // Do not throw, just return empty array for a graceful failure on the client
    return [];
  }
});

