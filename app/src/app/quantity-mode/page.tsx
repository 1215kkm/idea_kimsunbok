"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

const STAGES = [
  {
    n: 1,
    title: "이체",
    desc: "회원이 본인 오프계좌로 충전된 금액을 이체",
    detail: "지출금액만큼 비선형공식에 분배 → 120%(20%×5) 확보",
    color: "#a855f7",
  },
  {
    n: 2,
    title: "분배",
    desc: "광고주가 신규 가입회원에게 분배 (리워드 광고)",
    detail: "분배도 지출이라 광고주 충전금액에서 차감 → 120% 재확보",
    color: "#06b6d4",
  },
  {
    n: 3,
    title: "신용카드 결제",
    desc: "회원이 신용(현금)카드로 어디서든 결제",
    detail:
      "지출 영수증으로 다랜드 비선형시스템 충전금액에서 차감 (은행 직행 X)",
    color: "#f59e0b",
  },
  {
    n: 4,
    title: "비선형공식 분배",
    desc: "차감된 금액을 비선형공식 분배 알고리즘에 투입",
    detail: "10,000,000(빈로그) × 12,000,000(free) = 12,000,000",
    color: "#10b981",
  },
  {
    n: 5,
    title: "다랜드 계좌 재충전",
    desc: "12,000,000을 다랜드 소비자 계좌에 재충전",
    detail:
      "은행 계좌로 직행하지 않고, 한 번 더 다랜드 내 계좌에 재충전 → 총량 유지",
    color: "#ec4899",
  },
];

export default function QuantityModePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center dark-text-muted">
        로딩 중...
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="dark-header border-b border-[#E8EAF0] bg-white/95 px-5 py-4 pl-16 pr-16 lg:px-6">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="text-[#6B7394] hover:text-[#1A1F36]"
          >
            &larr;
          </Link>
          <div>
            <h1 className="text-lg font-bold">총량유지 모드</h1>
            <p className="text-xs dark-text-muted text-[#6B7394]">
              락(고리) 메커니즘으로 시스템 총량 유지
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-5 py-5 space-y-5">
        {/* 핵심 메시지 */}
        <div
          className="rounded-2xl border border-amber-500/30 p-5"
          style={{
            background:
              "linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(168, 85, 247, 0.08))",
          }}
        >
          <div className="text-xs font-bold text-amber-700 mb-1">
            🔗 락(고리) 메커니즘
          </div>
          <p className="text-sm text-[#1A1F36] leading-relaxed">
            아무리 많은 돈이 들어와도 지출하면 빠져나가 망하는 것은 한순간.
            <br />
            <strong className="text-[#3B4CCA]">
              지출 전에 락(고리)을 걸어
            </strong>{" "}
            비선형공식에 분배하여
            <strong className="text-[#10B981]"> 총량을 유지</strong>합니다.
          </p>
        </div>

        {/* 시스템 처리량 */}
        <div
          className="rounded-2xl border p-5 text-center"
          style={{
            borderColor: "var(--card-border)",
            background: "var(--card-bg)",
          }}
        >
          <div className="text-xs text-[#6B7394]">중앙관리서버 처리 능력</div>
          <div className="mt-1 text-3xl font-black text-[#3B4CCA]">
            초당 30만 건
          </div>
          <div className="mt-1 text-xs text-[#6B7394]">
            비선형공식 무한 반복 → 총량 유지의 기술적 적정성
          </div>
        </div>

        {/* 5단계 흐름 */}
        <div
          className="rounded-2xl border p-5"
          style={{
            borderColor: "var(--card-border)",
            background: "var(--card-bg)",
          }}
        >
          <div className="mb-4 text-sm font-bold text-[#6B7394]">
            총량유지 모드 5단계 흐름
          </div>
          <div className="space-y-3">
            {STAGES.map((s) => (
              <div key={s.n} className="flex gap-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
                  style={{ background: s.color }}
                >
                  {s.n}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-[#1A1F36]">
                    {s.title}
                  </div>
                  <div className="text-xs text-[#6B7394] mt-0.5">{s.desc}</div>
                  <div className="mt-1 rounded-lg bg-[#F7F8FC] border border-[#E8EAF0] px-2 py-1.5 text-[11px] text-[#6B7394]">
                    {s.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 기존 모드 vs 총량유지 모드 */}
        <div
          className="rounded-2xl border border-purple-500/20 p-5"
          style={{
            background:
              "linear-gradient(135deg, rgba(168, 85, 247, 0.05), rgba(6, 182, 212, 0.05))",
          }}
        >
          <div className="mb-3 text-sm font-bold text-[#3B4CCA]">
            기존 모드 (수치 예시)
          </div>
          <div className="space-y-2 text-xs">
            <div className="rounded-lg bg-white/60 px-3 py-2">
              <div className="font-bold text-[#1A1F36]">멤버십 존 단계</div>
              <div className="text-[#6B7394] mt-1">
                A1: 100,000,000 + B1: 100,000,000 → U: 400,000,000 × 1
              </div>
            </div>
            <div className="rounded-lg bg-white/60 px-3 py-2">
              <div className="font-bold text-[#1A1F36]">소비자 적립 단계</div>
              <div className="text-[#6B7394] mt-1">
                A1: 10,000,000(빈로그) × 12,000,000(free)
                <br />= 12,000,000 - a:10,000,000 = 2,000,000{" "}
                <span className="font-bold text-[#10B981]">수익</span>
              </div>
            </div>
            <div className="rounded-lg bg-white/60 px-3 py-2">
              <div className="font-bold text-[#1A1F36]">은행 이체</div>
              <div className="text-[#6B7394] mt-1">
                a: 10,000,000 → 소비자 은행 계좌에 이체
              </div>
            </div>
          </div>
        </div>

        {/* 데이터노동 */}
        <div
          className="rounded-2xl border border-emerald-500/30 p-5"
          style={{
            background:
              "linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(6, 182, 212, 0.08))",
          }}
        >
          <div className="mb-2 text-sm font-bold text-[#10B981]">
            🌱 데이터노동 (Data Labor)
          </div>
          <p className="text-xs text-[#1A1F36] leading-relaxed">
            광고주가 리워드 광고로{" "}
            <strong>지출(분배)하여도 항상 120%</strong>
            (100% 분배원금 + 20% 수익)이 가능하므로 지속할 수 있습니다.
            <br />
            <br />
            회원이 돈이 필요하면 언제라도 리워드 광고로 수익을 낼 수 있어{" "}
            <strong className="text-[#3B4CCA]">
              이 땅에 더 이상 돈이 없어 고통받는 사람이 없고, 병원비가 없어
              치료 받지 못하는 사람이 없게
            </strong>{" "}
            되는 것이 다랜드의 비전입니다.
          </p>
        </div>

        {/* 연관 메뉴 */}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/withdraw"
            className="rounded-xl border border-[#3B4CCA]/20 bg-[#3B4CCA]/5 p-3 text-center text-xs font-bold text-[#3B4CCA]"
          >
            🏦 출금하기
          </Link>
          <Link
            href="/advertiser/invite"
            className="rounded-xl border border-[#10B981]/20 bg-[#10B981]/5 p-3 text-center text-xs font-bold text-[#10B981]"
          >
            🎁 리워드 초대
          </Link>
        </div>
      </div>

      <Navbar />
    </div>
  );
}
