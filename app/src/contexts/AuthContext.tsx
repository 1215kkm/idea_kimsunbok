"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, isConfigured } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isDemo: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Firebase 미설정 시 데모 유저
const DEMO_USER = {
  uid: "demo-user",
  displayName: "체험 사용자",
  email: "demo@dataland.kr",
} as unknown as User;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured || !auth) {
      // Firebase 미설정: 데모 모드
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    if (!isConfigured || !auth) {
      // 데모 모드: 바로 로그인
      setUser({ ...DEMO_USER, displayName: name } as User);
      return;
    }
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    if (db) {
      await setDoc(doc(db, "users", cred.user.uid), {
        name,
        email,
        role: "consumer",
        membershipLevel: 1,
        totalPoints: 0,
        createdAt: serverTimestamp(),
      });
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!isConfigured || !auth) {
      setUser(DEMO_USER);
      return;
    }
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    if (!isConfigured || !auth) {
      setUser(null);
      return;
    }
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isDemo: !isConfigured, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
