"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db, isConfigured } from "@/lib/firebase";
import { getTransactions as getDemoTxs, getBalance as getDemoBalance, getStats as getDemoStats } from "@/lib/demo-store";
import Navbar from "@/components/Navbar";
import Link from "next/link";

interface UserData {
  name: string;
  totalPoints: number;
  membershipLevel: number;
}

type FirestoreTimestamp = { toDate: () => Date };

interface RecentTx {
  id: string;
  type?: string;
  storeName?: string;
  categoryName?: string;
  amount: number;
  totalAccumulation: number;
  createdAt: FirestoreTimestamp | number | null;
}

const TX_LABEL: Record<string, string> = {
  spend: "지출등록",
  invite_invitee: "초대 가입 보상",
  invite_advertiser: "초대 수익",
  withdrawal_request: "출금 요청",
  withdrawal_refund: "출금 환불",
};

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
    if (!user) return;
    if (!isConfigured || !db) {
      // 데모 모드: localStorage 기반
      const demoTxs = getDemoTxs(user);
      const demoStats = getDemoStats(user);
      /* eslint-disable react-hooks/set-state-in-effect */
      setUserData({
        name: user.displayName || "사용자",
        totalPoints: getDemoBalance(user),
        membershipLevel: 1,
      });
      setRecentTxs(
        demoTxs.slice(0, 5).map((t) => ({
          id: t.id,
          storeName: t.storeName || t.categoryName || "지출",
          amount: t.amount,
          totalAccumulation: t.totalAccumulation,
          createdAt: t.createdAt,
        }))
      );
      setTotalSpent(demoStats.spent);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    const fetchData = async () => {
      try {
        const userSnap = await getDoc(doc(db!, "users", user.uid));
        if (userSnap.exists()) {
          setUserData(userSnap.data() as UserData);
        }
        const txRef = collection(db!, "transactions");
        const q = query(
          txRef,
          where("consumerId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(5),
        );
        const txSnap = await getDocs(q);
        const txs: RecentTx[] = [];
        let spent = 0;
        txSnap.forEach((d) => {
          const data = d.data();
          txs.push({ id: d.id, ...data } as RecentTx);
          if (data.type === "spend" || !data.type) {
            spent += data.amount || 0;
          }
        });
        setRecentTxs(txs);
        setTotalSpent(spent);
      } catch (err) {
        console.error("[dashboard] recent tx fetch failed:", err);
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
      <div className="dark-header border-b border-[#E8EAF0] bg-white/95 px-5 py-4 pl-16 pr-16">
        <div className="text-xs dark-text-muted text-[#6B7394]">안녕하세요</div>
        <div className="text-lg font-bold">
          {user.displayName || "사용자"}님
          <span className="ml-2 rounded-full bg-[#3B4CCA]/10 px-2 py-0.5 text-xs text-[#3B4CCA]">
            Lv.{userData?.membershipLevel || 1}
          </span>
        </div>
      </div>

      {/* 데모 모드 안내 배너 */}
      {!isConfigured && (
        <div className="mx-5 mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-[#6B7394]">
          <span className="font-bold text-amber-700">🧪 베타 데모 모드</span> — 본인 데이터는 이 브라우저에 저장됩니다. 회원 간 분배·초대는 시뮬레이션입니다 (실거래 X).
        </div>
      )}

      {/* 베타 시연 안내 (실연동 + 베타 시연 시 상시 표시) */}
      {isConfigured && (
        <div className="mx-5 mt-3 rounded-xl border border-amber-500/30 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-[#6B7394]">
          <span className="font-bold text-amber-700">🧪 폐쇄 베타 시연 중</span> — 표시된 포인트/잔액은 가상 테스트 자금입니다. 출금 신청 시 실제 송금되지 않습니다.
        </div>
      )}

      {/* 다랜드 내 계좌 카드 */}
      <div className="mx-5 mt-5 rounded-2xl bg-gradient-to-br from-[#3B4CCA] to-[#2D3A8C] p-6 shadow-lg shadow-[#3B4CCA]/20">
        <div className="flex items-center justify-between">
          <div className="text-xs text-white/70">테스트 자금 (가상)</div>
          <div className="flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5">
            <div className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse" />
            <span className="text-[10px] text-amber-200">BETA</span>
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
            {recentTxs.map((tx) => {
              const label = (tx.type && TX_LABEL[tx.type]) || "거래";
              const title = tx.storeName || tx.categoryName || label;
              const isMinus = tx.type === "withdrawal_request";
              const sign = isMinus ? "-" : "+";
              const color = isMinus ? "#EF4444" : "#10B981";
              const display = tx.totalAccumulation || tx.amount || 0;
              return (
                <div
                  key={tx.id}
                  className="dark-card flex items-center justify-between rounded-xl border border-[#E8EAF0] bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{title}</div>
                    <div className="text-xs text-[#6B7394]">
                      {label}
                      {tx.type === "spend" && tx.amount
                        ? ` · -${tx.amount.toLocaleString()}원`
                        : ""}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold" style={{ color }}>
                      {sign}
                      {Math.abs(display).toLocaleString()}P
                    </div>
                  </div>
                </div>
              );
            })}
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

      {/* 카드 연동 & CMS 바로가기 */}
      <div className="mx-5 mt-3 grid grid-cols-2 gap-3">
        <Link
          href="/card-connect"
          className="dark-card flex items-center gap-3 rounded-xl border border-[#E8EAF0] bg-white p-4 transition-colors hover:border-[#3B4CCA]/30"
        >
          <span className="text-2xl">💳</span>
          <div>
            <div className="text-sm font-bold">카드 자동 연동</div>
            <div className="text-xs dark-text-muted text-[#6B7394]">실제 결제내역 자동 등록</div>
          </div>
        </Link>
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
      </div>

      <Navbar />
    </div>
  );
}
