
'use client';

import { useCallback } from 'react';
import { useAuth } from './use-auth';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import type { PlaybackProgress } from '@/lib/types';
import { logger } from '@/lib/logger';

export function usePlaybackProgress() {
  const { uid } = useAuth();

  const saveProgress = useCallback(
    async (contentId: string, currentTime: number, duration: number) => {
      if (!uid || !contentId || isNaN(currentTime) || isNaN(duration) || duration === 0) {
        return;
      }
      
      const progressRef = doc(db, 'users', uid, 'playbackProgress', contentId);
      
      const progressPercent = Math.round((currentTime / duration) * 100);
      
      if (progressPercent > 95) {
        try {
          const docSnap = await getDoc(progressRef);
          if (docSnap.exists()) {
            await deleteDoc(progressRef);
          }
        } catch (error) {
          logger.error({ error, contentId, uid }, 'Failed to delete finished playback progress');
        }
        return;
      }

      if (progressPercent < 2) {
        return;
      }
      
      const payload: Omit<PlaybackProgress, 'id'> = {
        progressPercent,
        lastWatchedSeconds: currentTime,
        contentDuration: duration,
        lastWatchedTimestamp: new Date(),
      };

      try {
        await setDoc(progressRef, payload, { merge: true });
      } catch (error) {
        logger.error({ error, contentId, uid }, 'Failed to save playback progress');
      }
    },
    [uid]
  );

  const getInitialProgress = useCallback(
    async (contentId: string): Promise<number | null> => {
      if (!uid || !contentId) {
        return null;
      }
      const progressRef = doc(db, 'users', uid, 'playbackProgress', contentId);
      try {
        const docSnap = await getDoc(progressRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as PlaybackProgress;
          if (data.progressPercent > 95) {
              return null;
          }
          return data.lastWatchedSeconds || 0;
        }
        return null;
      } catch (error) {
        logger.error({ error, contentId, uid }, 'Failed to get playback progress');
        return null;
      }
    },
    [uid]
  );

  return { saveProgress, getInitialProgress };
}
