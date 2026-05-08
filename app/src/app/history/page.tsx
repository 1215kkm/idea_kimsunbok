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
  type?: string;
  storeName?: string;
  categoryName?: string;
  amount: number;
  totalAccumulation: number;
  nonlinearResult?: {
    principal: number;
    bonus: number;
    rate: number;
  };
  inviteCode?: string;
  withdrawalId?: string;
  createdAt: FirestoreTimestamp | number | null;
}

const TYPE_META: Record<
  string,
  { label: string; icon: string; color: string; sign: "plus" | "minus" }
> = {
  spend: { label: "지출등록", icon: "💳", color: "#10B981", sign: "plus" },
  invite_invitee: { label: "초대 가입 보상", icon: "🎁", color: "#10B981", sign: "plus" },
  invite_advertiser: { label: "광고주 초대 수익", icon: "📢", color: "#10B981", sign: "plus" },
  withdrawal_request: { label: "출금 요청", icon: "🏦", color: "#EF4444", sign: "minus" },
  withdrawal_refund: { label: "출금 환불", icon: "↩️", color: "#10B981", sign: "plus" },
};

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [stats, setStats] = useState({ spent: 0, earned: 0, count: 0 });
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    if (!isConfigured || !db) {
      const list = getDemoTxs(user).map((t) => ({
        id: t.id,
        type: "spend",
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
      setFetching(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    const fetchTxs = async () => {
      setFetching(true);
      setError(null);
      try {
        const q = query(
          collection(db!, "transactions"),
          where("consumerId", "==", user.uid),
          orderBy("createdAt", "desc"),
        );
        const snap = await getDocs(q);
        const list: Transaction[] = [];
        let spent = 0;
        let earned = 0;
        snap.forEach((d) => {
          const data = d.data() as Transaction;
          list.push({ ...data, id: d.id });
          if (data.type === "spend") {
            spent += data.amount || 0;
            earned += data.totalAccumulation || 0;
          } else if (
            data.type === "invite_invitee" ||
            data.type === "invite_advertiser" ||
            data.type === "withdrawal_refund"
          ) {
            earned += data.totalAccumulation || 0;
          } else if (!data.type) {
            spent += data.amount || 0;
            earned += data.totalAccumulation || 0;
          }
        });
        setTxs(list);
        setStats({ spent, earned, count: list.length });
      } catch (err) {
        const msg =
          err instanceof Error && err.message.includes("requires an index")
            ? "Firestore 인덱스가 필요합니다. 인덱스 생성이 완료될 때까지 1~2분 기다려 주세요."
            : "거래 내역을 불러오지 못했습니다.";
        setError(msg);
        console.error("[history] fetch failed:", err);
      } finally {
        setFetching(false);
      }
    };
    fetchTxs();
  }, [user]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-[#6B7394]">로딩 중...</div>;
  }

  const formatDate = (createdAt: Transaction["createdAt"]) => {
    if (!createdAt) return "";
    if (typeof createdAt === "number") return new Date(createdAt).toLocaleString("ko-KR");
    if (typeof (createdAt as FirestoreTimestamp).toDate === "function") {
      return (createdAt as FirestoreTimestamp).toDate().toLocaleString("ko-KR");
    }
    return "";
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="dark-header border-b border-[#E8EAF0] bg-white/95 px-5 py-4 pl-16">
        <h1 className="text-lg font-bold">포인트 내역</h1>
        <p className="text-xs dark-text-muted text-[#6B7394]">지출 / 초대 / 출금 등 모든 활동 기록</p>
      </div>

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

      {error && (
        <div className="mx-5 mb-4 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 px-4 py-3 text-xs text-[#EF4444]">
          {error}
        </div>
      )}

      <div className="px-5">
        {fetching ? (
          <div className="dark-card rounded-xl border border-[#E8EAF0] bg-white p-10 text-center text-sm text-[#6B7394]">
            불러오는 중...
          </div>
        ) : txs.length === 0 && !error ? (
          <div className="dark-card rounded-xl border border-[#E8EAF0] bg-white p-10 text-center text-sm dark-text-muted text-[#6B7394]">
            아직 거래 내역이 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            {txs.map((tx) => {
              const meta = (tx.type && TYPE_META[tx.type]) || {
                label: tx.categoryName || "거래",
                icon: "📝",
                color: "#10B981",
                sign: "plus" as const,
              };
              const sign = meta.sign === "minus" ? "-" : "+";
              const displayAmount = tx.totalAccumulation || tx.amount || 0;
              return (
                <div
                  key={tx.id}
                  className="dark-card rounded-xl border border-[#E8EAF0] bg-white px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">{meta.icon}</span>
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {tx.storeName || tx.categoryName || meta.label}
                        </div>
                        <div className="text-[11px] text-[#6B7394]">{meta.label}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold" style={{ color: meta.color }}>
                        {sign}
                        {Math.abs(displayAmount).toLocaleString()}P
                      </div>
                      {tx.type === "spend" && tx.amount > 0 && (
                        <div className="text-[10px] text-[#6B7394]">
                          -{tx.amount.toLocaleString()}원 결제
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-[#9CA3C1]">
                    <span>{formatDate(tx.createdAt)}</span>
                    {tx.type === "spend" && tx.nonlinearResult && (
                      <span className="rounded bg-[#3B4CCA]/10 px-1.5 py-0.5 text-[#3B4CCA]">
                        {tx.nonlinearResult.rate || 120}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
