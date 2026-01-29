
import { useState, useCallback } from 'react';

// This function checks if sessionStorage is available and accessible.
const isSessionStorageAvailable = (() => {
  let available: boolean | null = null;
  return () => {
    if (available !== null) return available;
    if (typeof window === 'undefined') {
      available = false;
      return false;
    }
    try {
      const storage = window.sessionStorage;
      if (!storage) {
        available = false;
        return false;
      }
      const key = `__storage_test__`;
      storage.setItem(key, key);
      storage.removeItem(key);
      available = true;
      return true;
    } catch (e) {
      available = false;
      return false;
    }
  };
})();

/**
 * A hook behaving like `useState` that syncs its state to `sessionStorage`.
 * Provides a stable setter function to prevent stale closures.
 */
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const readValue = (): T => {
    if (!isSessionStorageAvailable()) {
      return initialValue;
    }

    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading sessionStorage key “${key}”:`, error);
      return initialValue;
    }
  };

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Memoized setter that handles sessionStorage updates
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    setStoredValue(prev => {
      const next = value instanceof Function ? value(prev) : value;
      try {
        if (isSessionStorageAvailable()) {
          window.sessionStorage.setItem(key, JSON.stringify(next));
        }
      } catch (error) {
        // Log quota exceeded or security errors but don't crash the app
        console.warn(`Error writing to sessionStorage key “${key}”:`, error);
      }
      return next;
    });
  }, [key]);

  return [storedValue, setValue];
}

export default useLocalStorage;
