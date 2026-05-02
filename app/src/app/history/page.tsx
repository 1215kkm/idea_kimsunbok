"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db, isConfigured } from "@/lib/firebase";
import { getTransactions as getDemoTxs, getStats as getDemoStats } from "@/lib/demo-store";
import Navbar from "@/components/Navbar";

type FirestoreTimestamp = { toDate: () => Date };

interface Transaction {
  id: string;
  storeName?: string;
  categoryName?: string;
  amount: number;
  totalAccumulation: number;
  nonlinearResult: {
    principal: number;
    bonus: number;
    rate: number;
  };
  createdAt: FirestoreTimestamp | number | null;
}

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({ spent: 0, earned: 0, count: 0 });

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    if (!isConfigured || !db) {
      // 데모 모드: localStorage에서 본인 거래 불러오기
      const list = getDemoTxs(user).map((t) => ({
        id: t.id,
        storeName: t.storeName || t.categoryName,
        categoryName: t.categoryName,
        amount: t.amount,
        totalAccumulation: t.totalAccumulation,
        nonlinearResult: t.nonlinearResult,
        createdAt: t.createdAt,
      })) as Transaction[];
      /* eslint-disable react-hooks/set-state-in-effect */
      setTxs(list);
      setStats(getDemoStats(user));
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    const fetchTxs = async () => {
      try {
        const q = query(
          collection(db!, "transactions"),
          where("consumerId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        const list: Transaction[] = [];
        let spent = 0, earned = 0;
        snap.forEach((d) => {
          const data = d.data() as Transaction;
          list.push({ ...data, id: d.id });
          spent += data.amount;
          earned += data.totalAccumulation;
        });
        setTxs(list);
        setStats({ spent, earned, count: list.length });
      } catch {
        // Firestore 미연결
      }
    };
    fetchTxs();
  }, [user]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-[#6B7394]">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <div className="dark-header border-b border-[#E8EAF0] bg-white/95 px-5 py-4 pl-16">
        <h1 className="text-lg font-bold">포인트 내역</h1>
        <p className="text-xs dark-text-muted text-[#6B7394]">결제 및 적립 기록</p>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-3 p-5">
        <div className="dark-card rounded-xl border border-[#E8EAF0] bg-white p-4 text-center">
          <div className="text-xs dark-text-muted text-[#6B7394]">총 결제</div>
          <div className="mt-1 text-lg font-bold text-[#EF4444]">{stats.spent.toLocaleString()}</div>
          <div className="text-xs text-[#9CA3C1]">원</div>
        </div>
        <div className="dark-card rounded-xl border border-[#E8EAF0] bg-white p-4 text-center">
          <div className="text-xs dark-text-muted text-[#6B7394]">총 적립</div>
          <div className="mt-1 text-lg font-bold text-[#10B981]">{stats.earned.toLocaleString()}</div>
          <div className="text-xs dark-text-sub text-[#9CA3C1]">P</div>
        </div>
        <div className="dark-card rounded-xl border border-[#E8EAF0] bg-white p-4 text-center">
          <div className="text-xs dark-text-muted text-[#6B7394]">거래</div>
          <div className="mt-1 text-lg font-bold text-[#3B4CCA]">{stats.count}</div>
          <div className="text-xs text-[#9CA3C1]">건</div>
        </div>
      </div>

      {/* 거래 리스트 */}
      <div className="px-5">
        {txs.length === 0 ? (
          <div className="dark-card rounded-xl border border-[#E8EAF0] bg-white p-10 text-center text-sm dark-text-muted text-[#6B7394]">
            아직 거래 내역이 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            {txs.map((tx) => (
              <div
                key={tx.id}
                className="dark-card rounded-xl border border-[#E8EAF0] bg-white px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{tx.storeName || tx.categoryName || "지출"}</div>
                  <div className="text-sm font-bold text-[#10B981]">
                    +{tx.totalAccumulation.toLocaleString()}P
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-[#6B7394]">
                  <span>-{tx.amount.toLocaleString()}원 결제</span>
                  <span className="rounded bg-[#3B4CCA]/10 px-1.5 py-0.5 text-[#3B4CCA]">
                    {tx.nonlinearResult?.rate || 120}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
