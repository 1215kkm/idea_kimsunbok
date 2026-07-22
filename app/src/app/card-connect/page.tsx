"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

/**
 * 카드 자동 연동 — 베타 기간 비활성화 안내 페이지
 *
 * 정식 키(CODEF 정식 계약) 도입 후 재오픈 예정.
 * 기존 CODEF 연동 코드는 git 히스토리로 보존됨 — 재오픈 시 되돌리기.
 */
export default function CardConnectPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-[#6B7394]">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="dark-header border-b border-[#E8EAF0] bg-white/95 px-5 py-4 pl-16 pr-16 lg:px-6">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="text-[#6B7394] hover:text-[#1A1F36]">&larr;</Link>
          <div>
            <h1 className="text-lg font-bold">카드 자동 연동</h1>
            <p className="text-xs dark-text-muted text-[#6B7394]">정식 출시 시 오픈 예정</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-5 py-10 space-y-5">
        <div className="text-center">
          <div className="text-6xl mb-3">🚧</div>
          <h2 className="text-xl font-bold text-[#3B4CCA]">베타 기간 비활성화</h2>
          <p className="mt-2 text-sm text-[#6B7394] leading-relaxed">
            카드 자동 연동은 <strong className="text-[#1A1F36]">정식 출시 시점</strong>에 오픈됩니다.<br/>
            베타 기간엔 <strong className="text-[#1A1F36]">수동 지출 등록</strong>으로 비선형공식 적립을 체험해 주세요.
          </p>
        </div>

        {/* 정식 출시 시 카드 자동연동 흐름 (의뢰자 확정 — 필히 반영) */}
        <div
          className="rounded-2xl border border-[#3B4CCA]/20 p-4"
          style={{ background: "linear-gradient(135deg, rgba(59, 76, 202, 0.05), rgba(6, 182, 212, 0.05))" }}
        >
          <div className="mb-3 text-sm font-bold text-[#3B4CCA]">🔄 정식 출시 시 자동연동 흐름</div>
          <div className="space-y-2">
            {[
              { step: "1", icon: "💳", text: "신용카드로 결제", sub: "어디서든 평소처럼 결제" },
              { step: "2", icon: "🏦", text: "은행계좌 연동 확인", sub: "결제 내역이 계좌에 반영" },
              { step: "3", icon: "📩", text: "지출금액 메시지 자동 수신", sub: "결제 금액이 다랜드로 전달" },
              { step: "4", icon: "⚙️", text: "다랜드 비선형공식 실행", sub: "멤버십 · 소비자 단계 자동 분류" },
              { step: "5", icon: "✅", text: "120% 재충전 + 금액 메시지 전달", sub: "적립 완료 알림을 즉시 받음" },
            ].map((s) => (
              <div key={s.step} className="flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2 dark-card">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3B4CCA]/10 text-[11px] font-black text-[#3B4CCA]">{s.step}</span>
                <span className="text-base">{s.icon}</span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#1A1F36]">{s.text}</div>
                  <div className="text-[10px] text-[#6B7394]">{s.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs leading-relaxed text-[#6B7394]"
        >
          <div className="mb-2 text-sm font-bold text-amber-700">📌 베타 기간 안내</div>
          <p>1. 베타 기간엔 <strong>'지출등록'</strong> 메뉴에서 카테고리·금액을 직접 입력하시면 됩니다.</p>
          <p>2. 비선형공식 120% 적립, 잔액 차감, 출금 흐름은 모두 정상 작동합니다.</p>
          <p>3. 정식 출시 후 CODEF 정식 계약을 통해 카드사별 자동 연동이 활성화됩니다.</p>
          <p>4. 정식 출시 시 별도 안내드립니다.</p>
        </div>

        <div className="flex flex-col gap-2">
          <Link
            href="/stores"
            className="block w-full rounded-2xl bg-gradient-to-r from-cyan-600 to-purple-600 py-4 text-center text-base font-bold text-white shadow-lg shadow-[#3B4CCA]/15 hover:scale-[1.02] active:scale-95 transition-transform"
          >
            💳 지출 직접 등록하러 가기
          </Link>
          <Link
            href="/dashboard"
            className="block w-full rounded-2xl border border-[#E8EAF0] bg-white py-3 text-center text-sm font-bold text-[#6B7394] hover:bg-[#F7F8FC]"
          >
            대시보드로 돌아가기
          </Link>
        </div>
      </div>

      <Navbar />
    </div>
  );
}
