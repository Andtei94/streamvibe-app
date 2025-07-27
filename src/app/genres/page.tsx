
'use client';

import { collection, getDocs, query, where, orderBy, limit, FirestoreError } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Content } from '@/lib/types';
import { documentToPlainObject } from '@/lib/utils';
import GenresClient from './client';
import { LayoutList } from 'lucide-react';
import { useState, useEffect } from 'react';
import { CAROUSEL_ITEM_LIMIT } from '@/lib/constants';
import { EmptyState } from '@/components/empty-state';
import { ContentCarouselSkeleton } from '@/components/content-carousel-skeleton';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

export interface GenreShowcase {
  genre: string;
  items: Content[];
}

export default function GenresPage() {
  const [genreShowcase, setGenreShowcase] = useState<GenreShowcase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getGenreShowcase = async (): Promise<void> => {
      setLoading(true);
      try {
        const contentCollectionRef = collection(db, 'content');
        const q = query(contentCollectionRef, where('status', '==', 'published'), orderBy('releaseDate', 'desc'), limit(500));
        
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          setGenreShowcase([]);
          return;
        }
        const allContent = snapshot.docs.map(doc => documentToPlainObject(doc) as Content);

        const genreCounts: Record<string, Content[]> = {};
        allContent.forEach(item => {
          item.genres?.forEach(genre => {
            if (!genreCounts[genre]) {
              genreCounts[genre] = [];
            }
            if(genreCounts[genre].length < CAROUSEL_ITEM_LIMIT) {
                genreCounts[genre].push(item);
            }
          });
        });

        const MINIMUM_ITEMS_PER_GENRE = 3;
        const sortedGenres = Object.keys(genreCounts)
            .filter(genre => genreCounts[genre].length >= MINIMUM_ITEMS_PER_GENRE)
            .sort((a, b) => genreCounts[b].length - genreCounts[a].length);
        
        const topGenres = sortedGenres.slice(0, 10);

        const showcase: GenreShowcase[] = topGenres.map(genre => ({
          genre: genre,
          items: genreCounts[genre],
        }));

        setGenreShowcase(showcase);
      } catch (error) {
        logger.error({ error }, "Failed to fetch genres showcase:");
        if (error instanceof FirestoreError) {
          toast.error("Failed to load genres", { description: `Database Error: ${error.code}. This may require a composite index.` });
        } else {
          toast.error("Failed to load genres", { description: "Could not retrieve genre information. Please try again later." });
        }
      } finally {
        setLoading(false);
      }
    };
    
    getGenreShowcase();
  }, []);

  return (
    <div className="container mx-auto py-10 min-h-[70vh]">
      <div className="mb-12">
        <h1 className="text-3xl font-bold font-headline mb-2">Explore by Genre</h1>
         <p className="text-muted-foreground">
            Discover content curated by your favorite genres.
         </p>
      </div>
      
      {loading ? (
        <div className="space-y-12">
            <ContentCarouselSkeleton />
            <ContentCarouselSkeleton />
            <ContentCarouselSkeleton />
        </div>
      ) : genreShowcase.length > 0 ? (
        <GenresClient genres={genreShowcase} />
      ) : (
        <EmptyState
            icon={LayoutList}
            title="No Genres Found"
            description="Content has not been assigned to any genres yet."
        />
      )}
    </div>
  );
}
