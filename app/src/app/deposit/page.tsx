"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db, isConfigured } from "@/lib/firebase";
import { apiPost, ApiClientError } from "@/lib/api-client";
import Navbar from "@/components/Navbar";
import Link from "next/link";

// 의뢰자 확정: 1만 / 5만 / 10만 / 100만 / 1000만 / 1억 / 100억 / 수기(직접입력)
const PRESETS = [10_000, 50_000, 100_000, 1_000_000, 10_000_000, 100_000_000, 10_000_000_000];

function presetLabel(p: number): string {
  if (p >= 100_000_000) return `${p / 100_000_000}억`;
  if (p >= 10_000_000) return `${p / 10_000_000}천만`;
  if (p >= 1_000_000) return `${p / 1_000_000}백만`;
  return `${(p / 10_000).toLocaleString()}만`;
}

export default function DepositPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ amount: number; newBalance: number } | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  const refreshBalance = useCallback(async () => {
    if (!user || !isConfigured || !db) return;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setBalance(snap.data().totalPoints || 0);
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  const handleDeposit = async () => {
    const amt = parseInt(amount);
    if (!amt || amt < 1000) {
      setError("최소 입금 금액은 1,000P 입니다.");
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const r = await apiPost<{ amount: number; newBalance: number }>("/api/deposit", {
        amount: amt,
        method: "beta_virtual",
      });
      setBalance(r.newBalance);
      setSuccess({ amount: r.amount, newBalance: r.newBalance });
      setAmount("");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message || "입금 처리에 실패했습니다.");
      } else {
        setError("네트워크 오류입니다.");
      }
    } finally {
      setProcessing(false);
    }
  };

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center dark-text-muted">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="dark-header border-b border-[#E8EAF0] bg-white/95 px-5 py-4 pl-16 pr-16">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="text-[#6B7394] hover:text-[#1A1F36]">&larr;</Link>
          <div>
            <h1 className="text-lg font-bold">입금하기</h1>
            <p className="text-xs dark-text-muted text-[#6B7394]">다랜드 내 계좌 충전</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-5 py-5 lg:max-w-5xl lg:grid lg:grid-cols-[1fr_320px] lg:gap-6 lg:items-start">
        {/* ===== 메인 컬럼 ===== */}
        <div>
        {/* 현재 잔액 — 모바일 전용 (PC는 사이드바 + 우측 패널에 표시) */}
        <div
          className="rounded-2xl border border-cyan-500/20 p-5 text-center mb-5 lg:hidden"
          style={{ background: "linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(168, 85, 247, 0.08))" }}
        >
          <div className="text-xs text-[#6B7394]">현재 잔액</div>
          <div className="mt-1 text-[#3B4CCA] text-4xl font-black">{balance.toLocaleString()}P</div>
          <div className="mt-1 text-xs text-[#6B7394]">= {balance.toLocaleString()}원 (1P = 1원)</div>
        </div>

        <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">🧪</span>
            <span className="text-sm font-bold text-amber-700">베타 가상 입금 모드</span>
          </div>
          <div className="text-xs text-[#6B7394] leading-relaxed">
            현재는 베타 테스트 기간으로, 실제 송금 없이 가상으로 잔액이 충전됩니다.
            정식 출시 시에는 실제 은행 송금/PG 결제로 전환됩니다.
          </div>
        </div>

        {success && (
          <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-center">
            <div className="text-2xl mb-1">✅</div>
            <div className="text-sm font-bold text-emerald-700">
              {success.amount.toLocaleString()}P 입금 완료
            </div>
            <div className="text-xs text-[#6B7394] mt-1">
              현재 잔액: {success.newBalance.toLocaleString()}P
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 px-4 py-3 text-xs text-[#EF4444]">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <label className="text-xs text-[#6B7394] block">입금 금액 (P · 1P = 1원)</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="입금할 금액 입력"
            value={amount ? parseInt(amount).toLocaleString() : ""}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^0-9]/g, "");
              setAmount(digits);
            }}
            className="dark-input w-full rounded-xl border border-[#E8EAF0] bg-white px-4 py-3 text-center text-2xl font-black placeholder-zinc-600 outline-none focus:border-[#3B4CCA]/50"
          />

          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setAmount(String(p))}
                className="rounded-lg border border-[#E8EAF0] bg-purple-900/10 py-2 text-xs font-bold text-[#3B4CCA] hover:bg-[#3B4CCA]/8"
              >
                {presetLabel(p)}
              </button>
            ))}
            <button
              onClick={() => {
                setAmount("");
                document.querySelector<HTMLInputElement>('input[inputMode="numeric"]')?.focus();
              }}
              className="rounded-lg border border-dashed border-[#3B4CCA]/40 py-2 text-xs font-bold text-[#6B7394] hover:bg-[#3B4CCA]/8"
            >
              ✏️ 수기
            </button>
          </div>

          <button
            onClick={handleDeposit}
            disabled={processing || !amount}
            className="w-full rounded-2xl bg-gradient-to-r from-cyan-600 to-purple-600 py-4 text-base font-bold text-white shadow-lg shadow-[#3B4CCA]/15 transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            {processing ? "입금 처리 중..." : "입금하기"}
          </button>
        </div>

        <div
          className="mt-6 rounded-2xl border border-purple-500/20 p-4 text-xs leading-relaxed text-[#6B7394]"
          style={{ background: "linear-gradient(135deg, rgba(168, 85, 247, 0.05), rgba(6, 182, 212, 0.05))" }}
        >
          <div className="mb-2 text-sm font-bold text-[#3B4CCA]">입금 안내</div>
          <p><strong>1.</strong> 입금 금액은 즉시 <strong>다랜드 내 계좌(P)</strong>에 반영됩니다.</p>
          <p><strong>2.</strong> <strong>1원 = 1P</strong>로 1:1 매칭됩니다.</p>
          <p><strong>3.</strong> <strong>지출 등록 시</strong> 잔액에서 차감, <strong>비선형공식</strong>의 소비자 단계 <strong>120% 적립(재충전)</strong>됩니다.<br/>
            ※ 차감하여 온·오프 계좌에 이체 → AI검색 모드에 의해 지출금액만큼 다랜드 소비자 단계 <strong>120% 재충전</strong>.</p>
          <p><strong>4.</strong> 입금액이 클수록 비선형공식에 의해 <strong>120%(100%:분배금액 + 20%:수익)</strong> 분배수익 또한 많아집니다.<br/>
            시간이 필요없는 수수료 소득으로 1초에 예: <strong>1억 × 20% = 2천만원 적립</strong> 가능.</p>
          <p><strong>5.</strong> 비선형공식 알고리즘에 의해 <strong>하루에도 횟수 제한 없이 증액</strong>되는 구조로 <strong>특허등록</strong> 개발했습니다. <span className="text-[#EF4444]">* 1~2일 영업일 빼고.</span></p>
          <p><strong>6.</strong> 입금액은 <strong>언제든 출금 가능</strong>합니다.</p>
          <p className="mt-2 pt-2 border-t border-purple-500/15">
            <strong className="text-[#a855f7]">🏢 사업자/식당 사장님:</strong> 다랜드의 <strong>결제플랫폼</strong>에 가입하는 것만으로도
            <strong className="text-[#10B981]"> 고객 매출 전부가 수익</strong>으로 환산됩니다.
            (사업자 지출이 전부 120% 적립 → 매출 = 수익)
          </p>
        </div>
        </div>
        {/* ===== /메인 컬럼 ===== */}

        {/* ===== 우측 정보 패널 (PC 전용) ===== */}
        <aside className="mt-5 hidden flex-col gap-4 lg:mt-0 lg:flex lg:sticky lg:top-[4.5rem]">
          {/* 현재 잔액 */}
          <div
            className="rounded-2xl border border-cyan-500/20 p-5"
            style={{ background: "linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(168, 85, 247, 0.08))" }}
          >
            <div className="text-xs text-[#6B7394]">현재 잔액 (사용 가능)</div>
            <div className="mt-1 text-3xl font-black text-[#3B4CCA]">
              {balance.toLocaleString()}<span className="text-lg">P</span>
            </div>
            <div className="mt-1 text-xs text-[#6B7394]">= {balance.toLocaleString()}원 · 1P = 1원</div>
          </div>

          {/* 입금 계좌 안내 */}
          <div className="rounded-2xl border p-5" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
            <div className="mb-3 text-sm font-bold text-[#1A1F36]">🏦 입금 계좌 안내</div>
            <div className="mb-2 text-xs text-[#6B7394]">예금주 : <strong className="text-[#1A1F36]">(주)다랜드</strong></div>
            <div className="space-y-2 text-xs">
              {([["신한은행", "110-123-456789"], ["국민은행", "123-456-789012"], ["하나은행", "234-567-890123"]] as [string, string][]).map(([bank, acct]) => (
                <div key={bank} className="flex items-center justify-between rounded-lg bg-[#F7F8FC] px-3 py-2">
                  <span className="text-[#6B7394]">{bank}</span>
                  <span className="font-bold text-[#1A1F36]">{acct}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-[#6B7394]">※ 정식 출시 시 실제 입금 계좌로 전환됩니다. (베타: 가상 입금)</p>
          </div>

          {/* 안내사항 */}
          <div className="rounded-2xl border p-5" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
            <div className="mb-2 text-sm font-bold text-[#1A1F36]">📌 안내사항</div>
            <ul className="space-y-1.5 text-xs text-[#6B7394]">
              <li>• 입금은 실시간으로 반영됩니다.</li>
              <li>• 자동이체(CMS)는 신청 후 익월부터 적용됩니다.</li>
              <li>• 입금 한도는 1회 최대 100억원입니다.</li>
              <li>• 문의 : 고객센터 1588-0000</li>
            </ul>
          </div>
        </aside>
        {/* ===== /우측 정보 패널 ===== */}
      </div>

      <Navbar />
    </div>
  );
}
