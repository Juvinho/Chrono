import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

interface AdminUser {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  sessionId: string;
}

interface AdminContextType {
  isAuthenticated: boolean;
  admin: AdminUser | null;
  token: string | null;
  login: (password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Verifica token ao carregar
  useEffect(() => {
    const storedToken = localStorage.getItem('admin_token');
    
    if (storedToken) {
      verifyToken(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/admin/auth/verify', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          setToken(token);
          setAdmin(data.admin);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('admin_token');
        }
      } else {
        localStorage.removeItem('admin_token');
      }
    } catch (error) {
      console.error('Token verification error:', error);
      localStorage.removeItem('admin_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (password: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      const { token: newToken, admin: adminData } = data;

      setToken(newToken);
      setAdmin(adminData);
      setIsAuthenticated(true);

      localStorage.setItem('admin_token', newToken);

      navigate('/admin/dashboard');
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch('http://localhost:3001/api/admin/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setToken(null);
      setAdmin(null);
      setIsAuthenticated(false);
      localStorage.removeItem('admin_token');
      navigate('/admin/login');
    }
  };

  return (
    <AdminContext.Provider
      value={{
        isAuthenticated,
        admin,
        token,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminProvider');
  }
  return context;
}
