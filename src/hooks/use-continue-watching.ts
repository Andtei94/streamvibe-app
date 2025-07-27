
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './use-auth';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, getDocs, where, documentId, limit } from 'firebase/firestore';
import type { Content, PlaybackProgress } from '@/lib/types';
import { documentToPlainObject } from '@/lib/utils';
import { logger } from '@/lib/logger';

const CONTINUE_WATCHING_LIMIT = 18;

export function useContinueWatching() {
  const { uid, loading: authLoading } = useAuth();
  const [continueWatchingItems, setContinueWatchingItems] = useState<(Content & PlaybackProgress)[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!uid) {
      setContinueWatchingItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const progressCollectionRef = collection(db, 'users', uid, 'playbackProgress');
    const q = query(progressCollectionRef, orderBy('lastWatchedTimestamp', 'desc'), limit(CONTINUE_WATCHING_LIMIT));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        setContinueWatchingItems([]);
        setLoading(false);
        return;
      }

      const progressData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<PlaybackProgress, 'id'>) }));
      const contentIds = progressData.map(p => p.id);

      if (contentIds.length === 0) {
        setContinueWatchingItems([]);
        setLoading(false);
        return;
      }

      const contentCollectionRef = collection(db, 'content');
      const contentQuery = query(contentCollectionRef, where(documentId(), 'in', contentIds));
      const contentSnapshot = await getDocs(contentQuery);
      const fetchedContent = contentSnapshot.docs.map(doc => documentToPlainObject(doc) as Content);

      const contentMap = new Map(fetchedContent.map(c => [c.id, c]));
      const progressMap = new Map(progressData.map(p => [p.id, p]));

      const finalItems = contentIds
        .map(id => {
          const content = contentMap.get(id);
          const progress = progressMap.get(id);
          if (content && progress) {
            // Filter out items that are practically finished
            if (progress.progressPercent > 95) return null;
            return {
              ...content,
              ...progress,
            };
          }
          return null;
        })
        .filter(Boolean) as (Content & PlaybackProgress)[];

      setContinueWatchingItems(finalItems);
      setLoading(false);
    }, (error) => {
      logger.error({ error }, "Error fetching continue watching list:", error);
      setContinueWatchingItems([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid, authLoading]);

  return { continueWatchingItems, loading };
}
