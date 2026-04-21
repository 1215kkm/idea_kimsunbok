"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isConfigured } from "@/lib/firebase";
import {
  generateInviteCode,
  getInviteRecords,
  getBalance as getDemoBalance,
  type InviteRecord,
} from "@/lib/demo-store";
import { calculateInviteReward } from "@/lib/nonlinear-engine";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function AdvertiserInvitePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [records, setRecords] = useState<InviteRecord[]>([]);
  const [balance, setBalance] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const code = generateInviteCode(user);
    setInviteCode(code);
    setRecords(getInviteRecords(user));
    setBalance(getDemoBalance(user));
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center dark-text-muted">
        로딩 중...
      </div>
    );
  }

  const reward = calculateInviteReward(100_000);
  const totalBonus = records.reduce((sum, r) => sum + r.bonus, 0);
  const totalDistributed = records.reduce((sum, r) => sum + r.amount, 0);

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/?invite=${inviteCode}`
      : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
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
    if (navigator.share) {
      try {
        await navigator.share({
          title: "다랜드 초대",
          text: `다랜드에 가입하고 ${reward.distributedToNewUser.toLocaleString()}P를 받으세요! 쓸수록 쌓이는 120%의 마법`,
          url: inviteUrl,
        });
      } catch {
        // 취소
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="dark-header border-b border-[#E8EAF0] bg-white/95 px-5 py-4 pl-16">
        <div className="flex items-center gap-2">
          <Link
            href="/advertiser"
            className="text-[#6B7394] hover:text-[#1A1F36]"
          >
            &larr;
          </Link>
          <div>
            <h1 className="text-lg font-bold">리워드 초대</h1>
            <p className="text-xs dark-text-muted text-[#6B7394]">
              초대할수록 나도 120% 수익
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-5 py-5 space-y-5">
        {/* 데모 안내 배너 */}
        {!isConfigured && (
          <div className="rounded-xl border border-[#3B4CCA]/20 bg-[#3B4CCA]/5 px-4 py-3 text-xs text-[#6B7394]">
            <span className="font-bold text-[#3B4CCA]">데모 모드</span> —
            같은 브라우저 내에서 초대 테스트가 가능합니다. 실시간 분배는
            Firebase 실연동 시 동작합니다.
          </div>
        )}

        {/* 수익 요약 카드 */}
        <div
          className="rounded-2xl border border-emerald-500/30 p-5 text-center"
          style={{
            background:
              "linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(6, 182, 212, 0.08))",
          }}
        >
          <div className="text-xs text-[#6B7394]">초대 리워드 총 수익</div>
          <div className="mt-1 text-3xl font-black text-[#10B981]">
            +{totalBonus.toLocaleString()}P
          </div>
          <div className="mt-1 text-xs text-[#6B7394]">
            총 {records.length}명 초대 · {totalDistributed.toLocaleString()}P
            분배
          </div>
        </div>

        {/* 초대 코드 + 공유 */}
        <div
          className="rounded-2xl border p-5"
          style={{
            borderColor: "var(--card-border)",
            background: "var(--card-bg)",
          }}
        >
          <div className="mb-3 text-sm font-bold text-[#6B7394]">
            내 초대 코드
          </div>
          <div className="mb-4 rounded-xl bg-[#F7F8FC] border border-[#E8EAF0] px-4 py-3 text-center">
            <div className="text-2xl font-black tracking-widest text-[#3B4CCA]">
              {inviteCode || "..."}
            </div>
            <div className="mt-1 text-xs text-[#6B7394] break-all">
              {inviteUrl}
            </div>
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

        {/* 원리 설명 토글 */}
        <button
          onClick={() => setShowHowItWorks(!showHowItWorks)}
          className="w-full rounded-2xl border border-purple-500/20 p-4 text-left transition-all"
          style={{
            background:
              "linear-gradient(135deg, rgba(168, 85, 247, 0.05), rgba(6, 182, 212, 0.05))",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-[#3B4CCA]">
              초대 리워드 원리
            </div>
            <span className="text-xs text-[#6B7394]">
              {showHowItWorks ? "접기" : "펼치기"}
            </span>
          </div>
          {showHowItWorks && (
            <div className="mt-3 space-y-2 text-xs text-[#6B7394]">
              {[
                {
                  step: "1",
                  text: `광고주(나)가 ${reward.advertiserSpend.toLocaleString()}P를 분배`,
                  color: "#a855f7",
                },
                {
                  step: "2",
                  text: `신규 가입자에게 ${reward.distributedToNewUser.toLocaleString()}P 지급`,
                  color: "#06b6d4",
                },
                {
                  step: "3",
                  text: "광고주 본인 지출로 인식 → 비선형공식 실행",
                  color: "#f59e0b",
                },
                {
                  step: "4",
                  text: `120% 적립 → ${reward.advertiserSecured.toLocaleString()}P 확보`,
                  color: "#10b981",
                },
                {
                  step: "5",
                  text: `순수익 +${reward.advertiserNetGain.toLocaleString()}P (데이터 노동 보상)`,
                  color: "#ec4899",
                },
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
              <div className="mt-2 rounded-xl bg-white/50 p-3 text-center">
                <div className="text-xs text-[#6B7394]">광고주 순변화</div>
                <div className="text-lg font-black text-[#10B981]">
                  -{reward.advertiserSpend.toLocaleString()}P +{" "}
                  {reward.advertiserSecured.toLocaleString()}P ={" "}
                  <span className="text-[#3B4CCA]">
                    +{reward.advertiserNetGain.toLocaleString()}P
                  </span>
                </div>
              </div>
            </div>
          )}
        </button>

        {/* 내 잔액 */}
        <div
          className="rounded-2xl border border-cyan-500/20 p-4 text-center"
          style={{
            background:
              "linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(168, 85, 247, 0.08))",
          }}
        >
          <div className="text-xs text-[#6B7394]">내 다랜드 잔액</div>
          <div className="mt-1 text-2xl font-black text-[#3B4CCA]">
            {balance.toLocaleString()}P
          </div>
        </div>

        {/* 초대 기록 */}
        <div
          className="rounded-2xl border p-4"
          style={{
            borderColor: "var(--card-border)",
            background: "var(--card-bg)",
          }}
        >
          <div className="mb-3 text-sm font-bold text-[#6B7394]">
            초대 기록
          </div>
          {records.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E8EAF0] p-6 text-center text-xs text-[#6B7394]">
              아직 초대한 회원이 없습니다.
              <br />
              초대 링크를 공유하여 첫 리워드를 받아보세요!
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-[#E8EAF0] bg-[#F7F8FC] p-3"
                >
                  <div>
                    <div className="text-sm font-bold">{r.inviteeEmail}</div>
                    <div className="text-xs text-[#6B7394]">
                      {new Date(r.timestamp).toLocaleDateString("ko-KR")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-[#10B981]">
                      +{r.bonus.toLocaleString()}P
                    </div>
                    <div className="text-xs text-[#6B7394]">리워드</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Navbar />
    </div>
  );
}
