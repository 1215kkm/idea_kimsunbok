"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  sendEmailVerification,
} from "firebase/auth";
import { auth, isConfigured } from "@/lib/firebase";
import { apiPost } from "@/lib/api-client";

interface SignUpResult {
  inviteRedeemed: boolean;
  inviteError: string | null;
  totalPoints: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isDemo: boolean;
  signUp: (
    email: string,
    password: string,
    name: string,
    inviteCode?: string | null,
    betaConsent?: boolean,
  ) => Promise<SignUpResult>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  demoSignIn: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

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
      try {
        const saved = localStorage.getItem("daland-demo-user");
        if (saved) {
          const parsed = JSON.parse(saved);
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setUser({ ...DEMO_USER, displayName: parsed.displayName, email: parsed.email } as User);
        }
      } catch {
        // ignore
      }
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signUp: AuthContextType["signUp"] = async (email, password, name, inviteCode, betaConsent) => {
    if (!isConfigured || !auth) {
      const demoUser = { ...DEMO_USER, displayName: name, email } as User;
      setUser(demoUser);
      localStorage.setItem("daland-demo-user", JSON.stringify({ displayName: name, email }));
      return { inviteRedeemed: false, inviteError: null, totalPoints: 0 };
    }
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    // 가입 리워드는 email_verified 가 true 여야 지급된다 (reward-service 게이트). 메일 실패는 가입을 막지 않는다.
    try {
      await sendEmailVerification(cred.user);
    } catch (err) {
      console.error("[auth] sendEmailVerification failed", err);
    }
    // Force fresh ID token, then call server to provision the user document.
    await cred.user.getIdToken(true);
    try {
      const res = await apiPost<{
        ok: boolean;
        totalPoints: number;
        inviteRedeemed: boolean;
        inviteError: string | null;
      }>("/api/auth/post-signup", {
        name,
        inviteCode: inviteCode ?? undefined,
        betaConsent: betaConsent === true,
      });
      return {
        inviteRedeemed: res.inviteRedeemed,
        inviteError: res.inviteError,
        totalPoints: res.totalPoints,
      };
    } catch (err) {
      console.error("[auth] post-signup failed", err);
      return { inviteRedeemed: false, inviteError: "INTERNAL", totalPoints: 0 };
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!isConfigured || !auth) {
      const demoUser = { ...DEMO_USER, email } as User;
      setUser(demoUser);
      localStorage.setItem("daland-demo-user", JSON.stringify({ displayName: DEMO_USER.displayName, email }));
      return;
    }
    await signInWithEmailAndPassword(auth, email, password);
  };

  const demoSignIn = async () => {
    const demoUser = { ...DEMO_USER } as User;
    setUser(demoUser);
    localStorage.setItem("daland-demo-user", JSON.stringify({ displayName: DEMO_USER.displayName, email: DEMO_USER.email }));
  };

  const signOut = async () => {
    if (!isConfigured || !auth) {
      setUser(null);
      localStorage.removeItem("daland-demo-user");
      return;
    }
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isDemo: !isConfigured, signUp, signIn, signOut, demoSignIn }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
