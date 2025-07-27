
'use server';

import { collection, getDocs, query, where, orderBy, QueryConstraint } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Content } from '@/lib/types';
import { documentToPlainObject } from '@/lib/utils';
import { ContentCard } from '@/components/content-card';
import { Film } from 'lucide-react';
import { cache } from 'react';
import { EmptyState } from '@/components/empty-state';
import { GenreFilterNav } from '@/components/genre-filter-nav';
import { logger } from '@/lib/logger';

type PageProps = {
  params: { name: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

type ValidContentType = 'movie' | 'tv-show' | 'music' | 'sports';

function isValidContentType(type: any): type is ValidContentType {
    return ['movie', 'tv-show', 'music', 'sports'].includes(type);
}

const getContentByGenre = cache(async (
    genre: string, 
    type?: ValidContentType
): Promise<Content[]> => {
  if (!genre || typeof genre !== 'string' || genre.trim() === '') {
    return [];
  }

  try {
    const contentCollectionRef = collection(db, 'content');
    
    // This query requires a Firestore composite index.
    // Ensure an index exists for: genres (array-contains) AND type (==) AND releaseDate (desc)
    const queryConstraints: QueryConstraint[] = [
        where('genres', 'array-contains', genre),
        where('status', '==', 'published')
    ];

    if (type && isValidContentType(type)) {
      queryConstraints.push(where('type', '==', type));
    }
    
    queryConstraints.push(orderBy('releaseDate', 'desc'));

    const q = query(contentCollectionRef, ...queryConstraints);
    
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map(doc => documentToPlainObject(doc) as Content);

  } catch (error) {
    logger.error({ error, genre, type }, `Failed to fetch content for genre. This might require a composite index.`);
    // Propagate the error to be handled by the page component
    throw new Error(`Could not fetch content for genre "${genre}"`);
  }
});

export default async function GenreDetailsPage({ params, searchParams }: PageProps) {
  const genre = decodeURIComponent(params.name);
  const typeParam = searchParams.type;
  const type = isValidContentType(typeParam) ? typeParam : undefined;

  let items: Content[];

  try {
    items = await getContentByGenre(genre, type);
  } catch (error: any) {
    logger.error({ error, genre, type }, `Error rendering genre page`);
    return (
        <div className="container mx-auto py-10 min-h-[70vh]">
            <EmptyState 
                icon={Film}
                title="Could Not Load Content"
                description={error.message || `An error occurred while trying to load content for the "${genre}" genre.`}
            />
        </div>
    );
  }
  
  return (
    <div className="container mx-auto py-10 min-h-[70vh]">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase text-primary tracking-widest">Genre</p>
        <h1 className="text-4xl lg:text-5xl font-bold font-headline mt-1">{genre}</h1>
      </div>
      
      <GenreFilterNav />

      {items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map((item, index) => (
            <ContentCard key={item.id} content={item} priority={index < 12} />
          ))}
        </div>
      ) : (
        <EmptyState 
            icon={Film}
            title="No Content Found"
            description={`There are no items currently assigned to the "${genre}" genre${type ? ` of type "${type}"` : ''}.`}
        />
      )}
    </div>
  );
}
