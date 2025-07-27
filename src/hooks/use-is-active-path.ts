
'use client';

import { usePathname } from 'next/navigation';
import { useCallback } from 'react';

export function useIsActivePath() {
  const currentPathname = usePathname();

  const checkIsActive = useCallback(
    (path: string): boolean => {
      if (!currentPathname) return false;
      
      // Handle exact match for the homepage
      if (path === '/') {
        return currentPathname === '/';
      }
      
      // Check for exact match or if it's a parent route
      // This will match '/browse' for paths like '/browse/movie'
      return currentPathname.startsWith(path);
    },
    [currentPathname]
  );

  return checkIsActive;
}
