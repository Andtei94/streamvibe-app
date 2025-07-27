
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Content } from '@/lib/types';
import { ContentCard } from '@/components/content-card';
import { collection, getDocs, query, where, orderBy, FirestoreError } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { documentToPlainObject } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Loader2, Clapperboard } from 'lucide-react';
import { PageGridSkeleton } from '@/components/page-grid-skeleton';
import { EmptyState } from '@/components/empty-state';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface BrowseResultsProps {
  type: string;
}

// Client-side sorting is efficient for typical page sizes and avoids complex index requirements.
const sortContentByReleaseDate = (items: Content[]): Content[] => {
    return [...items].sort((a, b) => {
        try {
            const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
            const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
            return dateB - dateA; // Descending order
        } catch (e) {
            logger.error({ error: e, itemA: a.id, itemB: b.id }, "Failed to parse release date for sorting.");
            return 0;
        }
    });
};


export default function BrowseResults({ type }: BrowseResultsProps) {
  const [items, setItems] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContent = useCallback(async () => {
    setLoading(true);

    try {
      const contentCollectionRef = collection(db, 'content');
      // This is now a very simple query that does not require a composite index.
      // Filtering by status and sorting by date will happen on the client.
      const q = query(
        contentCollectionRef,
        where('type', '==', type),
        orderBy('title_lowercase')
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setItems([]);
        setLoading(false);
        return;
      }

      // Filter for published content and sort on the client side
      const allItems = snapshot.docs
        .map(doc => documentToPlainObject(doc) as Content)
        .filter(item => item.status === 'published');
        
      const sortedItems = sortContentByReleaseDate(allItems);
      setItems(sortedItems);
      
    } catch (error: any) {
        logger.error({ error, type }, 'Failed to fetch browse content.');
        let userMessage = 'Failed to load content. Please check server logs.';
        if (error instanceof FirestoreError && error.code === 'failed-precondition') {
            userMessage = 'A required database index is missing to display this content. Please create it in your Firebase console.';
        }
        toast.error('Error Loading Data', { description: userMessage });
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetchContent();
  }, [type, fetchContent]);

  if (loading) {
    return <PageGridSkeleton showTitle={false} showSubtitle={false} />;
  }
  
  if (items.length === 0) {
    return (
       <EmptyState 
          icon={Clapperboard}
          title="No content found"
          description="There is no content available in this category yet."
        />
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {items.map((item, index) => (
          <ContentCard key={item.id} content={item} priority={index < 12} />
        ))}
      </div>
    </>
  );
}
