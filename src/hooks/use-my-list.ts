
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './use-auth';
import { db } from '@/lib/firebase';
import { 
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { logger } from '@/lib/logger';

export function useMyList() {
  const { uid, loading: authLoading } = useAuth();
  const [rawIds, setRawIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    };
    if (!uid) {
      setRawIds([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const userListCollectionRef = collection(db, 'users', uid, 'my-list');
    const q = query(userListCollectionRef, orderBy('addedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ids = snapshot.docs.map(doc => doc.id);
      setRawIds(ids);
      setLoading(false);
    }, (error) => {
      logger.error({ error, uid }, "Error fetching My List listener.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [uid, authLoading]);

  const myListIds = useMemo(() => new Set(rawIds), [rawIds]);

  const addToMyList = useCallback(async (contentId: string) => {
    if (!uid || !contentId) return;
    const docRef = doc(db, 'users', uid, 'my-list', contentId);
    await setDoc(docRef, { addedAt: serverTimestamp() });
  }, [uid]);

  const removeFromMyList = useCallback(async (contentId: string) => {
    if (!uid || !contentId) return;
    const docRef = doc(db, 'users', uid, 'my-list', contentId);
    await deleteDoc(docRef);
  }, [uid]);
  
  const isInMyList = useCallback((contentId: string) => {
    return myListIds.has(contentId);
  }, [myListIds]);

  return { myListIds, addToMyList, removeFromMyList, isInMyList, loading };
}
