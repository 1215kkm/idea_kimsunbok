"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";

const SECTIONS = [
  {
    title: "자리이타 (自利利他)",
    subtitle: "스스로 이롭고, 남도 이롭게 한다",
    content:
      "자리이타는 불교에서 유래한 철학입니다.\n\n나를 이롭게 하는 것이 곧 남을 이롭게 하고,\n남을 이롭게 하는 것이 곧 나를 이롭게 합니다.\n\n다랜드는 이 정신을 경제 시스템으로 구현했습니다.",
    icon: "🙏",
    color: "#a855f7",
  },
  {
    title: "모든 사용자가 이롭다",
    subtitle: "쓴 돈의 120%가 돌아온다",
    content:
      "다랜드에는 '가맹점'이 없습니다.\n모든 참여자는 '사용자(소비자)'입니다.\n\n신용카드로 결제하면 지출데이터 단말기가 증명하고,\n본인 충전데이터에서 차감 후 비선형공식으로\n120% 증액 적립됩니다.\n\n10,000원 결제 → 12,000P 적립",
    icon: "👩",
    color: "#06b6d4",
  },
  {
    title: "멤버십 회원 분배",
    subtitle: "내 소비가 다른 회원에게도 이로움",
    content:
      "내가 신용카드로 결제하면,\n이 지출금액이 다른 멤버십 회원들에게 전달됩니다.\n\n전달받은 회원들도 본인 적립금에서 차감 →\n비선형공식 → 120% 적립\n\n한 사람의 소비가 모든 회원을 이롭게 합니다.",
    icon: "🔄",
    color: "#f59e0b",
  },
  {
    title: "광고주가 이롭다",
    subtitle: "투자 대비 120% 수익",
    content:
      "광고주(기업)가 100억원을 투자하면\n비선형공식으로 120억원의 수익이 발생합니다.\n\n광고비가 단순히 사라지는 것이 아니라\n시스템 안에서 순환하며 모두에게 돌아갑니다.",
    icon: "🏢",
    color: "#10b981",
  },
  {
    title: "선순환 경제",
    subtitle: "가난을 물리치는 시스템",
    content:
      "한 사람의 소비가 사라지지 않고\n다른 멤버십 회원에게 전달되고,\n그 회원의 소비가 다시 돌아옵니다.\n\n이것이 비선형공식이 만드는\n선순환 경제입니다.",
    icon: "💫",
    color: "#ec4899",
  },
];

