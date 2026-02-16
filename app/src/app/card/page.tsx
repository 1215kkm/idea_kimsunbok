"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";

export default function CardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [balance] = useState(128400);
  const [isFlipped, setIsFlipped] = useState(false);

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

  const userName = user.displayName || "사용자";

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <div className="dark-header border-b border-purple-900/20 bg-[#0d0d30]/80 px-5 py-4 pl-16">
        <h1 className="text-lg font-bold">비선형카드</h1>
        <p className="text-xs dark-text-muted text-zinc-500">
          쓸수록 쌓이는 120%
        </p>
      </div>

      <div className="mx-auto max-w-lg px-5 py-6">
        {/* 카드 비주얼 */}
        <div className="mb-6 flex justify-center" style={{ perspective: 1000 }}>
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="relative cursor-pointer"
            style={{
              width: 320,
              height: 200,
              transformStyle: "preserve-3d",
              transition: "transform 0.6s",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0)",
            }}
          >
            {/* 앞면 */}
            <div
              className="absolute inset-0 rounded-2xl p-6"
              style={{
                backfaceVisibility: "hidden",
                background:
                  "linear-gradient(135deg, #1a0a3e 0%, #4a1a8a 40%, #0a2a5e 100%)",
                boxShadow:
                  "0 20px 40px rgba(168, 85, 247, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
              }}
            >
              {/* 카드 상단 */}
              <div className="flex items-center justify-between">
                <div className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-lg font-black text-transparent">
                  다랜드
                </div>
                <div className="text-xs text-purple-300/60">NONLINEAR</div>
              </div>

              {/* 칩 */}
              <div
                className="mt-4 h-8 w-11 rounded"
                style={{
                  background:
                    "linear-gradient(135deg, #ffd700 0%, #daa520 50%, #b8860b 100%)",
                  boxShadow: "inset 0 1px 2px rgba(255,255,255,0.3)",
                }}
              />

              {/* 카드 번호 */}
              <div className="mt-4 text-base font-bold tracking-[0.2em] text-white/80">
                **** **** **** 1215
              </div>

              {/* 하단 */}
              <div className="mt-2 flex items-end justify-between">
                <div>
                  <div className="text-[0.55rem] uppercase text-purple-300/50">
                    CARD HOLDER
                  </div>
                  <div className="text-sm font-bold text-white/90">
                    {userName}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[0.55rem] uppercase text-purple-300/50">
                    비선형신용카드
                  </div>
                  <div className="text-sm font-bold text-cyan-400">120%</div>
                </div>
              </div>
            </div>

            {/* 뒷면 */}
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                background:
                  "linear-gradient(135deg, #0a0a2e 0%, #1a1a4e 50%, #0d0d30 100%)",
                boxShadow: "0 20px 40px rgba(168, 85, 247, 0.3)",
              }}
            >
              {/* 마그네틱 바 */}
              <div
                className="mt-6 h-10 w-full"
                style={{ background: "rgba(0,0,0,0.6)" }}
              />
              <div className="p-5">
                <div className="text-[0.55rem] text-zinc-500">CVV</div>
                <div
                  className="mt-1 inline-block rounded bg-white/90 px-3 py-1 text-sm font-bold text-black"
                >
                  ***
                </div>
                <div className="mt-4 text-[0.55rem] leading-relaxed text-zinc-500">
                  이 카드는 비선형공식 기반 결제 수단입니다.
                  <br />
                  결제 금액의 120%가 포인트로 적립됩니다.
                  <br />
                  시스템에 충전된 데이터에서 차감됩니다.
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="mb-6 text-center text-xs text-zinc-600">
          카드를 탭하면 뒤집을 수 있어요
        </p>

        {/* 잔액 */}
        <div
          className="mb-4 rounded-2xl border border-cyan-500/20 p-5 text-center"
          style={{
            background:
              "linear-gradient(135deg, rgba(6, 182, 212, 0.05), rgba(168, 85, 247, 0.05))",
          }}
        >
          <div className="text-xs text-zinc-500">비선형 포인트 잔액</div>
          <div className="mt-1 text-4xl font-black text-cyan-400">
            {balance.toLocaleString()}P
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            = {balance.toLocaleString()}원 상당
          </div>
        </div>

        {/* 카드 기능 설명 */}
        <div className="space-y-3">
          <div className="text-sm font-bold text-zinc-400">
            비선형카드 특징
          </div>

          {[
            {
              icon: "💳",
              title: "결제하면 120% 적립",
              desc: "비선형카드로 결제하면 결제 금액의 120%가 포인트로 돌아옵니다.",
              color: "#06b6d4",
            },
            {
              icon: "🏦",
              title: "시스템 데이터에서 차감",
              desc: "비선형 시스템에 충전된 소비자 본인의 데이터에서 지출 금액만큼 차감됩니다.",
              color: "#a855f7",
            },
            {
              icon: "🔄",
              title: "순환 경제 참여",
              desc: "내 결제가 판매자에게 적립되고, 광고주의 투자가 다시 나에게 돌아옵니다.",
              color: "#10b981",
            },
            {
              icon: "📺",
              title: "리워드 광고 연동",
              desc: "그냥드림 광고를 시청하면 추가 포인트가 카드 잔액에 충전됩니다.",
              color: "#f59e0b",
            },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-4 rounded-2xl border p-4"
              style={{
                borderColor: item.color + "30",
                background: item.color + "08",
              }}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl"
                style={{ background: item.color + "20" }}
              >
                {item.icon}
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color: item.color }}>
                  {item.title}
                </div>
                <div className="mt-0.5 text-xs text-zinc-400">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 결제 흐름 */}
        <div
          className="mt-6 rounded-2xl border border-purple-500/20 p-5"
          style={{
            background:
              "linear-gradient(135deg, rgba(168, 85, 247, 0.05), rgba(6, 182, 212, 0.05))",
          }}
        >
          <div className="mb-3 text-sm font-bold text-purple-400">
            비선형카드 결제 흐름
          </div>
          <div className="space-y-3">
            {[
              {
                step: "1",
                text: "비선형카드로 가맹점에서 결제",
                sub: "예: 50,000원 결제",
              },
              {
                step: "2",
                text: "시스템 데이터에서 금액 차감",
                sub: "충전된 데이터 -50,000원",
              },
              {
                step: "3",
                text: "비선형공식 분배 실행",
                sub: "판매자 50% + 소비자 50% + 멤버십 풀",
              },
              {
                step: "4",
                text: "120% 적립 완료!",
                sub: "50,000원 결제 → 60,000P 적립",
              },
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                  style={{
                    background:
                      i === 3
                        ? "linear-gradient(135deg, #10b981, #06b6d4)"
                        : "linear-gradient(135deg, #a855f7, #06b6d4)",
                  }}
                >
                  {s.step}
                </div>
                <div>
                  <div className="text-sm font-bold">{s.text}</div>
                  <div className="text-xs text-zinc-500">{s.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Navbar />
    </div>
  );
}
