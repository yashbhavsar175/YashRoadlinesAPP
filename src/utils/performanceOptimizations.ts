// Performance Optimization Utilities
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import React from 'react';

/**
 * Custom hook for debouncing values
 * Prevents excessive re-renders and API calls
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
}

/**
 * Custom hook for throttling function calls
 * Limits execution frequency for performance
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());
  
  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastRun.current >= delay) {
        lastRun.current = now;
        return callback(...args);
      }
    },
    [callback, delay]
  ) as T;
}

/**
 * Custom hook for safe async operations with cleanup
 * Prevents memory leaks from unmounted components
 */
export function useSafeAsync() {
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  const safeAsync = useCallback(async <T,>(
    asyncFn: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: any) => void
  ) => {
    try {
      const result = await asyncFn();
      if (isMountedRef.current && onSuccess) {
        onSuccess(result);
      }
      return result;
    } catch (error) {
      if (isMountedRef.current && onError) {
        onError(error);
      }
      throw error;
    }
  }, []);
  
  return { safeAsync, isMounted: () => isMountedRef.current };
}

/**
 * FlatList optimization configuration
 * Improves list rendering performance
 */
export const FLATLIST_OPTIMIZATIONS = {
  // Remove views that are off-screen
  removeClippedSubviews: true,
  // Render items in batches
  maxToRenderPerBatch: 10,
  // Update cells in batches
  updateCellsBatchingPeriod: 50,
  // Initial number of items to render
  initialNumToRender: 15,
  // Window size for rendering
  windowSize: 5,
};

/**
 * Memoization helper for expensive computations
 */
export function useMemoizedComputation<T>(
  computation: () => T,
  dependencies: React.DependencyList
): T {
  return useMemo(computation, dependencies);
}

/**
 * Cleanup helper for subscriptions
 */
export function useSubscriptionCleanup(
  subscribe: () => (() => void) | void,
  dependencies: React.DependencyList = []
) {
  useEffect(() => {
    const unsubscribe = subscribe();
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, dependencies);
}

/**
 * Responsive scaling with memoization
 */
export function useResponsiveScale(baseWidth: number = 375) {
  return useMemo(() => {
    const { width } = require('react-native').Dimensions.get('window');
    const scaleFactor = width / baseWidth;
    return (size: number) => Math.round(size * scaleFactor);
  }, [baseWidth]);
}
