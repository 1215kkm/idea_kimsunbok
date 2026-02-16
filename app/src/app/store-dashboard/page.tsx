"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db, isConfigured } from "@/lib/firebase";
import Navbar from "@/components/Navbar";

interface Transaction {
  id: string;
  storeName: string;
  amount: number;
  totalAccumulation: number;
  consumerId: string;
  createdAt: any;
}

// 데모 거래 데이터
const DEMO_TRANSACTIONS: Transaction[] = [
  { id: "d1", storeName: "다랜드 카페", amount: 4500, totalAccumulation: 5400, consumerId: "user1", createdAt: { toDate: () => new Date(Date.now() - 1000 * 60 * 30) } },
  { id: "d2", storeName: "다랜드 카페", amount: 8500, totalAccumulation: 10200, consumerId: "user2", createdAt: { toDate: () => new Date(Date.now() - 1000 * 60 * 90) } },
  { id: "d3", storeName: "다랜드 카페", amount: 4500, totalAccumulation: 5400, consumerId: "user3", createdAt: { toDate: () => new Date(Date.now() - 1000 * 60 * 180) } },
  { id: "d4", storeName: "다랜드 카페", amount: 12000, totalAccumulation: 14400, consumerId: "user4", createdAt: { toDate: () => new Date(Date.now() - 1000 * 60 * 60 * 5) } },
  { id: "d5", storeName: "다랜드 카페", amount: 6000, totalAccumulation: 7200, consumerId: "user5", createdAt: { toDate: () => new Date(Date.now() - 1000 * 60 * 60 * 8) } },
  { id: "d6", storeName: "다랜드 카페", amount: 25000, totalAccumulation: 30000, consumerId: "user6", createdAt: { toDate: () => new Date(Date.now() - 1000 * 60 * 60 * 24) } },
  { id: "d7", storeName: "다랜드 카페", amount: 4500, totalAccumulation: 5400, consumerId: "user7", createdAt: { toDate: () => new Date(Date.now() - 1000 * 60 * 60 * 26) } },
  { id: "d8", storeName: "다랜드 카페", amount: 9000, totalAccumulation: 10800, consumerId: "user8", createdAt: { toDate: () => new Date(Date.now() - 1000 * 60 * 60 * 48) } },
];

type TabType = "today" | "all";

