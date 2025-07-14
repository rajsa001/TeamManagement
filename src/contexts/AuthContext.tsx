import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Member, Admin, AuthContextType } from '../types';
import { authService } from '../services/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<(Member & { role: 'member' }) | (Admin & { role: 'admin' }) | null>(null);
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string, role: 'admin' | 'member') => {
    setLoading(true);
    try {
      let response;
      if (role === 'admin') {
        response = await authService.loginAdmin(email, password);
      } else {
        response = await authService.loginMember(email, password);
      }

      setUser(response.user);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('token', response.token);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  // Check for existing user on mount
  React.useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    
    if (savedUser && savedToken) {
      if (authService.validateToken(savedToken)) {
        setUser(JSON.parse(savedUser));
      } else {
        // Token expired, clear storage
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, []);

  const value = {
    user,
    login,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};