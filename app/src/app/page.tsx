"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import {
  resolveInviteCode,
  processInviteReward,
} from "@/lib/demo-store";
import { calculateInviteReward } from "@/lib/nonlinear-engine";

function LoginPageInner() {
  const { user, loading, signIn, signUp, demoSignIn, isDemo } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("invite");
  const inviteAmtParam = searchParams.get("amt");
  const inviteAmount = (() => {
    const n = inviteAmtParam ? parseInt(inviteAmtParam, 10) : 100_000;
    return Number.isFinite(n) && n > 0 ? n : 100_000;
  })();
  const [isSignUp, setIsSignUp] = useState(!!inviteCode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [inviteProcessed, setInviteProcessed] = useState(false);

  useEffect(() => {
    if (!user || inviteProcessed) return;
    if (inviteCode && user.email) {
      const inviterEmail = resolveInviteCode(inviteCode);
      if (inviterEmail && inviterEmail !== user.email.toLowerCase()) {
        const reward = calculateInviteReward(inviteAmount);
        processInviteReward(
          inviterEmail,
          user.email,
          reward.distributedToNewUser,
          reward.advertiserNetGain,
        );
        setInviteProcessed(true);
      }
    }
    router.push("/dashboard");
  }, [user, router, inviteCode, inviteAmount, inviteProcessed]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg text-[#6B7394]">로딩 중...</div>
      </div>
    );
  }

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    // 클라이언트 측 기본 검증
    if (!email.includes("@")) {
      setError("올바른 이메일 형식을 입력해주세요.");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (isSignUp && !name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      if (isSignUp) {
        await signUp(email, password, name.trim());
      } else {
        await signIn(email, password);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || "";
      if (code === "auth/user-not-found" || code === "auth/invalid-credential" || code === "auth/wrong-password")
        setError("이메일 또는 비밀번호가 틀렸습니다.");
      else if (code === "auth/email-already-in-use")
        setError("이미 가입된 이메일입니다. 로그인을 해주세요.");
      else if (code === "auth/weak-password")
        setError("비밀번호는 6자 이상이어야 합니다.");
      else if (code === "auth/invalid-email")
        setError("올바른 이메일 형식이 아닙니다.");
      else if (code === "auth/network-request-failed")
        setError("네트워크 연결을 확인해주세요.");
      else if (code === "auth/too-many-requests")
        setError("잠시 후 다시 시도해주세요.");
      else setError("오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      {/* 로고 */}
      <div className="mb-2 text-sm tracking-widest dark-text-muted text-[#6B7394]">비선형공식 리워드 플랫폼</div>
      <h1 className="mb-1 text-[#3B4CCA] text-5xl font-black">
        다랜드
      </h1>
      <p className="mb-6 text-sm dark-text-muted text-[#6B7394]">쓸수록 쌓이는 120%의 마법</p>

      {/* 초대 코드 배너 */}
      {inviteCode && (
        <div className="mb-4 w-full max-w-sm rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 px-4 py-3 text-xs leading-relaxed text-[#6B7394]">
          <div className="mb-1 font-bold text-[#10B981]">🎁 초대 코드 적용됨</div>
          <p>회원가입을 완료하면 <strong className="text-[#1A1F36]">{inviteAmount.toLocaleString()}P</strong>가 자동으로 지급됩니다!</p>
        </div>
      )}

      {/* 베타 안내 배너 (데모 모드일 때만) */}
      {isDemo && (
        <div className="mb-6 w-full max-w-sm rounded-xl border border-[#3B4CCA]/20 bg-[#3B4CCA]/5 px-4 py-3 text-xs leading-relaxed text-[#6B7394]">
          <div className="mb-1 font-bold text-[#3B4CCA]">🧪 베타 체험 모드</div>
          <p>입력하신 이메일로 가입 후, 거래내역과 적립 포인트가 <strong className="text-[#1A1F36]">이 브라우저에만 저장</strong>됩니다.</p>
          <p className="mt-1">같은 이메일로 다시 로그인하면 내역을 이어볼 수 있습니다.</p>
        </div>
      )}

      {/* 폼 */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {isSignUp && (
          <input
            type="text"
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="dark-input w-full rounded-xl border border-[#E8EAF0] bg-white px-4 py-3.5 text-sm placeholder-[#9CA3C1] outline-none focus:border-[#3B4CCA]"
          />
        )}
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="dark-input w-full rounded-xl border border-[#E8EAF0] bg-white px-4 py-3.5 text-sm placeholder-[#9CA3C1] outline-none focus:border-[#3B4CCA]"
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="dark-input w-full rounded-xl border border-[#E8EAF0] bg-white px-4 py-3.5 text-sm placeholder-[#9CA3C1] outline-none focus:border-[#3B4CCA]"
        />

        {error && <p className="text-center text-sm text-[#EF4444]">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFB800] py-3.5 text-sm font-bold text-[#1A1F36] shadow-lg shadow-[#FFB800]/30 transition-transform hover:scale-[1.02] hover:bg-[#E5A600] disabled:opacity-50"
        >
          {submitting ? (
            "처리 중..."
          ) : isSignUp ? (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>person_add</span>
              회원가입
            </>
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>login</span>
              로그인
            </>
          )}
        </button>
      </form>

      <button
        onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
        className="mt-6 flex items-center gap-1 text-sm dark-text-muted text-[#6B7394] hover:text-[#3B4CCA]"
      >
        <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
          {isSignUp ? "login" : "person_add"}
        </span>
        {isSignUp ? "이미 계정이 있으신가요? 로그인" : "계정이 없으신가요? 회원가입"}
      </button>

      {/* 데모 로그인 (데모 모드일 때만) */}
      {isDemo && (
        <div className="mt-8 w-full max-w-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-[#E8EAF0]" />
            <span className="text-xs text-[#6B7394]">또는</span>
            <div className="h-px flex-1 bg-[#E8EAF0]" />
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
            className="w-full rounded-xl border border-[#E8EAF0] bg-[#F0F2F8] py-3.5 text-sm font-medium text-[#6B7394] transition-all hover:border-[#3B4CCA]/30 hover:bg-[#F0F2F8] hover:text-[#1A1F36] disabled:opacity-50"
          >
            🎮 데모 아이디로 체험하기
          </button>
          <p className="mt-2 text-center text-xs text-[#9CA3C1]">가입 없이 바로 둘러볼 수 있어요</p>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-lg text-[#6B7394]">로딩 중...</div>
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
