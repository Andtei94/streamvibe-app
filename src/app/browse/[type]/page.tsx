
'use client';

import { useState, useEffect, cache } from 'react';
import { redirect } from 'next/navigation';
import { capitalize } from '@/lib/utils';
import { BrowseNav } from '@/components/browse-nav';
import { collection, getDocs, query, where, orderBy, FirestoreError, collectionGroup, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logger } from '@/lib/logger';
import { BrowseNavData } from '@/lib/types';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { PageGridSkeleton } from '@/components/page-grid-skeleton';
import BrowseResults from './results';

const BrowseNavSkeleton = () => (
    <div className="mb-8 space-y-4">
        <Skeleton className="h-10 w-full max-w-lg" />
        <Skeleton className="h-12 w-full" />
    </div>
);

// This new client-side data fetching is vastly more efficient.
const getBrowseNavData = async (): Promise<BrowseNavData> => {
    try {
        const contentRef = collection(db, 'content');
        
        // This is still a potentially large read, but we can optimize it by not fetching full docs
        // For a real-world app, this data should be aggregated into a separate 'metadata' document.
        // For this project's scale, this is a major improvement.
        const q = query(contentRef, limit(1500));
        const contentSnapshot = await getDocs(q);
        
        if (contentSnapshot.empty) {
          return { movieGenres: [], tvShowGenres: [], specialGenres: [], studios: [] };
        }

        const allGenres = new Set<string>();
        const movieGenres = new Set<string>();
        const tvShowGenres = new Set<string>();
        const studios = new Set<string>();

        contentSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.status !== 'published') return; // Filter client-side

          if (data.genres && Array.isArray(data.genres)) {
            data.genres.forEach((g: string) => {
                if(typeof g === 'string' && g.trim() !== '') {
                    allGenres.add(g);
                    if (data.type === 'movie') movieGenres.add(g);
                    if (data.type === 'tv-show') tvShowGenres.add(g);
                }
            });
          }
          if (data.collection && typeof data.collection === 'string' && data.collection.trim() !== '') {
            studios.add(data.collection);
          }
        });

        const specialGenreKeywords = ['Anime', 'Bollywood', 'Dublat in Romana', 'Romanesc'];
        const specialGenres = specialGenreKeywords.filter(g => allGenres.has(g));

        return {
          movieGenres: [...movieGenres].sort(),
          tvShowGenres: [...tvShowGenres].sort(),
          specialGenres: specialGenres,
          studios: [...studios].sort(),
        };

      } catch (error: any) {
        logger.error({ error, stack: error.stack }, "Failed to fetch browse navigation data.");
        let userMessage = 'Failed to load navigation data. Please check server logs.';
        if(error instanceof FirestoreError && error.code === 'failed-precondition') {
            userMessage = 'A required database index is missing. Could not load navigation data.';
        }
        toast.error("Error Loading Data", { description: userMessage });
        return { movieGenres: [], tvShowGenres: [], specialGenres: [], studios: [] };
      }
};


export default function BrowsePage({ params }: { params: { type: string } }) {
  const { type } = params;
  const [navData, setNavData] = useState<BrowseNavData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validTypes = ['movie', 'tv-show', 'music', 'sports'];
    if (!validTypes.includes(type)) {
      redirect('/browse/movie');
    }
  }, [type]);

  useEffect(() => {
    const fetchNav = async () => {
        setLoading(true);
        const data = await getBrowseNavData();
        setNavData(data);
        setLoading(false);
    }
    fetchNav();
  }, []);
  
  const typeTitles: { [key: string]: string } = {
    'movie': 'Movies',
    'tv-show': 'TV Shows',
    'music': 'Music',
    'sports': 'Sports'
  };
  const title = typeTitles[type] || capitalize(type);

  return (
    <div className="container mx-auto py-10 min-h-[70vh]">
      <h1 className="text-3xl font-bold font-headline mb-8">{title}</h1>
      {loading || !navData ? <BrowseNavSkeleton /> : <BrowseNav navData={navData} />}
      <BrowseResults type={type} />
    </div>
  );
}
