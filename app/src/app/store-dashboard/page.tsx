"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db, isConfigured } from "@/lib/firebase";
import Navbar from "@/components/Navbar";

interface Distribution {
  id: string;
  userName: string;
  categoryName: string;
  amount: number;
  totalAccumulation: number;
  createdAt: any;
}

// 데모 데이터
const DEMO_DISTRIBUTIONS: Distribution[] = [
  { id: "d1", userName: "이지은", categoryName: "식비", amount: 8500, totalAccumulation: 10200, createdAt: { toDate: () => new Date(Date.now() - 1000 * 60 * 30) } },
  { id: "d2", userName: "홍길동", categoryName: "마트", amount: 32000, totalAccumulation: 38400, createdAt: { toDate: () => new Date(Date.now() - 1000 * 60 * 90) } },
  { id: "d3", userName: "김민수", categoryName: "주유", amount: 70000, totalAccumulation: 84000, createdAt: { toDate: () => new Date(Date.now() - 1000 * 60 * 180) } },
  { id: "d4", userName: "박수진", categoryName: "카페", amount: 4500, totalAccumulation: 5400, createdAt: { toDate: () => new Date(Date.now() - 1000 * 60 * 60 * 5) } },
  { id: "d5", userName: "최영호", categoryName: "약국", amount: 12000, totalAccumulation: 14400, createdAt: { toDate: () => new Date(Date.now() - 1000 * 60 * 60 * 8) } },
  { id: "d6", userName: "정하늘", categoryName: "식비", amount: 25000, totalAccumulation: 30000, createdAt: { toDate: () => new Date(Date.now() - 1000 * 60 * 60 * 24) } },
  { id: "d7", userName: "한소라", categoryName: "뷰티", amount: 45000, totalAccumulation: 54000, createdAt: { toDate: () => new Date(Date.now() - 1000 * 60 * 60 * 26) } },
  { id: "d8", userName: "윤재호", categoryName: "기타", amount: 9000, totalAccumulation: 10800, createdAt: { toDate: () => new Date(Date.now() - 1000 * 60 * 60 * 48) } },
];

type TabType = "received" | "sent";

