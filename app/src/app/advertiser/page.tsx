"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";

const EXAMPLES = [
  { name: "신한은행", icon: "🏦", invest: 10000000000, desc: "비선형카드 발급 프로모션" },
  { name: "삼성전자", icon: "📱", invest: 5000000000, desc: "갤럭시 리워드 광고" },
  { name: "CJ올리브영", icon: "💄", invest: 2000000000, desc: "뷰티 포인트 적립 광고" },
  { name: "스타벅스", icon: "☕", invest: 1000000000, desc: "음료 할인 광고" },
];

function formatKorean(n: number): string {
  if (n >= 100000000) return (n / 100000000).toLocaleString() + "억원";
  if (n >= 10000) return (n / 10000).toLocaleString() + "만원";
  return n.toLocaleString() + "원";
}

export default function AdvertiserPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center dark-text-muted">로딩 중...</div>;
  }

  const ex = EXAMPLES[selectedIdx];
  const returnAmount = Math.round(ex.invest * 1.2);
  const profit = returnAmount - ex.invest;

  return (
    <div className="min-h-screen pb-20">
      <div className="dark-header border-b border-purple-900/20 bg-[#0d0d30]/80 px-5 py-4 pl-16">
        <h1 className="text-lg font-bold">광고주 대시보드</h1>
        <p className="text-xs dark-text-muted text-zinc-500">광고주도 120% 수익</p>
      </div>

      <div className="mx-auto max-w-lg px-5 py-6">
        <div className="dark-card mb-6 rounded-2xl border border-emerald-500/30 p-5 text-center"
          style={{ background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(6, 182, 212, 0.08))" }}>
          <div className="text-sm dark-text-muted text-zinc-400">광고주가 투자하면</div>
          <div className="mt-1 text-3xl font-black text-emerald-400">120% 수익 발생</div>
          <div className="mt-2 text-xs dark-text-muted text-zinc-500">광고비가 사라지지 않고, 비선형공식으로 순환합니다</div>
        </div>

        <div className="mb-4 text-sm font-bold dark-text-muted text-zinc-400">광고주 시뮬레이션</div>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {EXAMPLES.map((e, i) => (
            <button key={i} onClick={() => { setSelectedIdx(i); setShowResult(false); }}
              className="dark-card rounded-xl border p-3 text-left transition-all"
              style={{
                borderColor: i === selectedIdx ? "rgba(16, 185, 129, 0.5)" : "var(--card-border)",
                background: i === selectedIdx ? "rgba(16, 185, 129, 0.08)" : "var(--card-bg)",
              }}>
              <div className="text-xl">{e.icon}</div>
              <div className="mt-1 text-sm font-bold">{e.name}</div>
              <div className="text-xs dark-text-muted text-zinc-500">{e.desc}</div>
              <div className="mt-1 text-xs font-bold text-emerald-400">투자: {formatKorean(e.invest)}</div>
            </button>
          ))}
        </div>

        <button onClick={() => setShowResult(true)}
          className="mb-6 w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-500 py-4 text-base font-bold text-white shadow-lg shadow-emerald-500/20 transition-transform hover:scale-[1.02] active:scale-95">
          {ex.icon} {ex.name} 투자 실행하기
        </button>

        {showResult && (
          <div className="space-y-3">
            <div className="dark-card rounded-2xl border p-4" style={{ background: "var(--card-bg)", borderColor: "var(--card-border)" }}>
              <div className="text-xs dark-text-muted text-zinc-500">투자 금액</div>
              <div className="mt-1 text-2xl font-black text-rose-400">-{formatKorean(ex.invest)}</div>
              <div className="mt-1 text-xs dark-text-muted text-zinc-500">{ex.name}이 비선형 시스템에 충전</div>
            </div>

            <div className="dark-card rounded-2xl border border-purple-500/30 p-4"
              style={{ background: "linear-gradient(135deg, rgba(168, 85, 247, 0.05), rgba(6, 182, 212, 0.05))" }}>
              <div className="mb-3 text-xs font-bold text-purple-400">비선형공식 분배 과정</div>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl px-3 py-2 text-xs" style={{ background: "rgba(0,0,0,0.1)" }}>
                  <span className="dark-text-muted text-zinc-400">광고 시청 리워드 (사용자)</span>
                  <span className="font-bold text-cyan-400">사용자에게 분배</span>
                </div>
                <div className="flex items-center justify-between rounded-xl px-3 py-2 text-xs" style={{ background: "rgba(0,0,0,0.1)" }}>
                  <span className="dark-text-muted text-zinc-400">사용자 지출데이터 등록</span>
                  <span className="font-bold text-amber-400">120% 증액 적립</span>
                </div>
                <div className="flex items-center justify-between rounded-xl px-3 py-2 text-xs" style={{ background: "rgba(0,0,0,0.1)" }}>
                  <span className="dark-text-muted text-zinc-400">멤버십 회원 분배</span>
                  <span className="font-bold text-purple-400">모든 회원 120%</span>
                </div>
                <div className="flex items-center justify-between rounded-xl px-3 py-2 text-xs" style={{ background: "rgba(0,0,0,0.1)" }}>
                  <span className="dark-text-muted text-zinc-400">보정 모드 (안전장치)</span>
                  <span className="font-bold text-purple-400">150% → 120%</span>
                </div>
              </div>
            </div>

            <div className="dark-card rounded-2xl border border-emerald-500/30 p-5 text-center"
              style={{ background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(6, 182, 212, 0.08))" }}>
              <div className="text-xs dark-text-muted text-zinc-500">비선형공식 적용 결과</div>
              <div className="mt-2 text-4xl font-black text-emerald-400">+{formatKorean(returnAmount)}</div>
              <div className="mt-1 inline-block rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 px-4 py-1 text-sm font-bold text-white">120% 수익 달성!</div>
              <div className="mx-auto mt-4 max-w-xs space-y-2">
                <div className="flex justify-between rounded-xl px-4 py-2 text-sm" style={{ background: "rgba(0,0,0,0.1)" }}>
                  <span className="dark-text-muted text-zinc-500">투자</span>
                  <span className="font-bold text-rose-400">{formatKorean(ex.invest)}</span>
                </div>
                <div className="flex justify-between rounded-xl px-4 py-2 text-sm" style={{ background: "rgba(0,0,0,0.1)" }}>
                  <span className="dark-text-muted text-zinc-500">수익</span>
                  <span className="font-bold text-emerald-400">{formatKorean(returnAmount)}</span>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                <div className="flex justify-between px-4 py-2 text-sm">
                  <span className="font-bold">순이익</span>
                  <span className="text-lg font-black text-cyan-400">+{formatKorean(profit)}</span>
                </div>
              </div>
            </div>

            <div className="dark-card rounded-2xl border p-4 text-xs leading-relaxed"
              style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", color: "var(--text-muted)" }}>
              <div className="mb-2 text-sm font-bold text-emerald-500">왜 광고주도 이득인가?</div>
              <p>기존 광고: 광고비 → 노출 → 끝 (돈이 사라짐)</p>
              <p className="mt-2">다랜드 광고: 광고비 → 비선형 시스템 충전 → 사용자에게 분배 → 사용자가 신용카드 결제 → 멤버십 회원 분배 → 다시 순환</p>
              <p className="mt-2 text-center font-bold text-emerald-400">광고비가 사라지지 않고, 120%로 돌아옵니다.</p>
            </div>
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
