"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db, isConfigured } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import Link from "next/link";

const BANKS = [
  { id: "shinhan", name: "신한은행", icon: "🏦", color: "#0046ff" },
  { id: "kb", name: "국민은행", icon: "🏦", color: "#f5a623" },
  { id: "woori", name: "우리은행", icon: "🏦", color: "#0066b3" },
  { id: "hana", name: "하나은행", icon: "🏦", color: "#009490" },
  { id: "nh", name: "농협은행", icon: "🏦", color: "#00703c" },
  { id: "kakao", name: "카카오뱅크", icon: "🏦", color: "#fee500" },
  { id: "toss", name: "토스뱅크", icon: "🏦", color: "#0064ff" },
];

type Step = "main" | "register" | "amount" | "confirm" | "complete";

export default function WithdrawPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [step, setStep] = useState<Step>("main");
  const [selectedBank, setSelectedBank] = useState<typeof BANKS[0] | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [registeredBank, setRegisteredBank] = useState<{ bank: typeof BANKS[0]; account: string } | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !isConfigured || !db) {
      setBalance(128400);
      return;
    }
    const fetch = async () => {
      try {
        const snap = await getDoc(doc(db!, "users", user.uid));
        if (snap.exists()) setBalance(snap.data().totalPoints || 0);
      } catch {
        setBalance(128400);
      }
    };
    fetch();
  }, [user]);

  const handleRegisterBank = () => {
    if (!selectedBank || !accountNumber) return;
    setRegisteredBank({ bank: selectedBank, account: accountNumber });
    setStep("main");
  };

  const handleWithdraw = () => {
    const amt = parseInt(withdrawAmount);
    if (!amt || amt <= 0 || amt > balance) return;
    setProcessing(true);
    setTimeout(() => {
      setBalance((prev) => prev - amt);
      setProcessing(false);
      setStep("complete");
    }, 2000);
  };

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center dark-text-muted">로딩 중...</div>;
  }

  const maskedAccount = registeredBank
    ? registeredBank.account.replace(/(\d{3})\d+(\d{4})/, "$1-****-$2")
    : "";

  return (
    <div className="min-h-screen pb-20">
      <div className="dark-header border-b border-purple-900/20 bg-[#0d0d30]/80 px-5 py-4 pl-16">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="text-zinc-400 hover:text-white">&larr;</Link>
          <div>
            <h1 className="text-lg font-bold">출금하기</h1>
            <p className="text-xs dark-text-muted text-zinc-500">다랜드 계좌 → 내 은행계좌</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-5 py-5">
        {/* 다랜드 계좌 잔액 */}
        <div className="rounded-2xl border border-cyan-500/20 p-5 text-center mb-5"
          style={{ background: "linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(168, 85, 247, 0.08))" }}>
          <div className="text-xs text-zinc-500">다랜드 내 계좌 잔액</div>
          <div className="mt-1 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-4xl font-black text-transparent">
            {balance.toLocaleString()}P
          </div>
          <div className="mt-1 text-xs text-zinc-500">= {balance.toLocaleString()}원 상당 (1P = 1원)</div>
        </div>

        {/* 메인 화면 */}
        {step === "main" && (
          <div className="space-y-4">
            {/* 등록된 은행계좌 */}
            <div className="rounded-2xl border p-4" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-bold text-zinc-300">등록된 은행계좌</div>
                <button onClick={() => { setStep("register"); setSelectedBank(null); setAccountNumber(""); }}
                  className="text-xs text-purple-400 hover:underline">
                  {registeredBank ? "변경" : "등록하기"}
                </button>
              </div>
              {registeredBank ? (
                <div className="flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                  <div className="text-2xl">{registeredBank.bank.icon}</div>
                  <div>
                    <div className="text-sm font-bold">{registeredBank.bank.name}</div>
                    <div className="text-xs text-zinc-400">{maskedAccount}</div>
                  </div>
                  <div className="ml-auto text-xs text-emerald-400 font-bold">연결됨</div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-zinc-700 p-4 text-center text-xs text-zinc-500">
                  출금받을 은행계좌를 등록해주세요
                </div>
              )}
            </div>

            {/* 출금 버튼 */}
            {registeredBank ? (
              <button onClick={() => { setStep("amount"); setWithdrawAmount(""); }}
                className="w-full rounded-2xl bg-gradient-to-r from-cyan-600 to-purple-600 py-4 text-base font-bold text-white shadow-lg shadow-purple-500/20 transition-transform hover:scale-[1.02] active:scale-95">
                🏦 출금하기
              </button>
            ) : (
              <button onClick={() => { setStep("register"); setSelectedBank(null); setAccountNumber(""); }}
                className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 py-4 text-base font-bold text-white shadow-lg shadow-purple-500/20 transition-transform hover:scale-[1.02] active:scale-95">
                은행계좌 등록하기
              </button>
            )}

            {/* 안내 */}
            <div className="rounded-2xl border border-purple-500/20 p-4 text-xs leading-relaxed text-zinc-400"
              style={{ background: "linear-gradient(135deg, rgba(168, 85, 247, 0.05), rgba(6, 182, 212, 0.05))" }}>
              <div className="mb-2 text-sm font-bold text-purple-400">출금 안내</div>
              <p>1. 다랜드 내 계좌의 포인트는 <strong className="text-white">1P = 1원</strong>입니다.</p>
              <p>2. 등록된 은행계좌로 출금 요청하면, 영업일 기준 1~2일 내 입금됩니다.</p>
              <p>3. 최소 출금 금액: <strong className="text-cyan-400">1,000P</strong></p>
              <p>4. 출금 수수료: <strong className="text-emerald-400">무료</strong></p>
            </div>

            {/* 흐름 설명 */}
            <div className="rounded-2xl border p-4" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
              <div className="text-sm font-bold text-zinc-300 mb-3">다랜드 포인트 흐름</div>
              <div className="space-y-2 text-xs">
                {[
                  { step: "1", text: "신용카드로 어디서든 결제", color: "#a855f7" },
                  { step: "2", text: "다랜드가 지출데이터를 인식", color: "#06b6d4" },
                  { step: "3", text: "비선형공식으로 120% 증액", color: "#f59e0b" },
                  { step: "4", text: "다랜드 내 계좌에 적립", color: "#10b981" },
                  { step: "5", text: "내 은행계좌로 출금 가능!", color: "#ec4899" },
                ].map((s) => (
                  <div key={s.step} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white"
                      style={{ background: s.color }}>{s.step}</div>
                    <div className="text-zinc-400">{s.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 은행 등록 화면 */}
        {step === "register" && (
          <div className="space-y-4">
            <div className="text-sm font-bold text-zinc-300">은행 선택</div>
            <div className="grid grid-cols-3 gap-2">
              {BANKS.map((bank) => (
                <button key={bank.id} onClick={() => setSelectedBank(bank)}
                  className="rounded-xl border p-3 text-center transition-all"
                  style={{
                    borderColor: selectedBank?.id === bank.id ? bank.color + "80" : "var(--card-border)",
                    background: selectedBank?.id === bank.id ? bank.color + "15" : "var(--card-bg)",
                  }}>
                  <div className="text-xl">{bank.icon}</div>
                  <div className="mt-1 text-xs font-bold">{bank.name}</div>
                </button>
              ))}
            </div>

            {selectedBank && (
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">계좌번호 입력</label>
                <input type="text" placeholder="계좌번호를 입력하세요" value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="dark-input w-full rounded-xl border border-purple-900/30 bg-[#0d0d30] px-4 py-3 text-center text-lg font-bold placeholder-zinc-600 outline-none focus:border-purple-500/50" />
              </div>
            )}

            <button onClick={handleRegisterBank}
              disabled={!selectedBank || !accountNumber}
              className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 py-3 text-sm font-bold text-white disabled:opacity-50">
              계좌 등록 완료
            </button>
            <button onClick={() => setStep("main")}
              className="w-full text-center text-sm text-zinc-500 hover:text-zinc-300">취소</button>
          </div>
        )}

        {/* 출금 금액 입력 */}
        {step === "amount" && registeredBank && (
          <div className="space-y-4">
            <div className="rounded-xl border p-3 text-center" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
              <div className="text-xs text-zinc-500">출금 가능 잔액</div>
              <div className="text-2xl font-black text-cyan-400">{balance.toLocaleString()}P</div>
            </div>

            <div>
              <label className="text-xs text-zinc-500 mb-1 block">출금 금액 (P)</label>
              <input type="number" placeholder="출금할 금액 입력" value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="dark-input w-full rounded-xl border border-purple-900/30 bg-[#0d0d30] px-4 py-3 text-center text-2xl font-black placeholder-zinc-600 outline-none focus:border-purple-500/50" />
            </div>

            {/* 빠른 금액 버튼 */}
            <div className="grid grid-cols-4 gap-2">
              {[10000, 50000, 100000].map((amt) => (
                <button key={amt} onClick={() => setWithdrawAmount(String(amt))}
                  className="rounded-lg border border-purple-900/30 bg-purple-900/10 py-2 text-xs font-bold text-purple-400 hover:bg-purple-900/20">
                  {(amt / 10000).toLocaleString()}만
                </button>
              ))}
              <button onClick={() => setWithdrawAmount(String(balance))}
                className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 py-2 text-xs font-bold text-cyan-400 hover:bg-cyan-500/20">
                전액
              </button>
            </div>

            {withdrawAmount && parseInt(withdrawAmount) > 0 && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
                <div className="text-xs text-zinc-500">출금 예정 금액</div>
                <div className="text-2xl font-black text-emerald-400">{parseInt(withdrawAmount).toLocaleString()}원</div>
                <div className="text-xs text-zinc-500 mt-1">{registeredBank.bank.name} {maskedAccount}로 입금</div>
              </div>
            )}

            <button onClick={() => { if (parseInt(withdrawAmount) > 0 && parseInt(withdrawAmount) <= balance) setStep("confirm"); }}
              disabled={!withdrawAmount || parseInt(withdrawAmount) <= 0 || parseInt(withdrawAmount) > balance}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 py-3 text-sm font-bold text-white disabled:opacity-50">
              출금 신청
            </button>
            <button onClick={() => setStep("main")}
              className="w-full text-center text-sm text-zinc-500 hover:text-zinc-300">취소</button>
          </div>
        )}

        {/* 출금 확인 */}
        {step === "confirm" && registeredBank && (
          <div className="space-y-4 text-center">
            <div className="text-lg font-bold">출금 확인</div>
            <div className="rounded-2xl border border-purple-500/20 p-5"
              style={{ background: "linear-gradient(135deg, rgba(168, 85, 247, 0.05), rgba(6, 182, 212, 0.05))" }}>
              <div className="text-xs text-zinc-500 mb-2">출금 정보</div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">출금 금액</span>
                  <span className="font-bold text-cyan-400">{parseInt(withdrawAmount).toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">입금 은행</span>
                  <span className="font-bold">{registeredBank.bank.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">계좌번호</span>
                  <span className="font-bold">{maskedAccount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">수수료</span>
                  <span className="font-bold text-emerald-400">무료</span>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
                <div className="flex justify-between text-sm">
                  <span className="font-bold">출금 후 잔액</span>
                  <span className="font-bold text-purple-400">{(balance - parseInt(withdrawAmount)).toLocaleString()}P</span>
                </div>
              </div>
            </div>

            <button onClick={handleWithdraw} disabled={processing}
              className="w-full rounded-2xl bg-gradient-to-r from-cyan-600 to-purple-600 py-4 text-base font-bold text-white shadow-lg shadow-purple-500/20">
              {processing ? "출금 처리 중..." : "출금 확정"}
            </button>
            <button onClick={() => setStep("amount")} disabled={processing}
              className="w-full text-center text-sm text-zinc-500 hover:text-zinc-300">뒤로</button>
          </div>
        )}

        {/* 출금 완료 */}
        {step === "complete" && registeredBank && (
          <div className="text-center space-y-4">
            <div className="text-5xl">✅</div>
            <div className="text-xl font-bold">출금 신청 완료!</div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="text-3xl font-black text-emerald-400">{parseInt(withdrawAmount).toLocaleString()}원</div>
              <div className="mt-2 text-sm text-zinc-400">
                {registeredBank.bank.name} {maskedAccount}
              </div>
              <div className="mt-1 text-xs text-zinc-500">영업일 기준 1~2일 내 입금 예정</div>
            </div>

            <div className="rounded-xl bg-purple-900/10 border border-purple-500/20 p-3 text-xs text-zinc-400">
              <p>다랜드 내 계좌 잔액: <strong className="text-cyan-400">{balance.toLocaleString()}P</strong></p>
              <p className="mt-1">앞으로도 신용카드를 사용하시면 자동으로 120% 증액 적립됩니다!</p>
            </div>

            <Link href="/dashboard"
              className="block w-full rounded-xl border border-purple-500/30 bg-purple-900/20 py-3 text-sm font-bold text-white hover:bg-purple-900/40">
              대시보드로 돌아가기
            </Link>
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