export default function MembershipDistributionPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [tab, setTab] = useState<TabType>("received");

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    if (!isConfigured || !db) {
      setDistributions(DEMO_DISTRIBUTIONS);
      return;
    }
    const fetchData = async () => {
      try {
        const q = query(collection(db!, "transactions"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const list: Distribution[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Distribution));
        setDistributions(list.length > 0 ? list : DEMO_DISTRIBUTIONS);
      } catch {
        setDistributions(DEMO_DISTRIBUTIONS);
      }
    };
    fetchData();
  }, [user]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center dark-text-muted">로딩 중...</div>;
  }

  const totalReceived = distributions.reduce((s, d) => s + Math.round(d.amount * 0.05), 0);
  const totalReceivedAccumulation = Math.round(totalReceived * 1.2);
  const totalSent = distributions.reduce((s, d) => s + d.amount, 0);
  const totalSentAccumulation = distributions.reduce((s, d) => s + d.totalAccumulation, 0);

  const formatTime = (d: Distribution) => {
    try {
      const date = d.createdAt?.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
      return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
    } catch { return "--:--"; }
  };

  const formatDate = (d: Distribution) => {
    try {
      const date = d.createdAt?.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    } catch { return "--/--"; }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <div className="dark-header border-b border-[#E8EAF0] bg-white/95 px-5 py-4 pl-16">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔄</span>
          <div>
            <h1 className="text-lg font-bold">멤버십 분배 현황</h1>
            <p className="text-xs dark-text-muted text-[#6B7394]">회원간 지출데이터 전달 & 120% 적립</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-5 py-5">
        {/* 구조 설명 */}
        <div className="rounded-2xl border border-purple-500/20 p-4 mb-4"
          style={{ background: "linear-gradient(135deg, rgba(168, 85, 247, 0.05), rgba(6, 182, 212, 0.05))" }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">💡</span>
            <div className="text-sm font-bold text-[#3B4CCA]">분배 원리</div>
          </div>
          <div className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
            다른 회원이 신용카드로 결제하면, 그 <span className="font-bold text-[#3B4CCA]">지출금액이 멤버십 회원들에게 전달</span>됩니다.
            전달받은 회원은 본인 적립금에서 차감 → 비선형공식 → <span className="font-bold text-[#10B981]">120% 증액 적립</span>됩니다.
          </div>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="dark-card rounded-xl border p-4" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
            <div className="text-xs dark-text-muted text-[#6B7394]">받은 분배 적립</div>
            <div className="mt-1 text-xl font-black text-[#10B981]">+{totalReceivedAccumulation.toLocaleString()}P</div>
            <div className="text-[10px] text-[#6B7394]">다른 회원 지출에서</div>
          </div>
          <div className="dark-card rounded-xl border p-4" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
            <div className="text-xs dark-text-muted text-[#6B7394]">내 지출 → 회원 분배</div>
            <div className="mt-1 text-xl font-black text-[#3B4CCA]">{totalSentAccumulation.toLocaleString()}P</div>
            <div className="text-[10px] text-[#6B7394]">회원들에게 전달됨</div>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab("received")}
            className="rounded-full px-4 py-1.5 text-sm font-bold transition-all"
            style={{
              background: tab === "received" ? "linear-gradient(135deg, #7b2ff7, #06b6d4)" : "var(--card-bg)",
              color: tab === "received" ? "#fff" : "var(--text-muted)",
              border: tab === "received" ? "none" : "1px solid var(--card-border)",
            }}
          >
            받은 분배
          </button>
          <button
            onClick={() => setTab("sent")}
            className="rounded-full px-4 py-1.5 text-sm font-bold transition-all"
            style={{
              background: tab === "sent" ? "linear-gradient(135deg, #7b2ff7, #06b6d4)" : "var(--card-bg)",
              color: tab === "sent" ? "#fff" : "var(--text-muted)",
              border: tab === "sent" ? "none" : "1px solid var(--card-border)",
            }}
          >
            보낸 분배
          </button>
        </div>

        {/* 분배 목록 */}
        <div className="mt-3 space-y-2">
          {distributions.length === 0 ? (
            <div className="dark-card rounded-xl border p-8 text-center text-sm"
              style={{ borderColor: "var(--card-border)", background: "var(--card-bg)", color: "var(--text-muted)" }}>
              분배 내역이 없습니다
            </div>
          ) : (
            distributions.map((d) => (
              <div key={d.id} className="dark-card flex items-center justify-between rounded-xl border px-4 py-3"
                style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3B4CCA]/10 text-lg">
                    {tab === "received" ? "📥" : "📤"}
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {tab === "received"
                        ? <><span className="text-[#6B7394]">{d.userName}</span>님 지출 분배</>
                        : <><span className="text-[#6B7394]">{d.categoryName}</span> 지출 → 회원 분배</>
                      }
                    </div>
                    <div className="text-xs dark-text-muted text-[#6B7394]">
                      {formatDate(d)} {formatTime(d)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {tab === "received" ? (
                    <>
                      <div className="text-sm font-bold text-[#10B981]">
                        +{Math.round(d.amount * 0.05 * 1.2).toLocaleString()}P
                      </div>
                      <div className="text-[10px] text-[#6B7394]">120% 적립</div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-bold text-[#3B4CCA]">
                        {d.amount.toLocaleString()}원
                      </div>
                      <div className="text-[10px] text-[#10B981]">
                        → 회원들 120% 적립
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 순환 다이어그램 */}
        <div className="mt-6 rounded-2xl border border-purple-500/20 p-5 text-center"
          style={{ background: "linear-gradient(135deg, rgba(168, 85, 247, 0.05), rgba(6, 182, 212, 0.05))" }}>
          <div className="text-sm font-bold text-[#3B4CCA] mb-3">멤버십 분배 구조</div>
          <div className="text-xs leading-relaxed text-[#6B7394] font-mono space-y-1">
            <p>회원A 신용카드 결제 (-10,000원)</p>
            <p className="text-[#3B4CCA]">↓ 지출데이터 단말기 증명</p>
            <p className="text-[#3B4CCA]">↓ 비선형공식 → 회원A: +12,000P (120%)</p>
            <p className="text-[#3B4CCA]">↓ 지출금액 → 멤버십 회원들에게 전달</p>
            <p className="text-[#10B981]">↓ 회원B,C,D... 각자 적립금 차감 → 120% 적립</p>
            <p className="text-amber-400 font-bold mt-2">= 모든 사용자가 120% 증액!</p>
          </div>
        </div>
      </div>

      <Navbar />
    </div>
  );
}
