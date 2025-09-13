import React, { createContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { verifyToken, refreshToken } from './authApi';

type AuthContextType = {
  isLoading: boolean;
  userToken: string | null;
  userEmail: string | null;
  signIn: (token: string, email: string, expiresAt: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  isLoading: true,
  userToken: null,
  userEmail: null,
  signIn: async () => {},
  signOut: async () => {},
});

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const checkToken = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const email = await AsyncStorage.getItem('userEmail');
      if (token) {
        const response = await verifyToken();
        if (!response.success) {
          const refreshResponse = await refreshToken();
          if (!refreshResponse.success) {
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userEmail');
            await AsyncStorage.removeItem('tokenExpires');
            setUserToken(null);
            setUserEmail(null);
          } else {
            setUserToken(token);
            setUserEmail(email);
          }
        } else {
          setUserToken(token);
          setUserEmail(email);
        }
      } else {
        setUserToken(null);
        setUserEmail(null);
      }
    } catch (e) {
      console.error('Error during authentication check:', e);
      setUserToken(null);
      setUserEmail(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkToken();
  }, [checkToken]);

  const signIn = useCallback(async (token: string, email: string, expiresAt: string) => {
    setIsLoading(true);
    await AsyncStorage.setItem('userToken', token);
    await AsyncStorage.setItem('userEmail', email);
    await AsyncStorage.setItem('tokenExpires', expiresAt);
    setUserToken(token);
    setUserEmail(email);
    setIsLoading(false);
  }, []);

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Clear all auth-related storage
      await Promise.all([
        AsyncStorage.removeItem('userToken'),
        AsyncStorage.removeItem('userEmail'),
        AsyncStorage.removeItem('tokenExpires'),
        AsyncStorage.removeItem('authMethod')
      ]);
      
      // Clear state
      setUserToken(null);
      setUserEmail(null);
    } catch (error) {
      console.error('Error during sign out:', error);
      // Even if there's an error, clear the state
      setUserToken(null);
      setUserEmail(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, userToken, userEmail, signIn, signOut };
};