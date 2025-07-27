
'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { LOCAL_STORAGE_PLAYER_PREFERENCES_KEY } from '@/lib/constants';

function useLocalStorage<T>(key: string, initialValue: T | (() => T)): [T, (value: T | ((val: T) => T)) => void] {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
      setIsClient(true);
  }, []);

  const readValue = useCallback(() => {
    if (!isClient) {
      return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      logger.warn({ error, key }, `Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  }, [isClient, key, initialValue]);
  
  const [storedValue, setStoredValue] = useState<T>(readValue);

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      if (!isClient) {
        logger.warn(`Tried to set localStorage key “${key}” on the server.`);
        return;
      }
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        logger.error({ error, key }, `Error setting localStorage key “${key}”:`, error);
      }
    },
    [isClient, key, storedValue]
  );
  
  useEffect(() => {
    setStoredValue(readValue());
  }, [readValue]);

  useEffect(() => {
    if (!isClient) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        setStoredValue(readValue());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isClient, key, readValue]);


  return [storedValue, setValue];
}

export { useLocalStorage };
