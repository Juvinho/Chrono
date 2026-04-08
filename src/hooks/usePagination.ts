import { useState, useCallback, useEffect } from 'react';

interface UsePaginationOptions {
  initialLimit?: number;
  onError?: (error: string) => void;
}

interface PaginationState {
  items: any[];
  offset: number;
  limit: number;
  hasMore: boolean;
  isLoading: boolean;
  total: number;
}

/**
 * Custom hook for managing pagination state
 * P-05: Handles infinite scroll pagination logic
 */
export const usePagination = (
  fetchFn: (offset: number, limit: number) => Promise<{ items: any[]; hasMore: boolean; total: number }>,
  { initialLimit = 20, onError }: UsePaginationOptions = {}
) => {
  const [state, setState] = useState<PaginationState>({
    items: [],
    offset: 0,
    limit: initialLimit,
    hasMore: true,
    isLoading: false,
    total: 0,
  });

  // Load initial posts
  useEffect(() => {
    const loadInitial = async () => {
      setState(prev => ({ ...prev, isLoading: true }));
      try {
        const { items, hasMore, total } = await fetchFn(0, initialLimit);
        setState(prev => ({
          ...prev,
          items,
          hasMore,
          total,
          offset: 0,
          isLoading: false,
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load posts';
        onError?.(message);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadInitial();
  }, [fetchFn, initialLimit, onError]);

  // Load more posts
  const loadMore = useCallback(async () => {
    if (state.isLoading || !state.hasMore) return;

    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const newOffset = state.offset + state.limit;
      const { items: newItems, hasMore, total } = await fetchFn(newOffset, state.limit);
      
      setState(prev => ({
        ...prev,
        items: [...prev.items, ...newItems],
        offset: newOffset,
        hasMore,
        total,
        isLoading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load more posts';
      onError?.(message);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.offset, state.limit, state.isLoading, state.hasMore, fetchFn, onError]);

  // Reset pagination
  const reset = useCallback(() => {
    setState({
      items: [],
      offset: 0,
      limit: initialLimit,
      hasMore: true,
      isLoading: false,
      total: 0,
    });
  }, [initialLimit]);

  // Update items directly (for optimistic updates)
  const updateItems = useCallback((newItems: any[]) => {
    setState(prev => ({ ...prev, items: newItems }));
  }, []);

  return {
    ...state,
    loadMore,
    reset,
    updateItems,
  };
};
