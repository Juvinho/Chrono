import { useState, useEffect } from 'react';
import { api } from '@/api/client';

interface UserTag {
  key: string;
  displayName: string;
  description: string;
  color: string;
  icon: string | null;
  type: string;
  earnedAt: string;
}

interface UserBioData {
  customBio: string | null;
  autoBio: string;
  tags: UserTag[];
}

export function useBio(userId: string | null) {
  const [bioData, setBioData] = useState<UserBioData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const fetchBio = async () => {
      try {
        setIsLoading(true);
        const response = await api.get<UserBioData>(`/bio/${userId}/bio`);
        setBioData(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching bio:', err);
        setError('Failed to load bio');
        // Return default data instead of failing
        setBioData({
          customBio: null,
          autoBio: 'Novo usuário explorando o Chrono.',
          tags: [],
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchBio();
  }, [userId]);

  const refreshTags = async () => {
    if (!userId) return;
    
    try {
      const response = await api.post<{ tags: UserTag[] }>(`/bio/${userId}/bio/refresh`);
      if (bioData) {
        setBioData({
          ...bioData,
          tags: response.data.tags,
        });
      }
    } catch (err) {
      console.error('Error refreshing tags:', err);
      throw err;
    }
  };

  return {
    bioData,
    isLoading,
    error,
    refreshTags,
  };
}