export default function StoreDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tab, setTab] = useState<TabType>("today");

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    if (!isConfigured || !db) {
      setTransactions(DEMO_TRANSACTIONS);
      return;
    }
    const fetchTx = async () => {
      try {
        const q = query(
          collection(db!, "transactions"),
          where("storeName", "==", "다랜드 카페"),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        const list: Transaction[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Transaction));
        setTransactions(list.length > 0 ? list : DEMO_TRANSACTIONS);
      } catch {
        setTransactions(DEMO_TRANSACTIONS);
      }
    };
    fetchTx();
  }, [user]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center dark-text-muted">로딩 중...</div>;
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todayTxs = transactions.filter((tx) => {
    try {
      const d = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt);
      return d >= todayStart;
    } catch { return false; }
  });

  const displayTxs = tab === "today" ? todayTxs : transactions;

  const todaySales = todayTxs.reduce((s, t) => s + t.amount, 0);
  const todayPoints = Math.round(todaySales * 0.5);
  const todayCount = todayTxs.length;
  const totalSales = transactions.reduce((s, t) => s + t.amount, 0);
  const totalPoints = Math.round(totalSales * 0.5);

  const formatTime = (tx: Transaction) => {
    try {
      const d = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt);
      const h = d.getHours().toString().padStart(2, "0");
      const m = d.getMinutes().toString().padStart(2, "0");
      return `${h}:${m}`;
    } catch { return "--:--"; }
  };

  const formatDate = (tx: Transaction) => {
    try {
      const d = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    } catch { return "--/--"; }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <div className="dark-header border-b border-purple-900/20 bg-[#0d0d30]/80 px-5 py-4 pl-16">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏪</span>
          <div>
            <h1 className="text-lg font-bold">가맹점 대시보드</h1>
            <p className="text-xs dark-text-muted text-zinc-500">다랜드 카페 · 김철수 사장님</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-5 py-5">
        {/* 오늘 매출 요약 */}
        <div
          className="dark-card rounded-2xl border p-5"
          style={{ borderColor: "var(--card-border)", background: "linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-to))" }}
        >
          <div className="text-xs dark-text-muted text-zinc-500">오늘 매출</div>
          <div className="mt-1 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-4xl font-black text-transparent">
            {todaySales.toLocaleString()}원
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="rounded-xl p-2 text-center" style={{ background: "rgba(0,0,0,0.1)" }}>
              <div className="text-xs dark-text-muted text-zinc-500">건수</div>
              <div className="text-lg font-bold text-cyan-400">{todayCount}건</div>
            </div>
            <div className="rounded-xl p-2 text-center" style={{ background: "rgba(0,0,0,0.1)" }}>
              <div className="text-xs dark-text-muted text-zinc-500">판매자 적립</div>
              <div className="text-lg font-bold text-amber-400">{todayPoints.toLocaleString()}P</div>
            </div>
            <div className="rounded-xl p-2 text-center" style={{ background: "rgba(0,0,0,0.1)" }}>
              <div className="text-xs dark-text-muted text-zinc-500">객단가</div>
              <div className="text-lg font-bold text-purple-400">
                {todayCount > 0 ? Math.round(todaySales / todayCount).toLocaleString() : 0}원
              </div>
            </div>
          </div>
        </div>

        {/* 누적 통계 */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="dark-card rounded-xl border p-4" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
            <div className="text-xs dark-text-muted text-zinc-500">누적 매출</div>
            <div className="mt-1 text-xl font-black text-emerald-400">{totalSales.toLocaleString()}원</div>
          </div>
          <div className="dark-card rounded-xl border p-4" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
            <div className="text-xs dark-text-muted text-zinc-500">누적 판매자 적립</div>
            <div className="mt-1 text-xl font-black text-amber-400">{totalPoints.toLocaleString()}P</div>
          </div>
        </div>

        {/* 비선형 혜택 안내 */}
        <div
          className="dark-card mt-4 rounded-xl border border-purple-500/20 p-4"
          style={{ background: "linear-gradient(135deg, rgba(168, 85, 247, 0.05), rgba(6, 182, 212, 0.05))" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">💡</span>
            <div className="text-sm font-bold text-purple-400">판매자 혜택</div>
          </div>
          <div className="mt-2 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
            고객이 결제할 때마다 결제금액의 <span className="font-bold text-amber-400">50%</span>가 판매자 포인트로 적립됩니다.
            적립된 포인트는 다른 가맹점에서 결제하거나 현금으로 정산할 수 있습니다.
          </div>
        </div>

        {/* 탭 */}
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setTab("today")}
            className="rounded-full px-4 py-1.5 text-sm font-bold transition-all"
            style={{
              background: tab === "today" ? "linear-gradient(135deg, #7b2ff7, #06b6d4)" : "var(--card-bg)",
              color: tab === "today" ? "#fff" : "var(--text-muted)",
              border: tab === "today" ? "none" : "1px solid var(--card-border)",
            }}
          >
            오늘 ({todayCount})
          </button>
          <button
            onClick={() => setTab("all")}
            className="rounded-full px-4 py-1.5 text-sm font-bold transition-all"
            style={{
              background: tab === "all" ? "linear-gradient(135deg, #7b2ff7, #06b6d4)" : "var(--card-bg)",
              color: tab === "all" ? "#fff" : "var(--text-muted)",
              border: tab === "all" ? "none" : "1px solid var(--card-border)",
            }}
          >
            전체 ({transactions.length})
          </button>
        </div>

        {/* 거래 목록 */}
        <div className="mt-3 space-y-2">
          {displayTxs.length === 0 ? (
            <div
              className="dark-card rounded-xl border p-8 text-center text-sm"
              style={{ borderColor: "var(--card-border)", background: "var(--card-bg)", color: "var(--text-muted)" }}
            >
              {tab === "today" ? "오늘 거래가 없습니다" : "거래 내역이 없습니다"}
            </div>
          ) : (
            displayTxs.map((tx) => (
              <div
                key={tx.id}
                className="dark-card flex items-center justify-between rounded-xl border px-4 py-3"
                style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-500/10 text-lg">
                    👤
                  </div>
                  <div>
                    <div className="text-sm font-medium">고객 결제</div>
                    <div className="text-xs dark-text-muted text-zinc-500">
                      {tab === "today" ? formatTime(tx) : `${formatDate(tx)} ${formatTime(tx)}`}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-cyan-400">
                    {tx.amount.toLocaleString()}원
                  </div>
                  <div className="text-xs font-bold text-amber-400">
                    +{Math.round(tx.amount * 0.5).toLocaleString()}P
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 정산 안내 */}
        <div
          className="dark-card mt-6 rounded-2xl border p-5"
          style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}
        >
          <div className="mb-3 text-sm font-bold text-purple-400">정산 안내</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>정산 가능 금액</span>
              <span className="text-lg font-bold text-emerald-400">{totalPoints.toLocaleString()}P</span>
            </div>
            <div className="h-px" style={{ background: "var(--card-border)" }} />
            <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
              <span>정산 주기</span>
              <span>매주 월요일</span>
            </div>
            <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
              <span>최소 정산 금액</span>
              <span>10,000P</span>
            </div>
            <button
              className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-500 py-3 text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-95"
            >
              정산 신청하기
            </button>
          </div>
        </div>
      </div>

      <Navbar />
    </div>
  );
}
