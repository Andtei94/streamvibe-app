
'use client';

import { collection, getDocs, query, where, orderBy, FirestoreError } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Content } from '@/lib/types';
import { documentToPlainObject } from '@/lib/utils';
import CollectionsClient from './client';
import { FolderKanban } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import CollectionsClientLoading from './loading';

export interface CollectionGroup {
  name: string;
  items: Content[];
}

export interface CollectionsIndex {
    [letter: string]: CollectionGroup[];
}

export default function CollectionsPage() {
  const [collectionsIndex, setCollectionsIndex] = useState<CollectionsIndex | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getCollectionsIndex = async (): Promise<void> => {
        setLoading(true);
        try {
            const contentCollectionRef = collection(db, 'content');
            const q = query(contentCollectionRef, where('collection', '!=', ''), orderBy('collection'), orderBy('releaseDate', 'asc'));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                setCollectionsIndex({});
                setLoading(false);
                return;
            }
            
            const allContentWithCollection = snapshot.docs.map(doc => documentToPlainObject(doc) as Content);

            const groupedByName = allContentWithCollection.reduce((acc, item) => {
                const collectionName = item.collection!;
                if (!acc[collectionName]) {
                acc[collectionName] = [];
                }
                acc[collectionName].push(item);
                return acc;
            }, {} as Record<string, Content[]>);

            const collections: CollectionGroup[] = Object.entries(groupedByName).map(([name, items]) => ({
                name,
                items
            }));

            const sortedCollections = [...collections].sort((a, b) => a.name.localeCompare(b.name));

            const index = sortedCollections.reduce((acc, collection) => {
                const firstLetter = collection.name.charAt(0).toUpperCase();
                if (!acc[firstLetter]) {
                    acc[firstLetter] = [];
                }
                acc[firstLetter].push(collection);
                return acc;
            }, {} as CollectionsIndex);

            setCollectionsIndex(index);
        } catch(error) {
            logger.error({ error }, "Failed to fetch collections index.");
            if (error instanceof FirestoreError) {
                toast.error('Error Loading Collections', { description: `Database Error: ${error.code}. This may require a composite index.` });
            } else {
                toast.error('Error Loading Collections', { description: 'Could not retrieve collections data.' });
            }
            setCollectionsIndex({});
        } finally {
            setLoading(false);
        }
    };

    getCollectionsIndex();
  }, []);

  const hasCollections = !loading && collectionsIndex && Object.keys(collectionsIndex).length > 0;

  return (
    <div className="container mx-auto py-10 min-h-[70vh]">
      <h1 className="text-3xl font-bold font-headline mb-2">Collections</h1>
       <p className="text-muted-foreground mb-8">
        An ever-expanding archive of cinematic universes, series, and sagas.
      </p>
      
      {loading ? (
        <CollectionsClientLoading />
      ) : hasCollections ? (
        <CollectionsClient loading={false} collectionsIndex={collectionsIndex} />
      ) : (
        <EmptyState
            icon={FolderKanban}
            title="No Collections Found"
            description="Content has not been grouped into collections yet. Go to the admin panel to edit items and assign them to a collection."
            action={
                <Button asChild>
                    <Link href="/admin">Go to Content Management</Link>
                </Button>
            }
        />
      )}
    </div>
  );
}
