
'use client';

import React, { useState, useEffect, createContext, useContext, useMemo, useCallback } from 'react';
import { onIdTokenChanged, type User, signOut, type AuthError, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInAnonymously } from "firebase/auth";
import { auth as firebaseAuth, firebaseConfigError } from '@/lib/firebase';
import { setAdminClaim as makeAdmin, checkAdminSdkStatus } from '@/ai/actions';
import { logger } from '@/lib/logger';
import { useRouter, usePathname } from 'next/navigation';

interface AuthUser {
  name: string;
  email: string | null;
  isAdmin: boolean;
  isAnonymous: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  uid: string | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  isAdminSdkConfigured: boolean;
  logout: () => void;
  attemptLoginAsAdmin: () => Promise<{success: boolean, message: string}>;
  login: (email:string, password:string) => Promise<{success: boolean, message: string}>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdminSdkConfigured, setIsAdminSdkConfigured] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    if (firebaseConfigError) {
      setError(firebaseConfigError);
      setLoading(false);
      return;
    }
    
    if (!firebaseAuth) {
        setError("Firebase Auth service is not available.");
        setLoading(false);
        return;
    }

    const unsubscribe = onIdTokenChanged(firebaseAuth, async (fbUser) => {
      setError(null);
      setLoading(true);

      if (fbUser) {
        setFirebaseUser(fbUser);
        try {
          const idTokenResult = await fbUser.getIdTokenResult();
          const isAdmin = !!idTokenResult.claims.admin;
          setCurrentUser({
              name: fbUser.isAnonymous ? 'Guest User' : (fbUser.displayName || fbUser.email || 'User'),
              email: fbUser.email,
              isAdmin,
              isAnonymous: fbUser.isAnonymous,
          });
          
          if (pathname === '/login') {
            router.push('/');
          }

        } catch (tokenError: any) {
           logger.error({ error: tokenError }, "Failed to get ID token result.");
           setError("Failed to verify user session. Please try refreshing the page.");
           setCurrentUser(null);
        } finally {
            setLoading(false);
        }
      } else {
        // No user is signed in, redirect to login page unless already there
        setFirebaseUser(null);
        setCurrentUser(null);
        setLoading(false);
        if (pathname !== '/login') {
            router.push('/login');
        }
      }
    });
    
    checkAdminSdkStatus().then(status => {
        setIsAdminSdkConfigured(status.isConfigured);
    }).catch(e => {
        logger.error({error: e}, "Failed to check Admin SDK status");
    });

    return () => unsubscribe();
  }, [pathname, router]);
  
  const logout = useCallback(async () => {
      if (firebaseAuth) {
          await signOut(firebaseAuth);
          setCurrentUser(null);
          setFirebaseUser(null);
          router.push('/login');
      }
  }, [router]);

  const attemptLoginAsAdmin = useCallback(async (): Promise<{success: boolean, message: string}> => {
    if (!firebaseUser) {
        return { success: false, message: "User not authenticated yet." };
    }
    
    if (!isAdminSdkConfigured) {
       return { success: false, message: "Admin SDK not configured. Follow setup in Settings > Diagnostics." };
    }
    
    try {
        const result = await makeAdmin({ uid: firebaseUser.uid });
        if (result.success) {
            await firebaseUser.getIdToken(true);
        }
        return result;
    } catch (e: any) {
        return { success: false, message: e.message || "An unknown error occurred during the request." };
    }
  }, [firebaseUser, isAdminSdkConfigured]);
  
  const login = useCallback(async (email: string, password: string): Promise<{success: boolean, message: string}> => {
    if(!firebaseAuth) return { success: false, message: 'Auth not initialized.' };
    try {
        await signInWithEmailAndPassword(firebaseAuth, email, password);
        return { success: true, message: 'Logged in successfully!' };
    } catch (error: any) {
        if(error.code === 'auth/user-not-found') {
             try {
                await createUserWithEmailAndPassword(firebaseAuth, email, password);
                return { success: true, message: 'Account created and logged in!' };
             } catch (createError: any) {
                return { success: false, message: `Sign up failed: ${createError.message}` };
             }
        }
        return { success: false, message: `Login failed: ${error.message}` };
    }
  }, []);

  const value = useMemo(() => ({ 
    user: currentUser,
    uid: firebaseUser?.uid || null,
    isAdmin: currentUser?.isAdmin || false,
    loading,
    error,
    isAdminSdkConfigured,
    logout,
    attemptLoginAsAdmin,
    login,
  }), [currentUser, firebaseUser, loading, error, isAdminSdkConfigured, logout, attemptLoginAsAdmin, login]);

  return React.createElement(
    AuthContext.Provider,
    { value: value },
    children
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
