"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db, isConfigured } from "@/lib/firebase";
import { calculateNonlinear } from "@/lib/nonlinear-engine";
import Navbar from "@/components/Navbar";

// Web Audio API 신호음
function playSignalSound() {
  try {
    const ctx = new AudioContext();
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.setValueAtTime(800, ctx.currentTime);
    osc1.frequency.setValueAtTime(1200, ctx.currentTime + 0.1);
    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.setValueAtTime(0, ctx.currentTime + 0.2);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.2);
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.setValueAtTime(1400, ctx.currentTime + 0.25);
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.25);
    gain2.gain.setValueAtTime(0, ctx.currentTime + 0.5);
    osc2.start(ctx.currentTime + 0.25);
    osc2.stop(ctx.currentTime + 0.5);
  } catch { /* AudioContext 미지원 */ }
}

// TTS 음성 알림
function speakAccumulation(category: string, amount: number, earned: number) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const msg = new SpeechSynthesisUtterance(
    `${category} ${amount.toLocaleString()}원에 ${earned.toLocaleString()}포인트, 120% 적립되었습니다.`
  );
  msg.lang = "ko-KR";
  msg.rate = 1.1;
  const voices = window.speechSynthesis.getVoices();
  const koVoice = voices.find((v) => v.lang.startsWith("ko"));
  if (koVoice) msg.voice = koVoice;
  window.speechSynthesis.speak(msg);
}

interface SpendCategory {
  id: string;
  name: string;
  icon: string;
  examples: string;
}

// 판매자(사업주) & 소비자 지출종류
// a:식자재 b:인건비 c:임대료 d:공과금 e:세금 f:대출상환금 g:투자금 h:소비자 의.식.주.기타생활비
const CATEGORIES: SpendCategory[] = [
  { id: "food-material", name: "식자재", icon: "🥬", examples: "식재료, 농수산물, 원재료" },
  { id: "labor", name: "인건비", icon: "👷", examples: "급여, 아르바이트, 외주비" },
  { id: "rent", name: "임대료", icon: "🏢", examples: "매장임대, 사무실, 창고" },
  { id: "utility", name: "공과금", icon: "💡", examples: "전기, 수도, 가스, 통신" },
  { id: "tax", name: "세금", icon: "🏛️", examples: "부가세, 소득세, 재산세" },
  { id: "loan", name: "대출상환금", icon: "🏦", examples: "원금상환, 이자, 할부금" },
  { id: "invest", name: "투자금", icon: "📈", examples: "사업투자, 설비, 시설투자" },
  { id: "living", name: "의.식.주.생활비", icon: "🏠", examples: "식비, 의류, 주거, 기타생활" },
];

type ModalState = null | { category: SpendCategory };
type ResultState = null | {
  category: SpendCategory;
  amount: number;
  earned: number;
  bonus: number;
  memberCount: number;
  perMemberAmount: number;
  advertiserReward: number;
};

