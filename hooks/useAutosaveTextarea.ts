
import React, { useState, useEffect, useCallback, useRef } from 'react';

// Debounce helper function
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

const isSessionStorageAvailable = (() => {
  let available: boolean | null = null;
  return () => {
    if (available !== null) return available;
    if (typeof window === 'undefined') return false;
    try {
      const storage = window.sessionStorage;
      if (!storage) return false;
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

function useAutosaveTextarea(key: string, initialValue: string): [string, React.Dispatch<React.SetStateAction<string>>, boolean] {
  const [wasRestored, setWasRestored] = useState(false);

  const readInitial = () => {
    if (!isSessionStorageAvailable()) return initialValue;
    try {
      const item = window.sessionStorage.getItem(key);
      if (item) {
        if (item.length > 0) setWasRestored(true);
        return item;
      }
      return initialValue;
    } catch (error) {
      console.warn(`Error reading sessionStorage key “${key}”:`, error);
      return initialValue;
    }
  };

  const [value, setValue] = useState(readInitial);
  const debouncedValue = useDebounce(value, 1000);
  const prevValueRef = useRef(value);

  // Sync storage on debounce OR immediately if cleared
  useEffect(() => {
    if (!isSessionStorageAvailable()) return;

    // Special case: if the value was explicitly cleared, bypass debounce to ensure reset works instantly
    if (value === '' && prevValueRef.current !== '') {
      window.sessionStorage.setItem(key, '');
    } else {
      try {
        window.sessionStorage.setItem(key, debouncedValue);
      } catch (error) {
        console.warn(`Error autosaving to sessionStorage:`, error);
      }
    }
    prevValueRef.current = value;
  }, [key, debouncedValue, value]);

  useEffect(() => {
    if (wasRestored) {
      const timer = setTimeout(() => setWasRestored(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [wasRestored]);

  return [value, setValue, wasRestored];
}

export default useAutosaveTextarea;
