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
    title: "사용자 신용카드 결제",
    desc: "영희가 어디서든 신용카드로 10,000원 결제",
    icon: "💳",
    detail: "사용자가 신용카드로 결제하면 지출데이터가 생성됩니다.\n\n다랜드에는 '가맹점'이 없습니다.\n모든 참여자는 '사용자(소비자)'입니다.",
    highlight: "-10,000원",
  },
  {
    title: "지출데이터 단말기 증명",
    desc: "영수증이 지출데이터 단말기로 증명됨",
    icon: "🧾",
    detail: "신용카드 결제 영수증이 지출데이터 단말기를 통해 증명됩니다.\n\n이 증명된 지출데이터가 비선형공식 시스템에 입력됩니다.",
    highlight: "증명 완료",
  },
  {
    title: "본인 충전데이터 차감",
    desc: "영희의 충전된 데이터에서 지출금액 차감",
    icon: "📊",
    detail: "다랜드 회원 본인이 충전한 데이터에서\n지출금액 10,000원이 차감됩니다.\n\n충전 데이터: 50,000P → 40,000P\n차감분: -10,000P",
    highlight: "-10,000P",
  },
  {
    title: "비선형공식 분배 (A1+B1)",
    desc: "차감된 금액이 비선형공식 알고리즘으로 분배",
    icon: "⚙️",
    detail: "A1: 사용자 본인 적립 (50%) = 5,000P\nB1: 멤버십 회원 분배분 (50%) = 5,000P\n\n이 두 모듈이 비선형공식의 기본 분배입니다.\n\n멤버십 풀 확장: 5,000P × 10 = 50,000P",
    highlight: "50,000P 풀",
  },
  {
    title: "5라운드 비선형 분배",
    desc: "가중치 [1, 1, 2, 2, 4]로 분배",
    icon: "🔄",
    detail: "멤버십 풀 50,000P를 5라운드에 걸쳐 분배합니다.\n\nR1: 50,000 / 10 × 1 = 5,000P\nR2: 50,000 / 10 × 1 = 5,000P\nR3: 50,000 / 10 × 2 = 10,000P\nR4: 50,000 / 10 × 2 = 10,000P\nR5: 50,000 / 10 × 4 = 20,000P\n\n합계 = 50,000P (분배 완료)",
    highlight: "5라운드",
  },
  {
    title: "이탈모드 → 결합모드",
    desc: "로그기록 데이터를 이탈시켜 결합 가능 상태로 전환",
    icon: "🔀",
    detail: "자유값(free)과 빈모드를 하지 않으면 결합 불가!\n\nC1:4,000,000,000(free)\n- a:500,000,000(free) = 3,500,000,000\n+ d1:500,000,000(빈로그)\n\nA1:1,000,000,000(50%) + a:500,000,000(free)\n→ 결합 할 수 있는 절대값이 된다",
    highlight: "이탈→결합",
  },
  {
    title: "a→f 분배 체인",
    desc: "이탈모드 자유값 500M을 6가지로 분배",
    icon: "🔗",
    detail: "a:500,000,000(free) 이탈모드 자유값에서:\n\n- b:200,000,000 → A1 멤버십적립 (20%)\n  남은: 300,000,000\n- c:120,000,000 → 소비자적립 (12%)\n  남은: 180,000,000\n- d:50,000,000 → 보정값 (5%)\n  남은: 130,000,000\n- e:10,000,000 → 광고주적립 (1%)\n= f:120,000,000 → 수수료 (12%)\n\n합계: 200+120+50+10+120 = 500M ✓",
    highlight: "a→f",
  },
  {
    title: "광고주 적립 (5%)",
    desc: "회원 소비지출의 5%를 가입시킨 광고주에게 적립",
    icon: "📢",
    detail: "회원이 소비지출 할 때마다\n비선형시스템 알고리즘에 의해\n지출비의 5%를 가입시킨 광고주에게 적립!\n\n광고주가 회원을 많이 가입시킬수록\n광고주 본인에게 많은 금액이 지속 적립\n\n예: 대기업 회원 가입 → 자재비 지출 크므로\n그 5%가 광고주에게 = 큰 입금액",
    highlight: "5% 적립",
  },
  {
    title: "보정 모드 + 펀드존",
    desc: "d:50M×10회 보정 → 120%(원금+20%증액)",
    icon: "🛡️",
    detail: "보정값: d:50,000,000(free) × 10회\n= 500,000,000(free) + d10:500,000,000(빈로그)\n= C10:500,000,000\n\nA1:1,000,000,000 + b:200,000,000\n= A1:1,200,000,000 (멤버십 적립 120%)\n\n펀드존: 100%원금 + 20%증액 = 120%\n적립 우선순위: 은행→보험사→신용카드사→사업주→소비자",
    highlight: "120%",
  },
  {
    title: "멤버십 회원 분배",
    desc: "다른 회원들에게 지출금액 전달 → 모두 120%",
    icon: "👥",
    detail: "영희의 지출금액이 다른 멤버십 회원들에게 전달됩니다.\n\n전달받은 회원들도:\n본인 적립금에서 차감 → 비선형공식 → 120% 적립\n\n한 사람의 소비가 모든 회원에게 순환합니다.\n\n1×10=10×10=100×10=...=10^10 (100억명!)",
    highlight: "모두 120%",
  },
  {
    title: "최종 결과 → 다랜드 내 계좌에 적립",
    desc: "10,000원 결제 → 12,000P 다랜드 계좌 적립!",
    icon: "🎉",
    detail: "원금: 10,000P\n보너스: 2,000P (멤버십적립 b:20%)\n\n합계: 12,000P (120% 적립!)\n\n✅ 다랜드 내 계좌에 12,000P 적립\n✅ 등록된 은행계좌로 출금 가능 (1P = 1원)\n✅ 광고주에게 5% 적립 (500P)\n✅ 데이터에 의한 기본소득 창출\n✅ 모두가 사용자 — 가맹점 구분 없음",
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
        {/* 시작 버튼 */}
        {activeStep === -1 && !showFormula && (
          <button
            onClick={goNext}
            className="mb-6 w-full rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 py-4 text-base font-bold text-white shadow-lg shadow-purple-500/20 transition-transform hover:scale-[1.02] active:scale-95"
          >
            비선형공식 실행하기
          </button>
        )}

        {/* 진행률 */}
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
            <div className="mt-1 text-2xl font-black text-cyan-400">신용카드 10,000원 결제</div>
          </div>
        )}

        {/* 스텝 카드 */}
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
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                  style={{
                    background: i === activeStep
                      ? "linear-gradient(135deg, rgba(168, 85, 247, 0.3), rgba(6, 182, 212, 0.3))"
                      : "rgba(168, 85, 247, 0.1)",
                  }}
                >
                  {step.icon}
                </div>
                <div className="flex-1 min-w-0">
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
                        }}
                      >
                        {step.highlight}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs dark-text-muted text-zinc-500">{step.desc}</p>
                  {i === activeStep && (
                    <>
                      <div
                        className="mt-3 rounded-xl p-3 text-sm leading-relaxed"
                        style={{
                          background: "rgba(168, 85, 247, 0.08)",
                          color: "var(--text-muted)",
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
              {i < STEPS.length - 1 && i <= activeStep && (
                <div className="flex justify-center pb-1">
                  <div className="h-4 w-0.5 rounded-full" style={{ background: "linear-gradient(to bottom, rgba(168, 85, 247, 0.4), transparent)" }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 처음부터 다시 */}
        {showFormula && (
          <button onClick={reset} className="mt-4 w-full rounded-2xl border border-purple-500/30 py-3 text-sm font-bold text-purple-400">
            처음부터 다시 보기
          </button>
        )}

        {/* 최종 공식 요약 */}
        {showFormula && (
          <div className="mt-6 rounded-2xl border border-purple-500/30 p-6 text-center"
            style={{ background: "linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-to))" }}>
            <div className="text-sm font-bold text-purple-400">비선형공식 요약</div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-black/10 px-4 py-2">
                <span className="dark-text-muted text-zinc-500">신용카드 결제</span>
                <span className="font-bold text-rose-400">10,000원</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-black/10 px-4 py-2">
                <span className="dark-text-muted text-zinc-500">지출데이터 증명</span>
                <span className="font-bold text-cyan-400">✅ 완료</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-black/10 px-4 py-2">
                <span className="dark-text-muted text-zinc-500">충전데이터 차감</span>
                <span className="font-bold text-rose-400">-10,000P</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-black/10 px-4 py-2">
                <span className="dark-text-muted text-zinc-500">A1: 본인 적립 (50%)</span>
                <span className="font-bold text-amber-400">5,000P</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-black/10 px-4 py-2">
                <span className="dark-text-muted text-zinc-500">B1: 회원 분배 (50%)</span>
                <span className="font-bold text-amber-400">5,000P</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-black/10 px-4 py-2">
                <span className="dark-text-muted text-zinc-500">멤버십 풀 (x10)</span>
                <span className="font-bold text-cyan-400">50,000P</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-black/10 px-4 py-2">
                <span className="dark-text-muted text-zinc-500">이탈모드 → 결합모드</span>
                <span className="font-bold text-amber-400">C1:4x → 결합</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-black/10 px-4 py-2">
                <span className="dark-text-muted text-zinc-500">a→f 분배 체인</span>
                <span className="font-bold text-purple-400">500M = b+c+d+e+f</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-black/10 px-4 py-2">
                <span className="dark-text-muted text-zinc-500">광고주 적립</span>
                <span className="font-bold text-orange-400">지출비의 5%</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-black/10 px-4 py-2">
                <span className="dark-text-muted text-zinc-500">보정모드 + 펀드존</span>
                <span className="font-bold text-cyan-400">120% (원금+20%)</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-black/10 px-4 py-2">
                <span className="dark-text-muted text-zinc-500">회원 분배</span>
                <span className="font-bold text-emerald-400">모두 120%</span>
              </div>
              <div className="mt-3 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-base font-bold">최종 적립</span>
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-2xl font-black text-transparent">12,000P</span>
              </div>
              <div className="inline-block rounded-full bg-gradient-to-r from-rose-500 to-orange-400 px-5 py-1.5 text-sm font-bold text-white">
                120% 적립 달성!
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-black/10 p-4 text-left text-xs leading-relaxed dark-text-muted text-zinc-400">
              <div className="mb-2 text-sm font-bold text-purple-300">핵심 원리</div>
              <p>다랜드에는 가맹점이 없습니다. <strong>모두가 사용자</strong>입니다.</p>
              <p className="mt-1">사용자가 신용카드로 결제하면 지출데이터 단말기가 증명하고, 본인 충전데이터에서 차감된 금액이 비선형공식으로 분배되어 120% 증액 적립됩니다.</p>
              <p className="mt-1">회원 소비지출의 5%가 가입시킨 광고주에게 적립됩니다. 이로서 <strong>데이터에 의한 기본소득</strong>이 창출됩니다.</p>
              <p className="mt-1">이 지출금액은 다른 멤버십 회원들에게도 전달되어, 그들도 120% 적립을 받습니다.</p>
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
      `}</style>
    </div>
  );
}
