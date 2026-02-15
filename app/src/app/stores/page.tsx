"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db, isConfigured } from "@/lib/firebase";
import { calculateNonlinear } from "@/lib/nonlinear-engine";
import Navbar from "@/components/Navbar";

interface Store {
  id: string;
  name: string;
  category: string;
  icon: string;
  sampleItems: { name: string; price: number }[];
}

// 기본 가맹점 (Firestore에 없을 때 표시)
const DEFAULT_STORES: Store[] = [
  { id: "super", name: "행복한 슈퍼", category: "마트", icon: "🏪",
    sampleItems: [{ name: "장보기 (사과, 우유, 고기)", price: 32000 }] },
  { id: "cafe", name: "다랜드 카페", category: "카페", icon: "☕",
    sampleItems: [{ name: "아메리카노 + 케이크", price: 4500 }] },
  { id: "gas", name: "주유소", category: "주유", icon: "⛽",
    sampleItems: [{ name: "휘발유 가득 주유", price: 70000 }] },
  { id: "pharm", name: "건강 약국", category: "약국", icon: "💊",
    sampleItems: [{ name: "비타민 + 마스크", price: 8000 }] },
  { id: "rest", name: "맛있는 식당", category: "식당", icon: "🍽️",
    sampleItems: [{ name: "김치찌개 4인분", price: 25000 }] },
  { id: "beauty", name: "뷰티샵", category: "미용", icon: "💇",
    sampleItems: [{ name: "커트 + 염색", price: 45000 }] },
];

type ModalState = null | { store: Store; item: { name: string; price: number } };
type ResultState = null | { store: Store; amount: number; earned: number; bonus: number };

export default function StoresPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>(DEFAULT_STORES);
  const [modal, setModal] = useState<ModalState>(null);
  const [result, setResult] = useState<ResultState>(null);
  const [processing, setProcessing] = useState(false);
  const [customAmount, setCustomAmount] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!isConfigured || !db) return;
    const fetchStores = async () => {
      try {
        const snap = await getDocs(collection(db!, "stores"));
        if (!snap.empty) {
          const list: Store[] = [];
          snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Store));
          setStores(list);
        }
      } catch {
        // Firestore 연결 전에는 기본 가맹점 사용
      }
    };
    fetchStores();
  }, []);

  const handlePay = async (store: Store, amount: number) => {
    if (!user || processing) return;
    setProcessing(true);

    const result = calculateNonlinear(amount);

    if (isConfigured && db) {
      try {
        await runTransaction(db, async (transaction) => {
          const userRef = doc(db!, "users", user.uid);
          const userSnap = await transaction.get(userRef);
          const currentPoints = userSnap.exists() ? (userSnap.data().totalPoints || 0) : 0;
          transaction.set(userRef, { totalPoints: currentPoints + result.totalAccumulation }, { merge: true });
          const txRef = doc(collection(db!, "transactions"));
          transaction.set(txRef, {
            consumerId: user.uid,
            storeId: store.id,
            storeName: store.name,
            amount,
            nonlinearResult: { principal: result.principal, bonus: result.bonus, totalAccumulation: result.totalAccumulation, rate: result.rate },
            totalAccumulation: result.totalAccumulation,
            createdAt: serverTimestamp(),
          });
        });
      } catch {
        // Firestore 오류 시에도 UI는 보여줌
      }
    }

    setModal(null);
    setResult({
      store,
      amount,
      earned: result.totalAccumulation,
      bonus: result.bonus,
    });
    setProcessing(false);
  };

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-zinc-500">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <div className="border-b border-purple-900/20 bg-[#0d0d30]/80 px-5 py-4">
        <h1 className="text-lg font-bold">가맹점</h1>
        <p className="text-xs text-zinc-500">결제하고 120% 적립받기</p>
      </div>

      {/* 가맹점 리스트 */}
      <div className="grid grid-cols-2 gap-3 p-5">
        {stores.map((store) => (
          <button
            key={store.id}
            onClick={() => setModal({ store, item: store.sampleItems[0] })}
            className="flex flex-col items-center gap-2 rounded-2xl border border-purple-900/20 bg-[#14143c] p-5 text-center transition-all hover:border-purple-500/40 hover:-translate-y-1 active:scale-95"
          >
            <span className="text-4xl">{store.icon}</span>
            <div className="text-sm font-bold">{store.name}</div>
            <div className="text-xs text-zinc-500">{store.category}</div>
            <div className="mt-1 text-xs text-amber-400">
              {store.sampleItems[0].price.toLocaleString()}원~
            </div>
          </button>
        ))}
      </div>

      {/* 결제 모달 */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-purple-900/40 bg-gradient-to-b from-[#1a1a4e] to-[#0d0d30] p-6 text-center">
            <div className="text-5xl">{modal.store.icon}</div>
            <h2 className="mt-2 text-xl font-bold">{modal.store.name}</h2>
            <p className="text-sm text-zinc-500">{modal.item.name}</p>

            {/* 금액 선택 */}
            <div className="mt-5 space-y-2">
              <button
                onClick={() => handlePay(modal.store, modal.item.price)}
                disabled={processing}
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {processing ? "처리 중..." : `${modal.item.price.toLocaleString()}원 결제`}
              </button>

              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="직접 입력"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="flex-1 rounded-xl border border-purple-900/30 bg-[#0d0d30] px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none"
                />
                <button
                  onClick={() => { const a = parseInt(customAmount); if (a > 0) handlePay(modal.store, a); }}
                  disabled={processing || !customAmount}
                  className="rounded-xl bg-purple-900/40 px-4 py-2.5 text-sm font-bold text-purple-300 disabled:opacity-30"
                >
                  결제
                </button>
              </div>
            </div>

            <button
              onClick={() => { setModal(null); setCustomAmount(""); }}
              className="mt-4 text-sm text-zinc-500 hover:text-zinc-300"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 적립 결과 */}
      {result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-6 backdrop-blur-md">
          <div className="w-full max-w-sm text-center">
            <div className="text-5xl">{result.store.icon}</div>
            <div className="mt-2 text-sm text-zinc-400">{result.store.name}</div>
            <div className="mt-1 text-lg font-bold text-rose-400">
              -{result.amount.toLocaleString()}원 결제
            </div>

            <div className="my-4 text-xs text-purple-400">── 비선형공식 실행 ──</div>

            <div className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-6xl font-black text-transparent">
              +{result.earned.toLocaleString()}P
            </div>

            <div className="mt-2 inline-block rounded-full bg-gradient-to-r from-rose-500 to-orange-400 px-5 py-1.5 text-sm font-bold text-white">
              120% 적립!
            </div>

            <div className="mt-3 text-xs text-zinc-500">
              원금 {result.amount.toLocaleString()}P + 보너스 {result.bonus.toLocaleString()}P
            </div>

            <button
              onClick={() => setResult(null)}
              className="mt-6 rounded-full border border-purple-500/40 bg-purple-900/20 px-8 py-2.5 text-sm text-white hover:bg-purple-900/40"
            >
              확인
            </button>
          </div>
        </div>
      )}

      <Navbar />
    </div>
  );
}
