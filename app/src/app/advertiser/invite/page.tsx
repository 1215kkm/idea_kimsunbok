"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isConfigured, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { calculateInviteReward } from "@/lib/nonlinear-engine";
import { apiGet, apiPost } from "@/lib/api-client";
import Navbar from "@/components/Navbar";
import Link from "next/link";

interface TierOption {
  id: string;
  amount: number;
  label: string;
  desc: string;
}

interface ActiveInvite {
  code: string;
  tierId: string;
  amount: number;
  redeemCount: number;
  totalAdvertiserNetGain: number;
}

export default function AdvertiserInvitePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tiers, setTiers] = useState<TierOption[]>([]);
  const [active, setActive] = useState<ActiveInvite | null>(null);
  const [balance, setBalance] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !isConfigured) return;
    let cancelled = false;
    apiGet<{
      ok: boolean;
      tiers: TierOption[];
      active: ActiveInvite | null;
    }>("/api/invite/code")
      .then((r) => {
        if (cancelled) return;
        setTiers(r.tiers);
        setActive(r.active);
      })
      .catch(() => {
        if (!cancelled) setError("초대 정보를 불러오지 못했습니다.");
      });
    if (db) {
      getDoc(doc(db, "users", user.uid))
        .then((snap) => {
          if (cancelled) return;
          if (snap.exists()) setBalance(snap.data().totalPoints || 0);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [user]);

  const issueCode = async (tierId: string) => {
    setBusy(true);
    setError(null);
    try {
      const r = await apiPost<{
        ok: boolean;
        code: string;
        tierId: string;
        amount: number;
      }>("/api/invite/code", { tierId });
      setActive({
        code: r.code,
        tierId: r.tierId,
        amount: r.amount,
        redeemCount: 0,
        totalAdvertiserNetGain: 0,
      });
    } catch {
      setError("초대 코드 발급에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center dark-text-muted">
        로딩 중...
      </div>
    );
  }

  const inviteUrl =
    typeof window !== "undefined" && active
      ? `${window.location.origin}/?invite=${active.code}`
      : "";

  const reward = active ? calculateInviteReward(active.amount) : null;

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = inviteUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (!inviteUrl) return;
    if (navigator.share && reward) {
      try {
        await navigator.share({
          title: "다랜드 초대",
          text: `다랜드에 가입하고 ${reward.distributedToNewUser.toLocaleString()}P를 받으세요! 쓸수록 쌓이는 120%의 마법`,
          url: inviteUrl,
        });
      } catch {
        // cancelled
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="dark-header border-b border-[#E8EAF0] bg-white/95 px-5 py-4 pl-16">
        <div className="flex items-center gap-2">
          <Link href="/advertiser" className="text-[#6B7394] hover:text-[#1A1F36]">
            &larr;
          </Link>
          <div>
            <h1 className="text-lg font-bold">리워드 초대</h1>
            <p className="text-xs dark-text-muted text-[#6B7394]">초대할수록 나도 120% 수익</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-5 py-5 space-y-5">
        {/* 데모 안내 배너 */}
        {!isConfigured && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-[#6B7394]">
            <span className="font-bold text-amber-700">데모 모드</span> — 실제 초대 시스템은
            Firebase 실연동 환경에서만 동작합니다. 환경변수 설정 후 다시 시도해 주세요.
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 px-4 py-3 text-xs text-[#EF4444]">
            {error}
          </div>
        )}

        {/* 수익 요약 */}
        <div
          className="rounded-2xl border border-emerald-500/30 p-5 text-center"
          style={{
            background:
              "linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(6, 182, 212, 0.08))",
          }}
        >
          <div className="text-xs text-[#6B7394]">초대 리워드 총 수익</div>
          <div className="mt-1 text-3xl font-black text-[#10B981]">
            +{(active?.totalAdvertiserNetGain ?? 0).toLocaleString()}P
          </div>
          <div className="mt-1 text-xs text-[#6B7394]">총 {active?.redeemCount ?? 0}명 초대 완료</div>
        </div>

        {/* tier 선택 */}
        {isConfigured && (
          <div
            className="rounded-2xl border p-5"
            style={{
              borderColor: "var(--card-border)",
              background: "var(--card-bg)",
            }}
          >
            <div className="mb-3 text-sm font-bold text-[#6B7394]">신규 회원에게 분배할 금액</div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {tiers.map((t) => (
                <button
                  key={t.id}
                  onClick={() => issueCode(t.id)}
                  disabled={busy}
                  className="rounded-xl border p-3 text-left transition-all disabled:opacity-50"
                  style={{
                    borderColor:
                      active?.tierId === t.id
                        ? "rgba(59, 76, 202, 0.5)"
                        : "var(--card-border)",
                    background:
                      active?.tierId === t.id
                        ? "rgba(59, 76, 202, 0.08)"
                        : "transparent",
                  }}
                >
                  <div className="text-sm font-bold text-[#3B4CCA]">{t.label}</div>
                  <div className="text-xs text-[#6B7394]">{t.desc}</div>
                </button>
              ))}
            </div>
            <div className="rounded-lg bg-[#F7F8FC] px-3 py-2 text-xs text-[#6B7394]">
              {active ? (
                <>
                  현재 활성 코드:{" "}
                  <strong className="text-[#3B4CCA]">{active.amount.toLocaleString()}P</strong> · 광고주 순수익{" "}
                  <strong className="text-[#10B981]">
                    +{calculateInviteReward(active.amount).advertiserNetGain.toLocaleString()}P
                  </strong>
                </>
              ) : (
                <>tier를 선택하면 새 초대 코드가 발급됩니다.</>
              )}
            </div>
          </div>
        )}

        {/* 초대 코드 표시 */}
        {active && (
          <div
            className="rounded-2xl border p-5"
            style={{
              borderColor: "var(--card-border)",
              background: "var(--card-bg)",
            }}
          >
            <div className="mb-3 text-sm font-bold text-[#6B7394]">내 초대 코드</div>
            <div className="mb-4 rounded-xl bg-[#F7F8FC] border border-[#E8EAF0] px-4 py-3 text-center">
              <div className="text-2xl font-black tracking-widest text-[#3B4CCA]">{active.code}</div>
              <div className="mt-1 text-xs text-[#6B7394] break-all">{inviteUrl}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopy}
                className="rounded-xl bg-[#FFB800] py-3 text-sm font-bold text-[#1A1F36] transition-transform hover:scale-[1.02] active:scale-95"
              >
                {copied ? "복사됨!" : "링크 복사"}
              </button>
              <button
                onClick={handleShare}
                className="rounded-xl bg-gradient-to-r from-[#3B4CCA] to-[#6366F1] py-3 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-95"
              >
                공유하기
              </button>
            </div>
          </div>
        )}

        {/* 원리 설명 */}
        {reward && (
          <button
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className="w-full rounded-2xl border border-purple-500/20 p-4 text-left transition-all"
            style={{
              background:
                "linear-gradient(135deg, rgba(168, 85, 247, 0.05), rgba(6, 182, 212, 0.05))",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-[#3B4CCA]">초대 리워드 원리</div>
              <span className="text-xs text-[#6B7394]">{showHowItWorks ? "접기" : "펼치기"}</span>
            </div>
            {showHowItWorks && (
              <div className="mt-3 space-y-2 text-xs text-[#6B7394]">
                {[
                  { step: "1", text: `광고주(나)가 ${reward.advertiserSpend.toLocaleString()}P를 분배`, color: "#a855f7" },
                  { step: "2", text: `신규 가입자에게 ${reward.distributedToNewUser.toLocaleString()}P 지급`, color: "#06b6d4" },
                  { step: "3", text: "광고주 본인 지출로 인식 → 비선형공식 실행", color: "#f59e0b" },
                  { step: "4", text: `120% 적립 → ${reward.advertiserSecured.toLocaleString()}P 확보`, color: "#10b981" },
                  { step: "5", text: `순수익 +${reward.advertiserNetGain.toLocaleString()}P (데이터 노동 보상)`, color: "#ec4899" },
                ].map((s) => (
                  <div key={s.step} className="flex items-center gap-3">
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white"
                      style={{ background: s.color }}
                    >
                      {s.step}
                    </div>
                    <div>{s.text}</div>
                  </div>
                ))}
              </div>
            )}
          </button>
        )}

        {/* 내 잔액 */}
        <div
          className="rounded-2xl border border-cyan-500/20 p-4 text-center"
          style={{
            background:
              "linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(168, 85, 247, 0.08))",
          }}
        >
          <div className="text-xs text-[#6B7394]">내 다랜드 잔액</div>
          <div className="mt-1 text-2xl font-black text-[#3B4CCA]">{balance.toLocaleString()}P</div>
        </div>
      </div>

      <Navbar />
    </div>
  );
}
