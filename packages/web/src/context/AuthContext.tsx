import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import { apolloClient } from '../lib/apollo';
import { gql } from '@apollo/client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'user';

export interface AppUser {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  isActive: boolean;
}

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  appUser: AppUser | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// ─── GraphQL ──────────────────────────────────────────────────────────────────

const ME_QUERY = gql`
  query Me {
    me {
      id firebaseUid email displayName photoURL role isActive
    }
  }
`;

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch the user profile from our backend (MongoDB via GraphQL)
  const fetchAppUser = async () => {
    try {
      const { data } = await apolloClient.query({ query: ME_QUERY, fetchPolicy: 'network-only' });
      setAppUser(data.me);
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      setAppUser(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        await fetchAppUser();
      } else {
        setAppUser(null);
        apolloClient.clearStore();
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will fire and call fetchAppUser
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
    apolloClient.clearStore();
    setAppUser(null);
    setFirebaseUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        appUser,
        loading,
        isAdmin: appUser?.role === 'admin',
        signInWithGoogle,
        signInWithEmail,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
