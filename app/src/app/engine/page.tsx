"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";

interface Step {
  title: string;
  desc: string;
  icon: string;
  detail: string;
  highlight?: string;
}

const STEPS: Step[] = [
  {
    title: "소비자 결제",
    desc: "영희가 카페에서 10,000원 결제",
    icon: "💳",
    detail: "소비자가 다랜드 가맹점에서 결제하면 비선형공식 엔진이 작동합니다.",
    highlight: "-10,000원",
  },
  {
    title: "A1: 판매자 적립 (50%)",
    desc: "카페 사장님에게 5,000P 적립",
    icon: "🏪",
    detail: "결제 금액의 50%가 판매자(가맹점)에게 포인트로 적립됩니다.\n10,000 x 50% = 5,000P",
    highlight: "+5,000P",
  },
  {
    title: "B1: 소비자 적립 (50%)",
    desc: "영희에게 5,000P 적립",
    icon: "👩",
    detail: "결제 금액의 나머지 50%가 소비자에게 포인트로 적립됩니다.\n10,000 x 50% = 5,000P",
    highlight: "+5,000P",
  },
  {
    title: "멤버십 풀 (x10 확장)",
    desc: "소비자 적립분이 10배로 확장",
    icon: "🏦",
    detail: "소비자 적립분 5,000P가 멤버십 풀에서 10배 확장됩니다.\n5,000 x 10 = 50,000P\n\n이 풀은 모든 회원의 거래가 쌓여 만들어집니다.",
    highlight: "50,000P 풀",
  },
  {
    title: "5라운드 비선형 분배",
    desc: "가중치 [1, 1, 2, 2, 4]로 분배",
    icon: "🔄",
    detail: "멤버십 풀 50,000P를 5라운드에 걸쳐 분배합니다.\n\nR1: 50,000 / 10 x 1 = 5,000P\nR2: 50,000 / 10 x 1 = 5,000P\nR3: 50,000 / 10 x 2 = 10,000P\nR4: 50,000 / 10 x 2 = 10,000P\nR5: 50,000 / 10 x 4 = 20,000P\n\n합계 = 50,000P (분배 완료)",
    highlight: "5라운드",
  },
  {
    title: "보정 모드 (안전장치)",
    desc: "150% -> 120%로 안전 보정",
    icon: "🛡️",
    detail: "판매자 50% + 멤버십 100% = 150%\n\n과도한 분배를 방지하기 위해\n보정 모드가 150%를 120%로 조정합니다.\n\n이것이 시스템의 안정성을 보장합니다.",
    highlight: "120%",
  },
  {
    title: "최종 결과",
    desc: "10,000원 결제 -> 12,000P 적립!",
    icon: "🎉",
    detail: "원금: 10,000P\n보너스: 2,000P\n\n합계: 12,000P (120% 적립!)\n\n소비자는 쓴 것보다 더 많이 돌려받고,\n판매자도 포인트가 쌓이는 선순환 경제!",
    highlight: "12,000P",
  },
];

