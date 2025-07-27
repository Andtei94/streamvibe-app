
'use client';

import { collection, getDocs, query, where, orderBy, FirestoreError } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Content } from '@/lib/types';
import { documentToPlainObject } from '@/lib/utils';
import { ContentCard } from '@/components/content-card';
import { Library } from 'lucide-react';
import { useState, useEffect } from 'react';
import { EmptyState } from '@/components/empty-state';
import { logger } from '@/lib/logger';
import validator from 'validator';
import { toast } from 'sonner';
import { PageGridSkeleton } from '@/components/page-grid-skeleton';

const sortCollectionItems = (items: Content[]): Content[] => {
    return [...items].sort((a, b) => {
        if (a.type === 'tv-show' && b.type === 'tv-show') {
            const seasonA = a.seasonNumber || 0;
            const seasonB = b.seasonNumber || 0;
            if (seasonA !== seasonB) return seasonA - seasonB;
            
            const episodeA = a.episodeNumber || 0;
            const episodeB = b.episodeNumber || 0;
            if (episodeA !== episodeB) return episodeA - episodeB;
        }
        try {
            if (typeof a.releaseDate !== 'string' || typeof b.releaseDate !== 'string' || isNaN(Date.parse(a.releaseDate)) || isNaN(Date.parse(b.releaseDate))) {
                 return 0;
            }
            const dateA = new Date(a.releaseDate).getTime();
            const dateB = new Date(b.releaseDate).getTime();
            return dateA - dateB;
        } catch (e: any) {
             logger.error({ error: e, itemIdA: a.id, itemIdB: b.id, dateA: a.releaseDate, dateB: b.releaseDate }, `Date parsing failed during sort`);
             return 0;
        }
    });
};

export default function CollectionDetailsPage({ params }: { params: { name: string } }) {
  const collectionName = decodeURIComponent(params.name);
  const [items, setItems] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getCollectionByName = async (name: string): Promise<void> => {
      setLoading(true);
      setError(null);

      if (!name) {
          setItems([]);
          setLoading(false);
          return;
      }
      const sanitizedName = validator.trim(validator.escape(decodeURIComponent(name)));
      if (!sanitizedName) {
          setItems([]);
          setLoading(false);
          return;
      }
      
      try {
        const contentCollectionRef = collection(db, 'content');
        const q = query(contentCollectionRef, where('collection', '==', sanitizedName));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setItems([]);
        } else {
            const fetchedItems = snapshot.docs.map(doc => documentToPlainObject(doc) as Content);
            setItems(sortCollectionItems(fetchedItems));
        }
      } catch (err: any) {
        logger.error({ error: err, collectionName: sanitizedName }, `Failed to fetch content for collection.`);
        const errorMessage = err instanceof FirestoreError ? `Database error: ${err.code}` : 'An unexpected error occurred.';
        setError(errorMessage);
        toast.error('Failed to Load Collection', { description: errorMessage });
      } finally {
        setLoading(false);
      }
    };
    
    getCollectionByName(params.name);

  }, [params.name]);


  if (loading) {
    return <PageGridSkeleton showSubtitle={true} itemCount={12} />;
  }

  if (error) {
     return (
        <div className="container mx-auto py-10 min-h-[70vh]">
            <EmptyState 
                icon={Library}
                title="Could Not Load Collection"
                description={error || `An error occurred while trying to load the "${collectionName}" collection.`}
            />
        </div>
    );
  }

  return (
    <div className="container mx-auto py-10 min-h-[70vh]">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase text-primary tracking-widest">Collection</p>
        <h1 className="text-4xl lg:text-5xl font-bold font-headline mt-1">{collectionName}</h1>
      </div>
      
      {items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map((item, index) => (
            <ContentCard key={item.id} content={item} priority={index < 12} />
          ))}
        </div>
      ) : (
        <EmptyState 
            icon={Library}
            title="No content found in this collection"
            description={`There are no items currently assigned to the "${collectionName}" collection.`}
        />
      )}
    </div>
  );
}
