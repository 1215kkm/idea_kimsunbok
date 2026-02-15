"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db, isConfigured } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import Link from "next/link";

interface UserData {
  name: string;
  totalPoints: number;
  membershipLevel: number;
}

interface RecentTx {
  id: string;
  storeName: string;
  amount: number;
  totalAccumulation: number;
  createdAt: any;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [recentTxs, setRecentTxs] = useState<RecentTx[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !isConfigured || !db) return;
    const fetchData = async () => {
      try {
        const userSnap = await getDoc(doc(db!, "users", user.uid));
        if (userSnap.exists()) {
          setUserData(userSnap.data() as UserData);
        }
        const txRef = collection(db!, "transactions");
        const q = query(txRef, orderBy("createdAt", "desc"), limit(5));
        const txSnap = await getDocs(q);
        const txs: RecentTx[] = [];
        let spent = 0;
        txSnap.forEach((d) => {
          const data = d.data();
          if (data.consumerId === user.uid) {
            txs.push({ id: d.id, ...data } as RecentTx);
            spent += data.amount || 0;
          }
        });
        setRecentTxs(txs);
        setTotalSpent(spent);
      } catch {
        // Firestore 미연결
      }
    };
    fetchData();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-zinc-500">로딩 중...</div>
      </div>
    );
  }

  const points = userData?.totalPoints || 0;
  const rate = totalSpent > 0 ? Math.round((points / totalSpent) * 100) : 0;

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <div className="dark-header border-b border-purple-900/20 bg-[#0d0d30]/80 px-5 py-4 pl-16">
        <div className="text-xs dark-text-muted text-zinc-500">안녕하세요</div>
        <div className="text-lg font-bold">
          {user.displayName || "사용자"}님
          <span className="ml-2 rounded-full bg-purple-900/30 px-2 py-0.5 text-xs text-purple-400">
            Lv.{userData?.membershipLevel || 1}
          </span>
        </div>
      </div>

      {/* 포인트 카드 */}
      <div className="dark-card mx-5 mt-5 rounded-2xl border border-purple-900/30 bg-gradient-to-br from-[#1a1a4e] to-[#0d0d30] p-6">
        <div className="text-xs dark-text-muted text-zinc-500">내 포인트</div>
        <div className="mt-1 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-4xl font-black text-transparent">
          {points.toLocaleString()} P
        </div>
        <div className="mt-3 flex gap-6 text-sm">
          <div>
            <span className="text-zinc-500">총 사용 </span>
            <span className="font-bold text-rose-400">{totalSpent.toLocaleString()}원</span>
          </div>
          <div>
            <span className="text-zinc-500">적립률 </span>
            <span className="font-bold text-emerald-400">{rate || 120}%</span>
          </div>
        </div>
        {/* 바 */}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-rose-400 transition-all duration-1000"
            style={{ width: `${Math.min(rate || 0, 150) / 1.5}%` }}
          />
        </div>
      </div>

      {/* 퀵 액션 */}
      <div className="mx-5 mt-5 grid grid-cols-2 gap-3">
        <Link
          href="/stores"
          className="dark-card flex items-center gap-3 rounded-xl border border-purple-900/20 bg-[#14143c] p-4 transition-colors hover:border-purple-500/40"
        >
          <span className="text-2xl">🏪</span>
          <div>
            <div className="text-sm font-bold">가맹점 결제</div>
            <div className="text-xs dark-text-muted text-zinc-500">120% 적립받기</div>
          </div>
        </Link>
        <Link
          href="/history"
          className="dark-card flex items-center gap-3 rounded-xl border border-purple-900/20 bg-[#14143c] p-4 transition-colors hover:border-purple-500/40"
        >
          <span className="text-2xl">📋</span>
          <div>
            <div className="text-sm font-bold">포인트 내역</div>
            <div className="text-xs dark-text-muted text-zinc-500">적립/사용 확인</div>
          </div>
        </Link>
      </div>

      {/* 최근 거래 */}
      <div className="mx-5 mt-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-purple-400">최근 거래</h3>
        {recentTxs.length === 0 ? (
          <div className="dark-card rounded-xl border border-purple-900/10 bg-[#14143c] p-8 text-center text-sm dark-text-muted text-zinc-500">
            아직 거래 내역이 없습니다.<br />
            <Link href="/stores" className="mt-2 inline-block text-purple-400 hover:underline">
              가맹점에서 첫 결제하기 &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTxs.map((tx) => (
              <div key={tx.id} className="dark-card flex items-center justify-between rounded-xl border border-purple-900/10 bg-[#14143c] px-4 py-3">
                <div>
                  <div className="text-sm font-medium">{tx.storeName}</div>
                  <div className="text-xs text-zinc-500">-{tx.amount.toLocaleString()}원</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-400">
                    +{tx.totalAccumulation.toLocaleString()}P
                  </div>
                  <div className="text-xs text-zinc-500">120%</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 비선형공식 설명 배너 */}
      <div className="dark-card mx-5 mt-5 rounded-2xl border border-purple-900/20 bg-gradient-to-r from-purple-900/20 to-cyan-900/20 p-5">
        <div className="text-sm font-bold text-purple-300">비선형공식이란?</div>
        <div className="mt-1 text-xs leading-relaxed dark-text-muted text-zinc-400">
          결제 금액의 120%가 포인트로 적립됩니다.<br />
          판매자 50% + 소비자 50% 분배 후<br />
          멤버십 승수 &times; 보정모드를 거쳐 120% 달성.
        </div>
        <Link href="/engine" className="mt-3 inline-block text-xs text-purple-400 hover:underline">
          자세히 알아보기 &rarr;
        </Link>
      </div>

      {/* 시뮬레이션 & 엔진 바로가기 */}
      <div className="mx-5 mt-3 grid grid-cols-2 gap-3">
        <Link
          href="/simulation"
          className="dark-card flex items-center gap-3 rounded-xl border border-purple-900/20 bg-[#14143c] p-4 transition-colors hover:border-purple-500/40"
        >
          <span className="text-2xl">🎮</span>
          <div>
            <div className="text-sm font-bold">마을 시뮬레이션</div>
            <div className="text-xs dark-text-muted text-zinc-500">게임으로 체험</div>
          </div>
        </Link>
        <Link
          href="/engine"
          className="dark-card flex items-center gap-3 rounded-xl border border-purple-900/20 bg-[#14143c] p-4 transition-colors hover:border-purple-500/40"
        >
          <span className="text-2xl">⚙️</span>
          <div>
            <div className="text-sm font-bold">엔진 설명서</div>
            <div className="text-xs dark-text-muted text-zinc-500">공식 원리 보기</div>
          </div>
        </Link>
      </div>

      <Navbar />
    </div>
  );
}