export default function EnginePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(-1);
  const [showFormula, setShowFormula] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  const goNext = () => {
    const next = activeStep + 1;
    if (next >= STEPS.length) {
      setShowFormula(true);
    } else {
      setActiveStep(next);
    }
  };

  const reset = () => {
    setActiveStep(-1);
    setShowFormula(false);
  };

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center dark-text-muted">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <div className="dark-header border-b border-purple-900/20 bg-[#0d0d30]/80 px-5 py-4 pl-16">
        <h1 className="text-lg font-bold">비선형공식 엔진</h1>
        <p className="text-xs dark-text-muted text-zinc-500">120% 적립의 원리</p>
      </div>

      <div className="mx-auto max-w-lg px-5 py-6">
        {/* 시작/다음/처음부터 버튼 */}
        {activeStep === -1 && !showFormula && (
          <button
            onClick={goNext}
            className="mb-6 w-full rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 py-4 text-base font-bold text-white shadow-lg shadow-purple-500/20 transition-transform hover:scale-[1.02] active:scale-95"
          >
            비선형공식 실행하기
          </button>
        )}

        {/* 진행률 표시 */}
        {activeStep >= 0 && !showFormula && (
          <div className="mb-4 flex items-center gap-2">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1.5 flex-1 rounded-full transition-all duration-300"
                style={{ background: i <= activeStep ? "linear-gradient(90deg, #a855f7, #06b6d4)" : "rgba(255,255,255,0.1)" }}
              />
            ))}
            <span className="ml-1 text-xs text-zinc-500">{activeStep + 1}/{STEPS.length}</span>
          </div>
        )}

        {/* 인풋 표시 */}
        {activeStep >= 0 && (
          <div className="mb-4 rounded-2xl border border-cyan-500/30 p-4 text-center dark-card bg-[#14143c]">
            <div className="text-xs dark-text-muted text-zinc-500">입력</div>
            <div className="mt-1 text-2xl font-black text-cyan-400">10,000원 결제</div>
          </div>
        )}

        {/* 스텝 카드들 */}
        <div className="space-y-3">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border transition-all duration-500"
              style={{
                opacity: i <= activeStep ? 1 : 0.2,
                transform: i <= activeStep ? "translateY(0) scale(1)" : "translateY(10px) scale(0.97)",
                borderColor: i === activeStep ? "rgba(168, 85, 247, 0.5)" : "var(--card-border)",
                background: i === activeStep ? "var(--accent-gradient-from)" : "var(--card-bg)",
                transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            >
              <div className="flex items-start gap-4 p-4">
                {/* 아이콘 */}
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                  style={{
                    background: i === activeStep
                      ? "linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(6, 182, 212, 0.3))"
                      : "rgba(168, 85, 247, 0.1)",
                    transition: "background 0.5s",
                  }}
                >
                  {step.icon}
                </div>

                <div className="flex-1 min-w-0">
                  {/* 타이틀 */}
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold">{step.title}</h3>
                    {step.highlight && i <= activeStep && (
                      <span
                        className="shrink-0 rounded-full px-3 py-1 text-xs font-black"
                        style={{
                          background: i === STEPS.length - 1
                            ? "linear-gradient(135deg, #10b981, #06b6d4)"
                            : "linear-gradient(135deg, #a855f7, #06b6d4)",
                          color: "white",
                          animation: i === activeStep ? "pulse 1s ease-in-out" : "none",
                        }}
                      >
                        {step.highlight}
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 text-xs dark-text-muted text-zinc-500">{step.desc}</p>

                  {/* 상세 내용 (활성 스텝) */}
                  {i === activeStep && (
                    <>
                      <div
                        className="mt-3 rounded-xl p-3 text-sm leading-relaxed"
                        style={{
                          background: "rgba(168, 85, 247, 0.08)",
                          color: "var(--text-muted)",
                          animation: "fadeIn 0.5s ease-out",
                          whiteSpace: "pre-line",
                        }}
                      >
                        {step.detail}
                      </div>
                      {!showFormula && (
                        <button
                          onClick={goNext}
                          className="mt-3 w-full rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 py-3 text-sm font-bold text-white shadow-md shadow-purple-500/20 transition-transform hover:scale-[1.02] active:scale-95"
                        >
                          {i < STEPS.length - 1 ? "다음 단계 →" : "최종 결과 보기 →"}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* 연결선 */}
              {i < STEPS.length - 1 && i <= activeStep && (
                <div className="flex justify-center pb-1">
                  <div
                    className="h-4 w-0.5 rounded-full"
                    style={{
                      background: "linear-gradient(to bottom, rgba(168, 85, 247, 0.4), transparent)",
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 처음부터 다시 버튼 */}
        {showFormula && (
          <button
            onClick={reset}
            className="mt-4 w-full rounded-2xl border border-purple-500/30 py-3 text-sm font-bold text-purple-400 transition-transform hover:scale-[1.02] active:scale-95"
          >
            처음부터 다시 보기
          </button>
        )}

        {/* 최종 공식 요약 */}
        {showFormula && (
          <div
            className="mt-6 rounded-2xl border border-purple-500/30 p-6 text-center"
            style={{
              background: "linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-to))",
              animation: "fadeIn 0.8s ease-out",
            }}
          >
            <div className="text-sm font-bold text-purple-400">비선형공식 요약</div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-black/10 px-4 py-2">
                <span className="dark-text-muted text-zinc-500">결제 금액</span>
                <span className="font-bold text-rose-400">10,000원</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-black/10 px-4 py-2">
                <span className="dark-text-muted text-zinc-500">판매자 적립 (A1)</span>
                <span className="font-bold text-amber-400">5,000P</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-black/10 px-4 py-2">
                <span className="dark-text-muted text-zinc-500">소비자 적립 (B1)</span>
                <span className="font-bold text-amber-400">5,000P</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-black/10 px-4 py-2">
                <span className="dark-text-muted text-zinc-500">멤버십 풀 (x10)</span>
                <span className="font-bold text-cyan-400">50,000P</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-black/10 px-4 py-2">
                <span className="dark-text-muted text-zinc-500">보정 모드</span>
                <span className="font-bold text-purple-400">150% &rarr; 120%</span>
              </div>
              <div className="mt-3 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-base font-bold">최종 적립</span>
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-2xl font-black text-transparent">
                  12,000P
                </span>
              </div>
              <div className="inline-block rounded-full bg-gradient-to-r from-rose-500 to-orange-400 px-5 py-1.5 text-sm font-bold text-white">
                120% 적립 달성!
              </div>
            </div>

            {/* 핵심 원리 */}
            <div className="mt-5 rounded-xl bg-black/10 p-4 text-left text-xs leading-relaxed dark-text-muted text-zinc-400">
              <div className="mb-2 text-sm font-bold text-purple-300">핵심 원리</div>
              <p>돈이 새로 생기는 것이 아닙니다.</p>
              <p className="mt-1">광고주의 광고비, 가맹점 수수료, 프리미엄 멤버십 — 이 돈들이 시스템 풀에 쌓이고, 비선형공식이 모든 참여자에게 골고루 분배하는 구조입니다.</p>
              <p className="mt-2 text-center font-bold text-purple-400">
                &ldquo;항아리 속의 물 총량은 같다. 바가지만 바뀔 뿐.&rdquo;
              </p>
            </div>
          </div>
        )}
      </div>

      <Navbar />

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
