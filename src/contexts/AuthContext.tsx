import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from '../api/client';
import { decodeJwt, isTokenExpired } from '../utils/jwt';
import { JWTCustomClaims, UserRole, ChangePasswordRequest } from '../api/types';
import { APP_CONFIG } from '../constants/config';

interface AuthContextType {
  token: string | null;
  user: JWTCustomClaims | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  apiBaseUrl: string;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, phone: string, password: string) => Promise<void>;
  changePassword: (data: ChangePasswordRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<JWTCustomClaims | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(APP_CONFIG.tokenStorageKey);
        if (storedToken) {
          const claims = decodeJwt(storedToken);
          if (claims && !isTokenExpired(claims)) {
            setToken(storedToken);
            setUser(claims);
            api.setToken(storedToken);
          } else {
            // Token expired or invalid
            await SecureStore.deleteItemAsync(APP_CONFIG.tokenStorageKey);
          }
        }
      } catch (error) {
        console.error('Error restoring auth token:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.login(email.trim(), password);
    const claims = decodeJwt(response.token);
    if (!claims) {
      throw new Error('Received invalid token from server');
    }
    await SecureStore.setItemAsync(APP_CONFIG.tokenStorageKey, response.token);
    setToken(response.token);
    setUser(claims);
    api.setToken(response.token);
  };

  const register = async (name: string, email: string, phone: string, password: string) => {
    await api.register({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
    });
    // Auto-login after registration
    await login(email, password);
  };

  const changePassword = async (data: ChangePasswordRequest) => {
    await api.changePassword(data);
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync(APP_CONFIG.tokenStorageKey);
    } catch (e) {
      console.warn('Error clearing token from secure store:', e);
    }
    setToken(null);
    setUser(null);
    api.setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        role: user ? user.role : null,
        isAuthenticated: !!token && !!user && !isTokenExpired(user),
        isLoading,
        apiBaseUrl: APP_CONFIG.apiBaseUrl,
        login,
        register,
        changePassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
