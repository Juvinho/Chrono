import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * P-05: useInfiniteScroll Hook
 * Implements Intersection Observer pattern for lazy loading posts
 * Triggers callback when user scrolls to bottom of list
 */

interface UseInfiniteScrollProps {
  onLoadMore: () => Promise<void> | void;
  isLoading?: boolean;
  hasMore: boolean;
  threshold?: number;
}

export const useInfiniteScroll = ({
  onLoadMore,
  isLoading = false,
  hasMore,
  threshold = 0.1
}: UseInfiniteScrollProps) => {
  const observerTarget = useRef<HTMLDivElement | null>(null);
  const [isObserving, setIsObserving] = useState(false);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      
      if (entry.isIntersecting && hasMore && !isLoading && !isObserving) {
        setIsObserving(true);
        
        // Call onLoadMore and wait for it to complete
        Promise.resolve(onLoadMore()).then(() => {
          setIsObserving(false);
        }).catch((error) => {
          console.error('Error in infinite scroll:', error);
          setIsObserving(false);
        });
      }
    },
    [onLoadMore, hasMore, isLoading, isObserving]
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleIntersection, {
      threshold: threshold,
      rootMargin: '100px' // Start loading 100px before reaching bottom
    });

    const target = observerTarget.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [handleIntersection, threshold]);

  return { observerTarget };
};

export default useInfiniteScroll;
