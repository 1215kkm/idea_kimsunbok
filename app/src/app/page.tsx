"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { user, loading, signIn, signUp, demoSignIn } = useAuth();
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) router.push("/dashboard");
  }, [user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-zinc-500">로딩 중...</div>
      </div>
    );
  }

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (isSignUp) {
        await signUp(email, password, name);
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      const code = err?.code || "";
      if (code === "auth/user-not-found" || code === "auth/invalid-credential")
        setError("이메일 또는 비밀번호가 틀렸습니다.");
      else if (code === "auth/email-already-in-use")
        setError("이미 가입된 이메일입니다.");
      else if (code === "auth/weak-password")
        setError("비밀번호는 6자 이상이어야 합니다.");
      else setError("오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      {/* 로고 */}
      <div className="mb-2 text-sm tracking-widest dark-text-muted text-zinc-500">비선형공식 리워드 플랫폼</div>
      <h1 className="mb-1 bg-gradient-to-r from-cyan-400 via-purple-500 to-rose-400 bg-clip-text text-5xl font-black text-transparent">
        다랜드
      </h1>
      <p className="mb-10 text-sm dark-text-muted text-zinc-500">쓸수록 쌓이는 120%의 마법</p>

      {/* 폼 */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {isSignUp && (
          <input
            type="text"
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="dark-input w-full rounded-xl border border-purple-900/30 bg-[#14143c] px-4 py-3.5 text-sm placeholder-zinc-500 outline-none focus:border-purple-500"
          />
        )}
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="dark-input w-full rounded-xl border border-purple-900/30 bg-[#14143c] px-4 py-3.5 text-sm placeholder-zinc-500 outline-none focus:border-purple-500"
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="dark-input w-full rounded-xl border border-purple-900/30 bg-[#14143c] px-4 py-3.5 text-sm placeholder-zinc-500 outline-none focus:border-purple-500"
        />

        {error && <p className="text-center text-sm text-rose-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-500/20 transition-transform hover:scale-[1.02] disabled:opacity-50"
        >
          {submitting ? "처리 중..." : isSignUp ? "회원가입" : "로그인"}
        </button>
      </form>

      <button
        onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
        className="mt-6 text-sm dark-text-muted text-zinc-500 hover:text-purple-400"
      >
        {isSignUp ? "이미 계정이 있으신가요? 로그인" : "계정이 없으신가요? 회원가입"}
      </button>

      {/* 데모 로그인 */}
      <div className="mt-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-zinc-700" />
          <span className="text-xs text-zinc-500">또는</span>
          <div className="h-px flex-1 bg-zinc-700" />
        </div>
        <button
          onClick={async () => {
            setSubmitting(true);
            setError("");
            try {
              await demoSignIn();
            } catch {
              setError("데모 로그인에 실패했습니다.");
            } finally {
              setSubmitting(false);
            }
          }}
          disabled={submitting}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-800/50 py-3.5 text-sm font-medium text-zinc-300 transition-all hover:border-purple-500/50 hover:bg-zinc-800 hover:text-white disabled:opacity-50"
        >
          🎮 데모 아이디로 체험하기
        </button>
        <p className="mt-2 text-center text-xs text-zinc-600">가입 없이 바로 둘러볼 수 있어요</p>
      </div>
    </div>
  );
}
