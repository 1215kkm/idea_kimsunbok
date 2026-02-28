"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";

type PaymentMethod = "credit-card" | "bank-account" | "virtual-account" | "cms-auto";

interface PaymentOption {
  id: PaymentMethod;
  name: string;
  icon: string;
  desc: string;
}

const PAYMENT_METHODS: PaymentOption[] = [
  { id: "credit-card", name: "신용카드", icon: "💳", desc: "신용(현금)카드 결제" },
  { id: "bank-account", name: "은행계좌", icon: "🏦", desc: "은행 결제계좌 연동" },
  { id: "virtual-account", name: "가상계좌", icon: "🔢", desc: "CMS 가상계좌 발급" },
  { id: "cms-auto", name: "CMS자동이체", icon: "🔄", desc: "CMS 자동이체 등록" },
];

export default function CMSRegisterPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  const handleComplete = () => {
    setRegistered(true);
  };

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-zinc-500">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <div className="dark-header border-b border-purple-900/20 bg-[#0d0d30]/80 px-5 py-4 pl-16">
        <h1 className="text-lg font-bold">CMS 온라인 가입센터</h1>
        <p className="text-xs text-zinc-500">CMS 가상계좌에 의한 소비자 가입</p>
      </div>

      <div className="mx-auto max-w-lg px-5 py-6">
        {/* 진행 단계 */}
        <div className="mb-6 flex items-center gap-2">
          {["결제수단", "계좌연동", "완료"].map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  background: i <= step ? "linear-gradient(135deg, #a855f7, #06b6d4)" : "rgba(255,255,255,0.1)",
                  color: i <= step ? "white" : "#71717a",
                }}
              >
                {i + 1}
              </div>
              <span className={`text-xs ${i <= step ? "text-white" : "text-zinc-600"}`}>{label}</span>
              {i < 2 && <div className="h-px flex-1 bg-zinc-800" />}
            </div>
          ))}
        </div>

        {/* Step 0: 결제수단 선택 */}
        {step === 0 && !registered && (
          <div>
            <div className="mb-4 rounded-2xl border border-cyan-500/20 p-4"
              style={{ background: "linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(168, 85, 247, 0.08))" }}>
              <div className="text-sm font-bold text-cyan-400 mb-2">결제수단 선택</div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                CMS 가상계좌에 의한 소비자 가입 회원의 결제수단을 선택해주세요.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className="flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all active:scale-95"
                  style={{
                    borderColor: selectedMethod === method.id ? "rgba(168, 85, 247, 0.6)" : "rgba(88, 28, 135, 0.2)",
                    background: selectedMethod === method.id
                      ? "linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(6, 182, 212, 0.15))"
                      : "#14143c",
                  }}
                >
                  <span className="text-3xl">{method.icon}</span>
                  <div className="text-sm font-bold">{method.name}</div>
                  <div className="text-[10px] text-zinc-500">{method.desc}</div>
                </button>
              ))}
            </div>

            {selectedMethod && (
              <button
                onClick={() => setStep(1)}
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 py-3 text-sm font-bold text-white"
              >
                다음 단계 →
              </button>
            )}
          </div>
        )}

        {/* Step 1: 비선형시스템 계좌 연동 */}
        {step === 1 && !registered && (
          <div>
            <div className="mb-4 rounded-2xl border border-purple-500/20 p-4 bg-[#14143c]">
              <div className="text-sm font-bold text-purple-400 mb-3">비선형시스템 계좌 연동</div>

              {/* 고유번호 */}
              <div className="mb-3">
                <label className="text-xs text-zinc-500 mb-1 block">소비자 회원 고유번호</label>
                <div className="flex items-center gap-2 rounded-xl border border-purple-900/30 bg-[#0d0d30] px-4 py-3">
                  <span className="text-xs text-purple-400 font-mono">NL-</span>
                  <span className="text-sm font-mono text-white">{user.uid.slice(0, 12).toUpperCase()}</span>
                  <span className="ml-auto text-[10px] text-emerald-400">자동생성</span>
                </div>
              </div>

              {/* 설명 */}
              <div className="rounded-xl bg-purple-900/10 border border-purple-500/10 p-3 text-xs text-zinc-400 leading-relaxed space-y-2">
                <p><strong className="text-white">비선형시스템 계좌</strong>에 소비자 회원의 고유번호에 의해 회원이 본인 계좌로 출금 가능합니다.</p>
                <p>결제수단: <span className="text-cyan-400">{PAYMENT_METHODS.find(m => m.id === selectedMethod)?.name}</span></p>
              </div>

              {/* 지출종류 안내 */}
              <div className="mt-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10 p-3">
                <div className="text-xs font-bold text-cyan-400 mb-2">판매자(또다른 소비자) & 소비자 지출종류</div>
                <div className="grid grid-cols-2 gap-1 text-[10px] text-zinc-400">
                  <span>a: 식자재</span>
                  <span>b: 인건비</span>
                  <span>c: 임대료</span>
                  <span>d: 공과금</span>
                  <span>e: 세금</span>
                  <span>f: 대출상환금</span>
                  <span>g: 투자금</span>
                  <span>h: 의.식.주.기타생활비</span>
                </div>
              </div>

              {/* 동의 */}
              <label className="mt-4 flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 accent-purple-500"
                />
                <span className="text-xs text-zinc-400 leading-relaxed">
                  CMS 자동이체 약관에 동의하며, 비선형시스템 계좌를 통해 결제수단을 등록합니다.
                </span>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(0)}
                className="flex-1 rounded-xl border border-purple-500/30 py-3 text-sm text-zinc-400"
              >
                ← 이전
              </button>
              <button
                onClick={() => { setStep(2); handleComplete(); }}
                disabled={!agreed}
                className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 py-3 text-sm font-bold text-white disabled:opacity-40"
              >
                가입 완료 →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: 완료 */}
        {registered && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-xl font-bold mb-2">CMS 가입 완료</h2>
            <p className="text-sm text-zinc-400 mb-4">비선형시스템 계좌가 생성되었습니다.</p>

            <div className="rounded-2xl border border-purple-500/20 bg-[#14143c] p-5 text-left">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">회원 고유번호</span>
                  <span className="font-mono text-purple-400">NL-{user.uid.slice(0, 12).toUpperCase()}</span>
                </div>
                <div className="h-px bg-zinc-800" />
                <div className="flex justify-between">
                  <span className="text-zinc-500">결제수단</span>
                  <span className="text-white font-bold">{PAYMENT_METHODS.find(m => m.id === selectedMethod)?.name}</span>
                </div>
                <div className="h-px bg-zinc-800" />
                <div className="flex justify-between">
                  <span className="text-zinc-500">계좌 상태</span>
                  <span className="text-emerald-400 font-bold">활성</span>
                </div>
                <div className="h-px bg-zinc-800" />
                <div className="flex justify-between">
                  <span className="text-zinc-500">적립 방식</span>
                  <span className="text-cyan-400 font-bold">120% 증액 적립</span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-zinc-400 leading-relaxed">
              <p className="text-cyan-400 font-bold mb-1">이용 안내</p>
              <p>소비자가 신용(현금)카드로 상품을 결제한 후 지출데이터가 소비자 단말기(스마트폰) & 은행결제계좌로 지출 영수증이 전달됩니다.</p>
              <p className="mt-1">비선형 시스템 & CMS 자동인식하는 <strong className="text-white">영수증 금액 추출 모드</strong>에 의해 비선형시스템에 소비자 본인의 충전된 데이터에 차감하여 비선형공식 분배 알고리즘에 의해 <strong className="text-cyan-400">120%(free) 적립</strong>됩니다.</p>
            </div>

            <button
              onClick={() => router.push("/receipt-extract")}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 py-3 text-sm font-bold text-white"
            >
              영수증 자동 추출 모드 →
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-2 w-full rounded-xl border border-purple-500/30 py-3 text-sm text-zinc-400"
            >
              대시보드로 이동
            </button>
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