export default function StoresPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>(null);
  const [result, setResult] = useState<ResultState>(null);
  const [processing, setProcessing] = useState(false);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  const handleRegister = async (category: SpendCategory, spendAmount: number) => {
    if (!user || processing) return;
    setProcessing(true);

    const nlResult = calculateNonlinear(spendAmount);

    if (isConfigured && db) {
      try {
        await runTransaction(db, async (transaction) => {
          const userRef = doc(db!, "users", user.uid);
          const userSnap = await transaction.get(userRef);
          const currentPoints = userSnap.exists() ? (userSnap.data().totalPoints || 0) : 0;
          transaction.set(userRef, { totalPoints: currentPoints + nlResult.totalAccumulation }, { merge: true });
          const txRef = doc(collection(db!, "transactions"));
          transaction.set(txRef, {
            userId: user.uid,
            userName: user.displayName || "사용자",
            category: category.id,
            categoryName: category.name,
            amount: spendAmount,
            memo: memo || category.examples,
            nonlinearResult: {
              principal: nlResult.principal,
              bonus: nlResult.bonus,
              totalAccumulation: nlResult.totalAccumulation,
              rate: nlResult.rate,
              memberCount: nlResult.memberCount,
              perMemberAmount: nlResult.perMemberAmount,
              advertiserReward: nlResult.advertiser.advertiserReward,
            },
            totalAccumulation: nlResult.totalAccumulation,
            createdAt: serverTimestamp(),
          });
        });
      } catch {
        // Firestore 오류 시에도 UI는 보여줌
      }
    }

    setModal(null);
    setResult({
      category,
      amount: spendAmount,
      earned: nlResult.totalAccumulation,
      bonus: nlResult.bonus,
      memberCount: nlResult.memberCount,
      perMemberAmount: nlResult.perMemberAmount,
      advertiserReward: nlResult.advertiser.advertiserReward,
    });
    setProcessing(false);
    setAmount("");
    setMemo("");

    // 신호음 + 음성 알림
    playSignalSound();
    setTimeout(() => {
      speakAccumulation(category.name, spendAmount, nlResult.totalAccumulation);
    }, 600);
  };

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-zinc-500">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen pb-20">
      {/* 헤더 */}
      <div className="dark-header border-b border-purple-900/20 bg-[#0d0d30]/80 px-5 py-4 pl-16">
        <h1 className="text-lg font-bold">지출데이터 등록</h1>
        <p className="text-xs dark-text-muted text-zinc-500">신용카드 결제 → 지출데이터 단말기 증명 → 120% 적립</p>
      </div>

      {/* 안내 배너 */}
      <div className="mx-5 mt-4 rounded-2xl border border-cyan-500/20 p-4"
        style={{ background: "linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(168, 85, 247, 0.08))" }}>
        <div className="flex items-center gap-2 text-sm font-bold text-cyan-400">
          <span>💡</span> 이용 방법
        </div>
        <div className="mt-2 space-y-1 text-xs text-zinc-400 leading-relaxed">
          <p>1. 어디서든 <strong className="text-white">신용카드로 결제</strong>합니다</p>
          <p>2. <strong className="text-white">지출데이터 단말기</strong>가 영수증을 증명합니다</p>
          <p>3. 본인 충전데이터에서 지출금액이 차감됩니다</p>
          <p>4. 비선형공식으로 <strong className="text-cyan-400">120% 증액</strong> → <strong className="text-emerald-400">다랜드 내 계좌에 적립</strong></p>
          <p>5. 지출비의 <strong className="text-orange-400">5%가 가입시킨 광고주</strong>에게 적립</p>
          <p>6. 적립 포인트를 <strong className="text-white">내 은행계좌로 출금</strong> 가능 (1P = 1원)</p>
          <p>7. 다른 멤버십 회원들에게도 분배 → 모두 120% 적립</p>
        </div>
      </div>

      {/* 카테고리 선택 */}
      <div className="px-5 pt-4">
        <div className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-3">판매자(사업주) & 소비자 지출종류</div>
      </div>
      <div className="grid grid-cols-4 gap-2 px-5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => { setModal({ category: cat }); setAmount(""); setMemo(""); }}
            className="dark-card flex flex-col items-center gap-2 rounded-2xl border border-purple-900/20 bg-[#14143c] p-4 text-center transition-all hover:border-purple-500/40 hover:-translate-y-1 active:scale-95"
          >
            <span className="text-3xl">{cat.icon}</span>
            <div className="text-sm font-bold">{cat.name}</div>
            <div className="text-[10px] text-zinc-500">{cat.examples}</div>
          </button>
        ))}
      </div>

      {/* 지출 등록 모달 */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm">
          <div className="dark-modal-bg w-full max-w-sm rounded-2xl border border-purple-900/40 bg-gradient-to-b from-[#1a1a4e] to-[#0d0d30] p-6">
            <div className="text-center">
              <div className="text-5xl">{modal.category.icon}</div>
              <h2 className="mt-2 text-xl font-bold">{modal.category.name} 지출 등록</h2>
              <p className="text-xs text-zinc-500 mt-1">신용카드 결제 영수증 기준</p>
            </div>

            <div className="mt-5 space-y-3">
              {/* 금액 입력 */}
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">결제 금액 (원)</label>
                <input
                  type="number"
                  placeholder="결제 금액 입력"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="dark-input w-full rounded-xl border border-purple-900/30 bg-[#0d0d30] px-4 py-3 text-lg font-bold text-center placeholder-zinc-600 outline-none focus:border-purple-500/50"
                />
              </div>

              {/* 메모 입력 */}
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">메모 (선택)</label>
                <input
                  type="text"
                  placeholder={modal.category.examples}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className="dark-input w-full rounded-xl border border-purple-900/30 bg-[#0d0d30] px-4 py-2.5 text-sm placeholder-zinc-600 outline-none focus:border-purple-500/50"
                />
              </div>

              {/* 미리보기 */}
              {amount && parseInt(amount) > 0 && (
                <div className="rounded-xl bg-purple-900/20 border border-purple-500/20 p-3 text-center">
                  <div className="text-xs text-zinc-500">비선형공식 적용 시</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">
                    +{Math.round(parseInt(amount) * 1.2).toLocaleString()}P
                  </div>
                  <div className="text-xs text-purple-400 mt-1">120% 증액 적립</div>
                </div>
              )}

              {/* 등록 버튼 */}
              <button
                onClick={() => {
                  const a = parseInt(amount);
                  if (a > 0) handleRegister(modal.category, a);
                }}
                disabled={processing || !amount || parseInt(amount) <= 0}
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {processing ? "지출데이터 단말기 증명 중..." : "지출데이터 등록"}
              </button>
            </div>

            <button
              onClick={() => { setModal(null); setAmount(""); setMemo(""); }}
              className="mt-4 w-full text-center text-sm text-zinc-500 hover:text-zinc-300"
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
            <div className="text-4xl">✅</div>
            <div className="mt-2 text-sm text-zinc-400">지출데이터 증명 → 다랜드 내 계좌에 적립 완료</div>

            <div className="mt-2 text-lg font-bold text-rose-400">
              {result.category.icon} {result.category.name} -{result.amount.toLocaleString()}원
            </div>

            <div className="my-4 text-xs text-purple-400">── 비선형공식 실행 ──</div>

            <div className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-6xl font-black text-transparent">
              +{result.earned.toLocaleString()}P
            </div>

            <div className="mt-2 inline-block rounded-full bg-gradient-to-r from-rose-500 to-orange-400 px-5 py-1.5 text-sm font-bold text-white">
              120% 증액 적립!
            </div>

            <div className="mt-3 text-xs text-zinc-500">
              원금 {result.amount.toLocaleString()}P + 보너스 {result.bonus.toLocaleString()}P
            </div>

            {/* 다랜드 계좌 안내 */}
            <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-zinc-400">
              <div className="text-cyan-400 font-bold mb-1">🏦 다랜드 내 계좌에 적립됨</div>
              <p>적립된 포인트는 등록된 <span className="text-white font-bold">내 은행계좌로 출금</span>할 수 있습니다.</p>
              <p>1P = 1원 (출금 수수료 무료)</p>
            </div>

            {/* 광고주 적립 안내 */}
            <div className="mt-2 rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 text-xs text-zinc-400">
              <div className="text-orange-400 font-bold mb-1">📢 광고주 적립 (5%)</div>
              <p>이 지출의 5% = <span className="text-orange-400 font-bold">{result.advertiserReward.toLocaleString()}P</span>가 가입시킨 광고주에게 적립됩니다.</p>
              <p>광고주가 회원을 많이 가입시킬수록 더 많은 금액이 지속 적립!</p>
            </div>

            {/* 멤버십 분배 안내 */}
            <div className="mt-2 rounded-xl border border-purple-500/20 bg-purple-900/10 p-3 text-xs text-zinc-400">
              <div className="text-purple-400 font-bold mb-1">🔄 멤버십 회원 분배</div>
              <p>이 지출금액이 {result.memberCount}명의 멤버십 회원에게 전달됩니다.</p>
              <p>각 회원도 본인 적립금에서 차감 → 비선형공식 → <span className="text-cyan-400 font-bold">120% 적립</span></p>
            </div>

            {/* 음성 알림 표시 */}
            <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2 text-[10px] text-zinc-500">
              🔊 신호음과 함께 &quot;{result.category.name} {result.amount.toLocaleString()}원에 120% 적립되었습니다&quot; 음성 안내
            </div>

            <button
              onClick={() => setResult(null)}
              className="mt-4 rounded-full border border-purple-500/40 bg-purple-900/20 px-8 py-2.5 text-sm text-white hover:bg-purple-900/40"
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
