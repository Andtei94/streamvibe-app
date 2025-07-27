
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './use-auth';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  where,
  documentId
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Content } from '@/lib/types';
import { documentToPlainObject } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

const BATCH_SIZE = 30; // Firestore 'in' query limit

export function useMyListContent() {
  const { uid, loading: authLoading } = useAuth();
  const [myListContent, setMyListContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!uid) {
      setMyListContent([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const myListRef = collection(db, 'users', uid, 'my-list');
    const q = query(myListRef, orderBy('addedAt', 'desc'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        setMyListContent([]);
        setLoading(false);
        return;
      }
      
      const contentIds = snapshot.docs.map(doc => doc.id);

      try {
        const fetchedContent: Content[] = [];
        const contentCollectionRef = collection(db, 'content');
        // Batch the queries to handle more than 30 items
        for (let i = 0; i < contentIds.length; i += BATCH_SIZE) {
          const batchIds = contentIds.slice(i, i + BATCH_SIZE);
          if (batchIds.length > 0) {
            const contentQuery = query(contentCollectionRef, where(documentId(), 'in', batchIds));
            const contentSnapshot = await getDocs(contentQuery);
            const batchContent = contentSnapshot.docs.map(doc => documentToPlainObject(doc) as Content);
            fetchedContent.push(...batchContent);
          }
        }

        // Create a map for quick lookups and preserve the original order from myList
        const contentMap = new Map(fetchedContent.map(c => [c.id, c]));
        const finalOrderedContent = contentIds.map(id => contentMap.get(id)).filter(Boolean) as Content[];

        setMyListContent(finalOrderedContent);
      } catch (error) {
        logger.error({ error, uid }, "Failed to fetch content details for My List.");
        toast.error("Could Not Load List", {
            description: "Failed to retrieve your saved items. Please try again later."
        });
      } finally {
        setLoading(false);
      }
    }, (error) => {
      logger.error({ error, uid }, "Error fetching My List listener.");
      toast.error("Connection Error", {
            description: "Could not connect to your list data. Please check your connection."
        });
      setMyListContent([]);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [uid, authLoading]);

  return { myListContent, loading };
}
