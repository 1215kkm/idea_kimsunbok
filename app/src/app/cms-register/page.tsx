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
  const [aspAgreed, setAspAgreed] = useState(false);
  const [cmsAgreed, setCmsAgreed] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  const handleComplete = () => {
    setRegistered(true);
  };

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-[#6B7394]">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <div className="dark-header border-b border-[#E8EAF0] bg-white/95 px-5 py-4 pl-16 pr-16">
        <h1 className="text-lg font-bold">CMS 자동이체 - ASP 서비스 등록</h1>
        <p className="text-sm text-[#6B7394]">ASP 서비스 이용료 결제를 위한 CMS 자동이체 등록</p>
      </div>

      <div className="mx-auto max-w-lg px-5 py-6">
        {/* 진행 단계 */}
        <div className="mb-6 flex items-center gap-1">
          {["결제수단", "ASP 약관", "계좌연동", "완료"].map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-1">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                style={{
                  background: i <= step ? "linear-gradient(135deg, #a855f7, #06b6d4)" : "rgba(255,255,255,0.1)",
                  color: i <= step ? "white" : "#71717a",
                }}
              >
                {i + 1}
              </div>
              <span className={`text-[12px] ${i <= step ? "text-[#3B4CCA] font-bold" : "text-[#9CA3C1]"}`}>{label}</span>
              {i < 3 && <div className="h-px flex-1 bg-[#F0F2F8]" />}
            </div>
          ))}
        </div>

        {/* Step 0: 결제수단 선택 */}
        {step === 0 && !registered && (
          <div>
            <div className="mb-4 rounded-2xl border border-cyan-500/20 p-4"
              style={{ background: "linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(168, 85, 247, 0.08))" }}>
              <div className="text-sm font-bold text-[#3B4CCA] mb-2">결제수단 선택</div>
              <p className="text-sm text-[#6B7394] leading-relaxed">
                ASP 서비스 이용료를 결제할 수단을 선택해주세요.
              </p>
            </div>

            {/* ASP 서비스 안내 */}
            <div className="mb-4 rounded-xl bg-[#F7F8FC] border border-[#E8EAF0] p-3">
              <div className="text-sm font-bold text-[#1A1F36] mb-1">ASP(Application Service Provider) 서비스란?</div>
              <p className="text-[12px] text-[#6B7394] leading-relaxed">
                고가의 소프트웨어 구입 및 유지비 대신, 사내 네트워크 망을 통해 다랜드 서버에 접속하여 원하는 시스템을 이용하고 매월 서비스 이용료를 지불하는 방식입니다.
              </p>
            </div>

            {/* 효성CMS 파트너십 안내 */}
            <div className="mb-4 rounded-xl border border-[#3B4CCA]/20 bg-[#3B4CCA]/5 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center rounded-full bg-[#3B4CCA] px-2 py-0.5 text-[13px] font-bold text-white">효성CMS 파트너</span>
                <span className="text-[13px] text-[#6B7394]">450만 파트너사 네트워크</span>
              </div>
              <p className="text-[12px] text-[#6B7394] leading-relaxed">
                다랜드는 <strong className="text-[#1A1F36]">효성CMS 파트너 회사</strong>로서, 450만 파트너사를 보유한 효성CMS의 안정적인 금융 인프라를 통해 서비스 이용료를 처리합니다. 금융허브 기능은 모두 효성CMS에서 담당합니다.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-[#10B981]/30 bg-[#10B981]/10 px-2 py-0.5 text-[13px] text-[#10B981] font-bold">글로벌 서비스</span>
                <span className="text-[13px] text-[#6B7394]">국내외 신용(현금)카드 사용 가능</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className="flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all active:scale-95"
                  style={{
                    borderColor: selectedMethod === method.id ? "rgba(168, 85, 247, 0.6)" : "var(--card-border)",
                    background: selectedMethod === method.id
                      ? "linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(6, 182, 212, 0.15))"
                      : "var(--card-bg)",
                    color: "var(--text-main, #1A1F36)",
                  }}
                >
                  <span className="text-3xl">{method.icon}</span>
                  <div className="text-sm font-bold">{method.name}</div>
                  <div className="text-[12px] text-[#6B7394]">{method.desc}</div>
                </button>
              ))}
            </div>

            {selectedMethod && (
              <button
                onClick={() => setStep(1)}
                className="mt-4 w-full rounded-xl bg-[#FFB800] py-3 text-sm font-bold text-[#1A1F36]"
              >
                다음 단계 →
              </button>
            )}
          </div>
        )}

        {/* Step 1: ASP 서비스 이용 약관 동의 */}
        {step === 1 && !registered && (
          <div>
            <div className="mb-4 rounded-2xl border border-purple-500/20 p-4 bg-white">
              <div className="text-sm font-bold text-[#3B4CCA] mb-3">ASP 서비스 이용 약관</div>

              {/* ASP 서비스 수수료 안내 */}
              <div className="mb-3 rounded-xl bg-[#F7F8FC] border border-[#E8EAF0] p-3">
                <div className="text-sm font-bold text-[#1A1F36] mb-2">서비스 이용료 구조</div>
                <div className="space-y-2 text-[13px] text-[#6B7394] leading-relaxed">
                  <div className="flex items-start gap-2">
                    <span className="text-[#3B4CCA] font-bold mt-0.5">1.</span>
                    <span>CMS 자동이체는 <strong className="text-[#1A1F36]">ASP 서비스 이용료(소비자 지출 비용)</strong>만 청구합니다.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#3B4CCA] font-bold mt-0.5">2.</span>
                    <span>ASP 서비스 이용료는 거래 금액의 <strong className="text-[#3B4CCA]">1%</strong>로 산정되며, 매월 자동이체됩니다.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#3B4CCA] font-bold mt-0.5">3.</span>
                    <span>ASP 이용료 납부 시 비선형 공식에 의해 <strong className="text-[#3B4CCA]">120% 증액 적립</strong>되어 비용 부담이 상쇄됩니다.</span>
                  </div>
                </div>
              </div>

              {/* 다랜드 역할 한정 안내 */}
              <div className="mb-3 rounded-xl border border-[#3B4CCA]/20 bg-[#3B4CCA]/5 p-3">
                <div className="text-sm font-bold text-[#3B4CCA] mb-2">다랜드의 역할</div>
                <p className="text-[12px] text-[#6B7394] leading-relaxed mb-2">
                  다랜드는 소비자의 지출금액을 충전된 데이터에서 차감하여 비선형 공식으로 <strong className="text-[#3B4CCA]">120% 증액 적립하는 역할만 수행</strong>합니다. 그 외 판매자 & 소비자가 자체적으로 적립금액을 집행합니다.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full bg-purple-100 border border-purple-200 px-2 py-0.5 text-[13px] text-purple-700 font-bold">특허 출원 완료</span>
                  <span className="text-[13px] text-[#6B7394]">피타고라스 공식 기반 수학적 산식</span>
                </div>
              </div>

              {/* CMS/비선형 분리 안내 */}
              <div className="mb-3 rounded-xl bg-amber-50 border border-amber-200 p-3">
                <div className="text-sm font-bold text-amber-800 mb-1">CMS 청구 범위 안내</div>
                <div className="space-y-1 text-[12px] text-amber-700 leading-relaxed">
                  <p>- CMS 자동이체 대상: <strong>소비자가 실제 지출하는 ASP 서비스 이용료</strong></p>
                  <p>- CMS 자동이체 비대상: 다랜드 내부 멤버십 비선형시스템 운영 관련 금액</p>
                  <p>- 금융허브 기능: 효성CMS에서 처리 (다랜드 자체 처리 아님)</p>
                  <p>- 비선형 리워드 적립은 다랜드 내부 시스템에서 별도 처리됩니다.</p>
                </div>
              </div>

              {/* 간단한 운영 안내 */}
              <div className="mb-3 rounded-xl bg-[#10B981]/5 border border-[#10B981]/20 p-3">
                <div className="text-sm font-bold text-[#10B981] mb-1">간단한 운영 구조</div>
                <p className="text-[12px] text-[#6B7394] leading-relaxed">
                  판매자 = 또 다른 소비자로서, 일반 쇼핑몰 & 회원제 운영 시스템보다 더 간단하게 운영할 수 있습니다.
                </p>
              </div>

              {/* 지출종류 안내 */}
              <div className="mb-3 rounded-xl bg-[#3B4CCA]/5 border border-cyan-500/10 p-3">
                <div className="text-sm font-bold text-[#3B4CCA] mb-2">ASP 서비스 적용 지출종류</div>
                <div className="grid grid-cols-2 gap-1 text-[12px] text-[#6B7394]">
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

              {/* 동의 체크박스 */}
              <label className="mt-3 flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aspAgreed}
                  onChange={(e) => setAspAgreed(e.target.checked)}
                  className="mt-1 accent-purple-500"
                />
                <span className="text-sm text-[#6B7394] leading-relaxed">
                  ASP 서비스 이용 약관에 동의하며, CMS 자동이체가 서비스 이용료에만 적용됨을 확인합니다. 내부 비선형 리워드 시스템은 CMS 청구 대상이 아님을 이해합니다.
                </span>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(0)}
                className="flex-1 rounded-xl border border-purple-500/30 py-3 text-sm text-[#6B7394]"
              >
                ← 이전
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!aspAgreed}
                className="flex-1 rounded-xl bg-[#FFB800] py-3 text-sm font-bold text-[#1A1F36] disabled:opacity-40"
              >
                다음 단계 →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: 서비스 계좌 연동 */}
        {step === 2 && !registered && (
          <div>
            <div className="mb-4 rounded-2xl border border-purple-500/20 p-4 bg-white">
              <div className="text-sm font-bold text-[#3B4CCA] mb-3">서비스 이용 계좌 연동</div>

              {/* 결제수단 확인 */}
              <div className="mb-3">
                <label className="text-sm text-[#6B7394] mb-1 block">선택된 결제수단</label>
                <div className="flex items-center gap-2 rounded-xl border border-[#E8EAF0] bg-white px-4 py-3">
                  <span className="text-lg">{PAYMENT_METHODS.find(m => m.id === selectedMethod)?.icon}</span>
                  <span className="text-sm font-bold text-[#1A1F36]">{PAYMENT_METHODS.find(m => m.id === selectedMethod)?.name}</span>
                  <span className="ml-auto text-[12px] text-[#10B981]">선택완료</span>
                </div>
              </div>

              {/* ASP 서비스 요금 안내 */}
              <div className="mb-3">
                <label className="text-sm text-[#6B7394] mb-1 block">ASP 서비스 이용료율</label>
                <div className="flex items-center gap-2 rounded-xl border border-[#E8EAF0] bg-white px-4 py-3">
                  <span className="text-sm text-[#3B4CCA] font-bold">1%</span>
                  <span className="text-sm text-[#6B7394]">/ 월 거래 금액 기준</span>
                  <span className="ml-auto text-[12px] text-[#10B981]">자동산정</span>
                </div>
              </div>

              {/* CMS 자동이체 동의 */}
              <div className="rounded-xl bg-[#F7F8FC] border border-[#E8EAF0] p-3 text-sm text-[#6B7394] leading-relaxed space-y-2">
                <p><strong className="text-[#1A1F36]">CMS 자동이체 안내</strong></p>
                <p>선택하신 결제수단으로 매월 ASP 서비스 이용료가 자동이체됩니다. 청구 금액은 해당 월의 거래 금액 합계 x 1%로 산정됩니다.</p>
              </div>

              {/* CMS 동의 */}
              <label className="mt-4 flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cmsAgreed}
                  onChange={(e) => setCmsAgreed(e.target.checked)}
                  className="mt-1 accent-purple-500"
                />
                <span className="text-sm text-[#6B7394] leading-relaxed">
                  CMS 자동이체 약관에 동의하며, 매월 ASP 서비스 이용료가 자동이체됨을 확인합니다.
                </span>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 rounded-xl border border-purple-500/30 py-3 text-sm text-[#6B7394]"
              >
                ← 이전
              </button>
              <button
                onClick={() => { setStep(3); handleComplete(); }}
                disabled={!cmsAgreed}
                className="flex-1 rounded-xl bg-[#FFB800] py-3 text-sm font-bold text-[#1A1F36] disabled:opacity-40"
              >
                가입 완료 →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: 완료 */}
        {registered && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-xl font-bold mb-2 text-[#1A1F36]">CMS 자동이체 등록 완료</h2>
            <p className="text-sm text-[#6B7394] mb-4">ASP 서비스 이용을 위한 CMS 자동이체가 등록되었습니다.</p>

            {/* 파트너십 뱃지 */}
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              <span className="inline-flex items-center rounded-full bg-[#3B4CCA] px-3 py-1 text-[12px] font-bold text-white">효성CMS 파트너</span>
              <span className="inline-flex items-center rounded-full border border-purple-300 bg-purple-50 px-3 py-1 text-[12px] font-bold text-purple-700">특허 출원 기술</span>
              <span className="inline-flex items-center rounded-full border border-[#10B981]/30 bg-[#10B981]/10 px-3 py-1 text-[12px] font-bold text-[#10B981]">글로벌 서비스</span>
            </div>

            {/* CMS 청구 정보 카드 */}
            <div className="rounded-2xl border border-[#E8EAF0] bg-white p-5 text-left mb-4">
              <div className="text-sm font-bold text-[#3B4CCA] mb-3">CMS 자동이체 정보</div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#6B7394]">결제수단</span>
                  <span className="text-[#1A1F36] font-bold">{PAYMENT_METHODS.find(m => m.id === selectedMethod)?.name}</span>
                </div>
                <div className="h-px bg-[#F0F2F8]" />
                <div className="flex justify-between">
                  <span className="text-[#6B7394]">서비스 이용료율</span>
                  <span className="text-[#3B4CCA] font-bold">거래액의 1% / 월</span>
                </div>
                <div className="h-px bg-[#F0F2F8]" />
                <div className="flex justify-between">
                  <span className="text-[#6B7394]">청구 방식</span>
                  <span className="text-[#1A1F36] font-bold">효성CMS 자동이체</span>
                </div>
                <div className="h-px bg-[#F0F2F8]" />
                <div className="flex justify-between">
                  <span className="text-[#6B7394]">CMS 파트너</span>
                  <span className="text-[#1A1F36] font-bold">효성CMS (450만사)</span>
                </div>
                <div className="h-px bg-[#F0F2F8]" />
                <div className="flex justify-between">
                  <span className="text-[#6B7394]">서비스 범위</span>
                  <span className="text-[#10B981] font-bold">글로벌 (국내외 카드)</span>
                </div>
                <div className="h-px bg-[#F0F2F8]" />
                <div className="flex justify-between">
                  <span className="text-[#6B7394]">등록 상태</span>
                  <span className="text-[#10B981] font-bold">활성</span>
                </div>
              </div>
            </div>

            {/* 비선형 리워드 안내 (별도 분리) */}
            <div className="rounded-2xl border border-purple-500/20 bg-white p-5 text-left mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-bold text-purple-600">비선형 리워드 시스템 (별도 운영)</span>
                <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[12px] font-bold text-purple-600">특허 출원</span>
              </div>
              <div className="space-y-2 text-[13px] text-[#6B7394] leading-relaxed">
                <p>ASP 서비스 이용료 납부 시, 다랜드 내부 비선형 공식에 의해 <strong className="text-[#3B4CCA]">120% 증액 적립</strong>이 별도로 진행됩니다.</p>
                <p>비선형 공식은 <strong className="text-[#1A1F36]">피타고라스 공식에 근거한 수학적 산식</strong>으로 특허 출원이 완료되었습니다.</p>
                <p>비선형 리워드는 CMS 자동이체와 별개의 내부 시스템으로 운영되며, CMS 청구 금액에는 포함되지 않습니다.</p>
              </div>
              <div className="mt-3 flex justify-between items-center rounded-xl bg-purple-50 px-3 py-2">
                <span className="text-[12px] text-purple-600">적립 방식</span>
                <span className="text-sm text-purple-700 font-bold">비선형 공식 120% 증액 (내부)</span>
              </div>
              <div className="mt-2 text-[12px] text-[#6B7394] leading-relaxed">
                다랜드의 역할: 지출금액 차감 → 120% 증액 적립만 수행. 금융허브 기능은 효성CMS에서 처리.
              </div>
            </div>

            {/* 이용 안내 */}
            <div className="rounded-xl border border-cyan-500/20 bg-[#3B4CCA]/5 p-3 text-sm text-[#6B7394] leading-relaxed text-left">
              <p className="text-[#3B4CCA] font-bold mb-1">이용 안내</p>
              <p>소비자가 신용(현금)카드로 상품을 결제한 후 지출데이터가 소비자 단말기(스마트폰) & 은행결제계좌로 지출 영수증이 전달됩니다.</p>
              <p className="mt-1">CMS 자동이체로 ASP 서비스 이용료가 청구되며, 비선형시스템에서 별도로 <strong className="text-[#3B4CCA]">120%(free) 적립</strong>이 진행됩니다.</p>
            </div>

            <button
              onClick={() => router.push("/receipt-extract")}
              className="mt-4 w-full rounded-xl bg-[#FFB800] py-3 text-sm font-bold text-[#1A1F36]"
            >
              영수증 자동 추출 모드 →
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-2 w-full rounded-xl border border-purple-500/30 py-3 text-sm text-[#6B7394]"
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