export default function PhilosophyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center dark-text-muted">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="dark-header border-b border-purple-900/20 bg-[#0d0d30]/80 px-5 py-4 pl-16">
        <h1 className="text-lg font-bold">자리이타 철학</h1>
        <p className="text-xs dark-text-muted text-zinc-500">다랜드의 핵심 정신</p>
      </div>

      <div className="mx-auto max-w-lg px-5 py-6">
        {/* 순환 다이어그램 */}
        <div className="mb-6 rounded-2xl border border-purple-500/20 p-6"
          style={{ background: "linear-gradient(135deg, rgba(168, 85, 247, 0.05), rgba(6, 182, 212, 0.05))" }}>
          <div className="mb-4 text-center text-sm font-bold text-purple-400">사용자 순환 구조</div>

          <div className="relative mx-auto" style={{ width: 260, height: 240 }}>
            {/* 중심 */}
            <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full text-center"
              style={{ background: "linear-gradient(135deg, #a855f7, #06b6d4)", boxShadow: "0 0 30px rgba(168, 85, 247, 0.3)" }}>
              <div className="text-[0.5rem] text-white/70">비선형</div>
              <div className="text-sm font-black text-white">120%</div>
            </div>

            {/* 사용자A (상단) */}
            <div className="absolute left-1/2 top-0 flex -translate-x-1/2 flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full text-2xl"
                style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)", border: "2px solid #22d3ee" }}>
                👩
              </div>
              <div className="mt-1 text-xs font-bold">사용자A</div>
              <div className="text-[0.6rem] text-cyan-400">120% 적립</div>
            </div>

            {/* 사용자B (좌하) */}
            <div className="absolute bottom-0 left-0 flex flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full text-2xl"
                style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", border: "2px solid #fbbf24" }}>
                👨
              </div>
              <div className="mt-1 text-xs font-bold">사용자B</div>
              <div className="text-[0.6rem] text-amber-400">120% 적립</div>
            </div>

            {/* 광고주 (우하) */}
            <div className="absolute bottom-0 right-0 flex flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full text-2xl"
                style={{ background: "linear-gradient(135deg, #10b981, #059669)", border: "2px solid #34d399" }}>
                🏢
              </div>
              <div className="mt-1 text-xs font-bold">광고주</div>
              <div className="text-[0.6rem] text-emerald-400">120% 수익</div>
            </div>

            <svg className="absolute inset-0" viewBox="0 0 260 240" fill="none">
              <path d="M110 55 Q40 100 55 175" stroke="#06b6d4" strokeWidth="2" strokeDasharray="5 3" opacity="0.5" />
              <polygon points="50,170 60,178 55,168" fill="#06b6d4" opacity="0.7" />
              <path d="M95 210 Q130 230 195 210" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 3" opacity="0.5" />
              <polygon points="190,205 200,212 192,215" fill="#f59e0b" opacity="0.7" />
              <path d="M215 175 Q220 100 155 55" stroke="#10b981" strokeWidth="2" strokeDasharray="5 3" opacity="0.5" />
              <polygon points="160,58 150,50 155,62" fill="#10b981" opacity="0.7" />
            </svg>
          </div>

          <p className="mt-4 text-center text-xs text-zinc-500">
            사용자A 지출 → 멤버십 회원 분배 → 광고주 투자 → 다시 사용자에게
          </p>
        </div>

        {/* 섹션 탭 */}
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {SECTIONS.map((s, i) => (
            <button key={i} onClick={() => setActiveSection(i)}
              className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all"
              style={{
                background: i === activeSection ? s.color + "33" : "rgba(255,255,255,0.05)",
                borderColor: i === activeSection ? s.color : "transparent",
                border: "1px solid",
                color: i === activeSection ? s.color : "#888",
              }}>
              <span>{s.icon}</span>
              {s.title.split(" ")[0]}
            </button>
          ))}
        </div>

        {/* 활성 섹션 */}
        <div className="rounded-2xl border p-6"
          style={{ borderColor: SECTIONS[activeSection].color + "40", background: "linear-gradient(135deg, " + SECTIONS[activeSection].color + "08, transparent)" }}>
          <div className="mb-2 text-3xl">{SECTIONS[activeSection].icon}</div>
          <h2 className="text-xl font-black" style={{ color: SECTIONS[activeSection].color }}>{SECTIONS[activeSection].title}</h2>
          <p className="mt-1 text-sm text-zinc-400">{SECTIONS[activeSection].subtitle}</p>
          <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-zinc-300">{SECTIONS[activeSection].content}</div>
        </div>

        {/* 핵심 명언 */}
        <div className="mt-6 rounded-2xl border border-purple-500/20 p-5 text-center"
          style={{ background: "linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(6, 182, 212, 0.08))" }}>
          <div className="text-2xl">🙏</div>
          <p className="mt-2 text-base font-bold italic text-purple-300">&ldquo;자리이타 이타자리&rdquo;</p>
          <p className="mt-1 text-xs text-zinc-500">스스로 이롭고 남도 이롭게 — 남이 이로우면 나도 이롭다</p>
          <div className="mx-auto mt-3 h-px w-20 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
          <p className="mt-3 text-sm font-bold text-cyan-400">&ldquo;항아리 속의 물 총량은 같다. 바가지만 바뀔 뿐.&rdquo;</p>
          <p className="mt-1 text-xs text-zinc-500">돈이 새로 생기는 것이 아니라, 순환하여 모두에게 돌아가는 구조</p>
        </div>
      </div>

      <Navbar />
    </div>
  );
}
