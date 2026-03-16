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
        <div className="text-[#6B7394]">로딩 중...</div>
      </div>
    );
  }

  const points = userData?.totalPoints || 0;
  const rate = totalSpent > 0 ? Math.round((points / totalSpent) * 100) : 0;

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <div className="dark-header border-b border-[#E8EAF0] bg-white/95 px-5 py-4 pl-16">
        <div className="text-xs dark-text-muted text-[#6B7394]">안녕하세요</div>
        <div className="text-lg font-bold">
          {user.displayName || "사용자"}님
          <span className="ml-2 rounded-full bg-[#3B4CCA]/10 px-2 py-0.5 text-xs text-[#3B4CCA]">
            Lv.{userData?.membershipLevel || 1}
          </span>
        </div>
      </div>

      {/* 다랜드 내 계좌 카드 */}
      <div className="mx-5 mt-5 rounded-2xl bg-gradient-to-br from-[#3B4CCA] to-[#2D3A8C] p-6 shadow-lg shadow-[#3B4CCA]/20">
        <div className="flex items-center justify-between">
          <div className="text-xs text-white/70">다랜드 내 계좌</div>
          <div className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5">
            <div className="h-1.5 w-1.5 rounded-full bg-[#34D399] animate-pulse" />
            <span className="text-[10px] text-[#34D399]">활성</span>
          </div>
        </div>
        <div className="mt-1 text-white text-4xl font-black">
          {points.toLocaleString()} P
        </div>
        <div className="mt-1 text-xs text-white/60">= {points.toLocaleString()}원 상당</div>
        <div className="mt-3 flex gap-6 text-sm">
          <div>
            <span className="text-white/60">총 지출 </span>
            <span className="font-bold text-[#FCA5A5]">{totalSpent.toLocaleString()}원</span>
          </div>
          <div>
            <span className="text-white/60">적립률 </span>
            <span className="font-bold text-[#34D399]">{rate || 120}%</span>
          </div>
        </div>
        {/* 바 */}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#FFB800] to-[#FCD34D] transition-all duration-1000"
            style={{ width: `${Math.min(rate || 0, 150) / 1.5}%` }}
          />
        </div>
        {/* 출금 버튼 */}
        <Link
          href="/withdraw"
          className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/20"
        >
          <span>🏦</span> 내 은행계좌로 출금하기
        </Link>
      </div>

      {/* 퀵 액션 */}
      <div className="mx-5 mt-5 grid grid-cols-2 gap-3">
        <Link
          href="/stores"
          className="dark-card flex items-center gap-3 rounded-xl border border-[#E8EAF0] bg-white p-4 transition-colors hover:border-[#3B4CCA]/30"
        >
          <span className="text-2xl">💳</span>
          <div>
            <div className="text-sm font-bold">지출데이터 등록</div>
            <div className="text-xs dark-text-muted text-[#6B7394]">신용카드 결제 → 120% 적립</div>
          </div>
        </Link>
        <Link
          href="/history"
          className="dark-card flex items-center gap-3 rounded-xl border border-[#E8EAF0] bg-white p-4 transition-colors hover:border-[#3B4CCA]/30"
        >
          <span className="text-2xl">📋</span>
          <div>
            <div className="text-sm font-bold">포인트 내역</div>
            <div className="text-xs dark-text-muted text-[#6B7394]">적립/사용 확인</div>
          </div>
        </Link>
      </div>

      {/* 최근 거래 */}
      <div className="mx-5 mt-5">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#3B4CCA]">최근 거래</h3>
        {recentTxs.length === 0 ? (
          <div className="dark-card rounded-xl border border-[#E8EAF0] bg-white p-8 text-center text-sm dark-text-muted text-[#6B7394]">
            아직 거래 내역이 없습니다.<br />
            <Link href="/stores" className="mt-2 inline-block text-[#3B4CCA] hover:underline">
              첫 지출데이터 등록하기 &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTxs.map((tx) => (
              <div key={tx.id} className="dark-card flex items-center justify-between rounded-xl border border-[#E8EAF0] bg-white px-4 py-3">
                <div>
                  <div className="text-sm font-medium">{tx.storeName}</div>
                  <div className="text-xs text-[#6B7394]">-{tx.amount.toLocaleString()}원</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-[#10B981]">
                    +{tx.totalAccumulation.toLocaleString()}P
                  </div>
                  <div className="text-xs text-[#6B7394]">120%</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 비선형공식 설명 배너 */}
      <div className="dark-card mx-5 mt-5 rounded-2xl border border-[#E8EAF0] bg-gradient-to-r from-[#3B4CCA]/8 to-[#3B4CCA]/5 p-5">
        <div className="text-sm font-bold text-[#3B4CCA]">비선형공식이란?</div>
        <div className="mt-1 text-xs leading-relaxed dark-text-muted text-[#6B7394]">
          신용카드 결제 → 다랜드가 지출 인식 →<br />
          비선형공식 → 120% 증액 → <span className="text-[#3B4CCA] font-bold">다랜드 내 계좌에 적립</span><br />
          적립된 포인트는 등록된 은행계좌로 출금 가능!
        </div>
        <Link href="/engine" className="mt-3 inline-block text-xs text-[#3B4CCA] hover:underline">
          자세히 알아보기 &rarr;
        </Link>
      </div>

      {/* CMS & 영수증 바로가기 */}
      <div className="mx-5 mt-3 grid grid-cols-2 gap-3">
        <Link
          href="/cms-register"
          className="dark-card flex items-center gap-3 rounded-xl border border-[#E8EAF0] bg-white p-4 transition-colors hover:border-[#3B4CCA]/30"
        >
          <span className="text-2xl">🔄</span>
          <div>
            <div className="text-sm font-bold">CMS 가입센터</div>
            <div className="text-xs dark-text-muted text-[#6B7394]">결제수단 등록</div>
          </div>
        </Link>
        <Link
          href="/receipt-extract"
          className="dark-card flex items-center gap-3 rounded-xl border border-[#E8EAF0] bg-white p-4 transition-colors hover:border-[#3B4CCA]/30"
        >
          <span className="text-2xl">🧾</span>
          <div>
            <div className="text-sm font-bold">영수증 자동추출</div>
            <div className="text-xs dark-text-muted text-[#6B7394]">CMS 자동인식</div>
          </div>
        </Link>
      </div>

      {/* 시뮬레이션 & 엔진 바로가기 */}
      <div className="mx-5 mt-3 grid grid-cols-2 gap-3">
        <Link
          href="/simulation"
          className="dark-card flex items-center gap-3 rounded-xl border border-[#E8EAF0] bg-white p-4 transition-colors hover:border-[#3B4CCA]/30"
        >
          <span className="text-2xl">🎮</span>
          <div>
            <div className="text-sm font-bold">마을 시뮬레이션</div>
            <div className="text-xs dark-text-muted text-[#6B7394]">게임으로 체험</div>
          </div>
        </Link>
        <Link
          href="/engine"
          className="dark-card flex items-center gap-3 rounded-xl border border-[#E8EAF0] bg-white p-4 transition-colors hover:border-[#3B4CCA]/30"
        >
          <span className="text-2xl">⚙️</span>
          <div>
            <div className="text-sm font-bold">엔진 설명서</div>
            <div className="text-xs dark-text-muted text-[#6B7394]">공식 원리 보기</div>
          </div>
        </Link>
      </div>

      <Navbar />
    </div>
  );
}
