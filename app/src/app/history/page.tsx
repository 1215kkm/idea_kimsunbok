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
  nonlinearResult: {
    principal: number;
    bonus: number;
    rate: number;
  };
  createdAt: any;
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
    if (!user || !isConfigured || !db) return;
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
    return <div className="flex min-h-screen items-center justify-center text-zinc-500">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <div className="dark-header border-b border-purple-900/20 bg-[#0d0d30]/80 px-5 py-4 pl-16">
        <h1 className="text-lg font-bold">포인트 내역</h1>
        <p className="text-xs dark-text-muted text-zinc-500">결제 및 적립 기록</p>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-3 p-5">
        <div className="dark-card rounded-xl border border-purple-900/20 bg-[#14143c] p-4 text-center">
          <div className="text-xs dark-text-muted text-zinc-500">총 결제</div>
          <div className="mt-1 text-lg font-bold text-rose-400">{stats.spent.toLocaleString()}</div>
          <div className="text-xs text-zinc-600">원</div>
        </div>
        <div className="dark-card rounded-xl border border-purple-900/20 bg-[#14143c] p-4 text-center">
          <div className="text-xs dark-text-muted text-zinc-500">총 적립</div>
          <div className="mt-1 text-lg font-bold text-emerald-400">{stats.earned.toLocaleString()}</div>
          <div className="text-xs dark-text-sub text-zinc-600">P</div>
        </div>
        <div className="dark-card rounded-xl border border-purple-900/20 bg-[#14143c] p-4 text-center">
          <div className="text-xs dark-text-muted text-zinc-500">거래</div>
          <div className="mt-1 text-lg font-bold text-cyan-400">{stats.count}</div>
          <div className="text-xs text-zinc-600">건</div>
        </div>
      </div>

      {/* 거래 리스트 */}
      <div className="px-5">
        {txs.length === 0 ? (
          <div className="dark-card rounded-xl border border-purple-900/10 bg-[#14143c] p-10 text-center text-sm dark-text-muted text-zinc-500">
            아직 거래 내역이 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            {txs.map((tx) => (
              <div
                key={tx.id}
                className="dark-card rounded-xl border border-purple-900/10 bg-[#14143c] px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{tx.storeName}</div>
                  <div className="text-sm font-bold text-emerald-400">
                    +{tx.totalAccumulation.toLocaleString()}P
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
                  <span>-{tx.amount.toLocaleString()}원 결제</span>
                  <span className="rounded bg-purple-900/30 px-1.5 py-0.5 text-purple-400">
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
