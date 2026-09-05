"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import Link from "next/link";
import { apiGet, ApiClientError } from "@/lib/api-client";

interface InviteInfo {
  code: string;
  tierId: string;
  amount: number;
  label: string;
}

function LoginPageInner() {
  const { user, loading, signIn, signUp, demoSignIn, isDemo } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = (searchParams.get("invite") || "").toUpperCase() || null;
  const [isSignUp, setIsSignUp] = useState(!!inviteCode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [betaConsent, setBetaConsent] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [inviteInfoError, setInviteInfoError] = useState<string | null>(null);

  // Look up invite code metadata from server (no client-trusted amount).
  useEffect(() => {
    if (!inviteCode || isDemo) return;
    if (!/^[A-Z0-9]{8}$/.test(inviteCode)) {
      setInviteInfoError("INVALID_FORMAT");
      return;
    }
    let cancelled = false;
    apiGet<{ ok: boolean } & InviteInfo>(
      `/api/invite/info?code=${encodeURIComponent(inviteCode)}`,
    )
      .then((r) => {
        if (!cancelled) setInviteInfo(r);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiClientError) setInviteInfoError(err.code);
        else setInviteInfoError("INTERNAL");
      });
    return () => {
      cancelled = true;
    };
  }, [inviteCode, isDemo]);

  useEffect(() => {
    if (!user) return;
    router.push("/dashboard");
  }, [user, router]);

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
    if (isSignUp && !(agreeTerms && agreePrivacy && betaConsent)) {
      setError("필수 약관(이용약관·개인정보·베타 시연)에 동의해 주세요.");
      return;
    }
    setSubmitting(true);
    try {
      if (isSignUp) {
        const result = await signUp(email, password, name.trim(), inviteCode, betaConsent);
        if (result.inviteError && inviteCode) {
          if (result.inviteError === "SELF_INVITE")
            setError("본인의 초대 코드는 사용할 수 없습니다.");
          else if (result.inviteError === "ALREADY_REDEEMED")
            setError("이미 초대 코드를 사용하셨습니다.");
          else if (result.inviteError === "NOT_FOUND")
            setError("유효하지 않은 초대 코드입니다.");
          else if (result.inviteError === "INACTIVE")
            setError("만료된 초대 코드입니다.");
          else if (result.inviteError === "EMAIL_NOT_VERIFIED")
            setError("이메일 인증 후 지급됩니다. 받은 메일의 링크를 눌러 주세요.");
          else if (result.inviteError === "CAMPAIGN_NOT_ACTIVE" || result.inviteError === "BUDGET_EXHAUSTED")
            setError("이 캠페인은 현재 지급이 중단되었습니다.");
          else if (result.inviteError === "INVITE_DEPRECATED")
            setError("구 초대 코드는 더 이상 지급되지 않습니다.");
          // 가입 자체는 성공이므로 라우팅은 useEffect에서 진행
        }
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
      {inviteCode && !inviteInfoError && (
        <div className="mb-4 w-full max-w-sm rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 px-4 py-3 text-xs leading-relaxed text-[#6B7394]">
          <div className="mb-1 font-bold text-[#10B981]">🎁 초대 코드 적용됨</div>
          {inviteInfo ? (
            <p>
              가입 후 이메일 인증을 마치면 광고주 예산에서{" "}
              <strong className="text-[#1A1F36]">{inviteInfo.amount.toLocaleString()}P</strong>가
              지급됩니다.
            </p>
          ) : (
            <p>가입 후 이메일 인증을 마치면 광고주 예산에서 리워드가 지급됩니다.</p>
          )}
        </div>
      )}

      {inviteCode && inviteInfoError && (
        <div className="mb-4 w-full max-w-sm rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 px-4 py-3 text-xs leading-relaxed text-[#EF4444]">
          {inviteInfoError === "NOT_FOUND" && "유효하지 않은 초대 코드입니다."}
          {inviteInfoError === "INACTIVE" && "만료된 초대 코드입니다."}
          {(inviteInfoError === "INVALID_INPUT" || inviteInfoError === "INVALID_FORMAT") &&
            "초대 코드 형식이 올바르지 않습니다."}
          {inviteInfoError === "INTERNAL" && "초대 코드 정보를 불러오지 못했습니다."}
        </div>
      )}

      {/* 베타 시연 안내 (회원가입 모드일 때) */}
      {isSignUp && !isDemo && (
        <div className="mb-4 w-full max-w-sm rounded-xl border border-amber-500/30 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-[#6B7394]">
          <div className="mb-1 font-bold text-amber-700">🧪 폐쇄 베타 시연</div>
          <p>본 앱은 <strong className="text-[#1A1F36]">시연/연구용 베타</strong>입니다. 가입 시 <strong className="text-[#3B4CCA]">테스트 자금 1,000,000P</strong>가 가상으로 지급됩니다.</p>
          <p className="mt-1">출금 요청은 <strong className="text-[#1A1F36]">실제 송금되지 않으며</strong>, 모든 포인트는 시뮬레이션입니다.</p>
        </div>
      )}

      {/* 데모 모드 안내 (Firebase 미연결 시) */}
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

        {isSignUp && (
          <div className="space-y-2.5 rounded-xl border border-[#E8EAF0] bg-[#F7F8FC] p-3">
            {/* 전체 동의 */}
            <label className="flex items-center gap-2 border-b border-[#E8EAF0] pb-2.5 text-sm font-bold text-[#1A1F36] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreeTerms && agreePrivacy && betaConsent && agreeMarketing}
                onChange={(e) => {
                  const v = e.target.checked;
                  setAgreeTerms(v); setAgreePrivacy(v); setBetaConsent(v); setAgreeMarketing(v);
                }}
                className="h-4 w-4 shrink-0 cursor-pointer accent-[#3B4CCA]"
              />
              전체 동의
            </label>

            {/* 이용약관 (필수) */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-[#6B7394] cursor-pointer select-none">
                <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="h-4 w-4 shrink-0 cursor-pointer accent-[#3B4CCA]" />
                <span>이용약관 동의 <span className="text-[#EF4444]">(필수)</span></span>
              </label>
              <Link href="/terms" className="text-[10px] text-[#6B7394] underline hover:text-[#3B4CCA]">보기</Link>
            </div>

            {/* 개인정보 (필수) */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-[#6B7394] cursor-pointer select-none">
                <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} className="h-4 w-4 shrink-0 cursor-pointer accent-[#3B4CCA]" />
                <span>개인정보 수집·이용 동의 <span className="text-[#EF4444]">(필수)</span></span>
              </label>
              <Link href="/privacy" className="text-[10px] text-[#6B7394] underline hover:text-[#3B4CCA]">보기</Link>
            </div>

            {/* 베타 시연 (필수) */}
            <label className="flex items-start gap-2 text-xs leading-relaxed text-[#6B7394] cursor-pointer select-none">
              <input type="checkbox" checked={betaConsent} onChange={(e) => setBetaConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#3B4CCA]" />
              <span>본 앱이 <strong className="text-[#1A1F36]">베타 시연용</strong>이며 <strong className="text-[#1A1F36]">적립금은 실 화폐가 아님</strong>에 동의 <span className="text-[#EF4444]">(필수)</span></span>
            </label>

            {/* 마케팅 (선택) */}
            <label className="flex items-center gap-2 text-xs text-[#6B7394] cursor-pointer select-none">
              <input type="checkbox" checked={agreeMarketing} onChange={(e) => setAgreeMarketing(e.target.checked)} className="h-4 w-4 shrink-0 cursor-pointer accent-[#3B4CCA]" />
              <span>마케팅 정보 수신 동의 <span className="text-[#9CA3C1]">(선택)</span></span>
            </label>
          </div>
        )}

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
