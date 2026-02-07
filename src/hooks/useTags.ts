import { useState, useEffect } from 'react';
import { UserTag } from '../types/index';
import { apiClient } from '../api/client';

/**
 * Hook para carregar tags de um usuário
 */
export function useUserTags(userId: string | null) {
  const [tags, setTags] = useState<UserTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setTags([]);
      return;
    }

    const fetchTags = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/tags/user/${userId}`);
        setTags(response.data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching user tags:', err);
        setError('Failed to load tags');
        setTags([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTags();
  }, [userId]);

  return { tags, loading, error };
}

/**
 * Hook para carregar definições de tags
 */
export function useTagDefinitions() {
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDefinitions = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/tags/definitions');
        setDefinitions(response.data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching tag definitions:', err);
        setError('Failed to load tag definitions');
        setDefinitions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDefinitions();
  }, []);

  return { definitions, loading, error };
}

/**
 * Hook para buscar tags de uma categoria específica
 */
export function useTagsByCategory(categoria: string) {
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!categoria) {
      setTags([]);
      return;
    }

    const fetchTags = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/tags/definitions/category/${categoria}`);
        setTags(response.data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching tags by category:', err);
        setError('Failed to load tags');
        setTags([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTags();
  }, [categoria]);

  return { tags, loading, error };
}
