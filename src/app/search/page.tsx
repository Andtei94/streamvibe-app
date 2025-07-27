
'use server';

import { collection, getDocs, query, where, limit, orderBy, QueryConstraint } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Content } from '@/lib/types';
import SearchResults from './results';
import { Search as SearchIcon } from 'lucide-react';
import { documentToPlainObject } from '@/lib/utils';
import { cache } from 'react';
import { EmptyState } from '@/components/empty-state';
import { logger } from '@/lib/logger';

const SEARCH_RESULTS_LIMIT = 100;

const searchContent = cache(async (params: {
  searchQuery: string;
  type?: string;
  genre?: string;
}): Promise<Content[]> => {
  const { searchQuery, type, genre } = params;

  if (!searchQuery && (!type || type === 'all') && (!genre || genre === 'all')) {
    return [];
  }

  try {
    const contentCollectionRef = collection(db, 'content');
    
    const constraints: QueryConstraint[] = [];

    if (searchQuery) {
        const keywords = [...new Set(searchQuery.toLowerCase().split(' ').filter(Boolean))].slice(0, 10);
        if (keywords.length > 0) {
            constraints.push(where('keywords', 'array-contains-any', keywords));
        }
    }

    if (type && type !== 'all') {
        constraints.push(where('type', '==', type));
    }

    if (genre && genre !== 'all') {
        constraints.push(where('genres', 'array-contains', genre));
    }

    constraints.push(orderBy('releaseDate', 'desc'));
    constraints.push(limit(SEARCH_RESULTS_LIMIT));

    const q = query(contentCollectionRef, ...constraints);
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => documentToPlainObject(doc) as Content);

  } catch (error: any) {
    logger.error({ error, stack: (error as Error).stack, params }, "Search query failed. This might be due to a missing Firestore index.");
    throw new Error('Could not perform search due to a server error.');
  }
});


const getGenres = cache(async (): Promise<string[]> => {
  try {
      const contentCollectionRef = collection(db, 'content');
      const snapshot = await getDocs(query(contentCollectionRef, limit(1000)));
      if (snapshot.empty) {
        return [];
      }
      const allGenres = snapshot.docs.flatMap(doc => (doc.data().genres || []) as string[]);
      return [...new Set(allGenres)].sort((a, b) => a.localeCompare(b));
  } catch(error) {
    logger.error({ error, stack: (error as Error).stack }, "Failed to fetch genres for search filters.");
    return [];
  }
});

export default async function SearchPage({ searchParams }: { searchParams: { q?: string, type?: string, genre?: string } }) {
  const queryParam = searchParams?.q || '';
  const typeParam = searchParams?.type;
  const genreParam = searchParams?.genre;
  
  const [results, genres] = await Promise.all([
      searchContent({
          searchQuery: queryParam.toLowerCase(),
          type: typeParam,
          genre: genreParam,
      }).catch(err => {
          logger.error({ error: err }, "Search failed at page level, returning empty results.");
          return [];
      }),
      getGenres(),
  ]);

  return (
    <div className="container mx-auto py-10 min-h-[70vh]">
      <h1 className="text-3xl font-bold font-headline mb-2">Search</h1>
      {queryParam ? (
         <p className="text-muted-foreground mb-8">
            Showing results for: <span className="text-foreground font-semibold">&quot;{queryParam}&quot;</span>
        </p>
      ) : (
         <p className="text-muted-foreground mb-8">
            Use the search bar or the filters below to discover content. Common words like 'a', 'the', etc., are ignored.
         </p>
      )}

      <SearchResults initialResults={results} genres={genres} />
    </div>
  );
}
