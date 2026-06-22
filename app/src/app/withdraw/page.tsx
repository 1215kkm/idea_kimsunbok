"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db, isConfigured } from "@/lib/firebase";
import { getBalance as getDemoBalance, deductBalance as deductDemoBalance } from "@/lib/demo-store";
import { calculateWithdrawalRefund } from "@/lib/nonlinear-engine";
import { apiGet, apiPost, ApiClientError } from "@/lib/api-client";
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

type Bank = typeof BANKS[number];
type Step = "main" | "register" | "amount" | "confirm" | "complete";

interface SavedAccount {
  id: string; // local-generated
  bankId: string;
  account: string;
  holder: string;
}

interface WithdrawalItem {
  id: string;
  amount: number;
  status: "pending" | "completed" | "rejected";
  bank?: string;
  accountNumber?: string;
  requestedAt: number | null;
  processedAt: number | null;
  rejectReason: string | null;
}

const BANKS_KEY = (uid: string) => `daland-banks-${uid}`;
const SELECTED_KEY = (uid: string) => `daland-bank-selected-${uid}`;
const LEGACY_KEY = (uid: string) => `daland-bank-${uid}`;

function loadAccounts(uid: string): SavedAccount[] {
  try {
    const raw = localStorage.getItem(BANKS_KEY(uid));
    if (raw) return JSON.parse(raw) as SavedAccount[];
    // 1회성 마이그레이션: 단일 계좌 → 배열
    const legacy = localStorage.getItem(LEGACY_KEY(uid));
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (parsed?.bankId && parsed?.account) {
        const migrated: SavedAccount[] = [
          {
            id: `acc-${Date.now()}`,
            bankId: parsed.bankId,
            account: parsed.account,
            holder: parsed.holder || "",
          },
        ];
        localStorage.setItem(BANKS_KEY(uid), JSON.stringify(migrated));
        return migrated;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

function saveAccounts(uid: string, list: SavedAccount[]) {
  try {
    localStorage.setItem(BANKS_KEY(uid), JSON.stringify(list));
  } catch {
    // ignore
  }
}

export default function WithdrawPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [balance, setBalance] = useState(0);
  const [step, setStep] = useState<Step>("main");
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [holder, setHolder] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<WithdrawalItem[]>([]);
  const [completedAmount, setCompletedAmount] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  const refreshBalance = useCallback(async () => {
    if (!user) return;
    if (!isConfigured || !db) {
      setBalance(getDemoBalance(user));
      return;
    }
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) setBalance(snap.data().totalPoints || 0);
    } catch {
      // ignore
    }
  }, [user]);

  const refreshList = useCallback(async () => {
    if (!user || !isConfigured) return;
    try {
      const r = await apiGet<{ ok: boolean; items: WithdrawalItem[] }>(
        "/api/withdraw/list",
      );
      setItems(r.items || []);
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    refreshBalance();
    refreshList();
  }, [refreshBalance, refreshList]);

  // 저장된 계좌 목록 로드
  useEffect(() => {
    if (!user) return;
    const loaded = loadAccounts(user.uid);
    setAccounts(loaded);
    try {
      const sel = localStorage.getItem(SELECTED_KEY(user.uid));
      if (sel && loaded.find((a) => a.id === sel)) {
        setSelectedAccountId(sel);
      } else if (loaded.length > 0) {
        setSelectedAccountId(loaded[0].id);
      }
    } catch {
      if (loaded.length > 0) setSelectedAccountId(loaded[0].id);
    }
  }, [user]);

  const selectAccount = (id: string) => {
    setSelectedAccountId(id);
    if (user) {
      try {
        localStorage.setItem(SELECTED_KEY(user.uid), id);
      } catch {
        // ignore
      }
    }
  };

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || null;
  const selectedBankInfo = selectedAccount
    ? BANKS.find((b) => b.id === selectedAccount.bankId) || null
    : null;

  const handleAddAccount = () => {
    if (!selectedBank || !accountNumber.trim() || !holder.trim() || !user) return;
    const next: SavedAccount = {
      id: `acc-${Date.now()}`,
      bankId: selectedBank.id,
      account: accountNumber.trim(),
      holder: holder.trim(),
    };
    const newList = [...accounts, next];
    setAccounts(newList);
    saveAccounts(user.uid, newList);
    selectAccount(next.id);
    setSelectedBank(null);
    setAccountNumber("");
    setHolder("");
    setStep("main");
  };

  const handleDeleteAccount = (id: string) => {
    if (!user) return;
    if (!confirm("이 계좌 정보를 삭제할까요?")) return;
    const newList = accounts.filter((a) => a.id !== id);
    setAccounts(newList);
    saveAccounts(user.uid, newList);
    if (selectedAccountId === id) {
      const nextSel = newList[0]?.id || null;
      setSelectedAccountId(nextSel);
      if (nextSel) {
        try {
          localStorage.setItem(SELECTED_KEY(user.uid), nextSel);
        } catch {
          // ignore
        }
      }
    }
  };

  const handleWithdraw = async () => {
    if (!user || !selectedAccount || !selectedBankInfo) return;
    const amt = parseInt(withdrawAmount);
    if (!amt || amt <= 0 || amt > balance) return;
    setProcessing(true);
    setError(null);

    if (!isConfigured) {
      setTimeout(() => {
        deductDemoBalance(user, amt);
        setBalance((prev) => prev - amt);
        setCompletedAmount(amt);
        setProcessing(false);
        setStep("complete");
      }, 1500);
      return;
    }

    try {
      const r = await apiPost<{ requestId: string; newBalance: number; amount: number }>(
        "/api/withdraw/request",
        {
          amount: amt,
          bankInfo: {
            bank: selectedBankInfo.id,
            accountNumber: selectedAccount.account,
            holder: selectedAccount.holder,
          },
        },
      );
      setBalance(r.newBalance);
      setCompletedAmount(r.amount);
      await refreshList();
      setStep("complete");
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === "INSUFFICIENT_BALANCE") setError("잔액이 부족합니다.");
        else if (err.code === "INVALID_INPUT") setError("입력값을 확인해 주세요.");
        else if (err.code === "UNAUTHENTICATED") setError("다시 로그인해 주세요.");
        else setError("출금 요청에 실패했습니다.");
      } else {
        setError("네트워크 오류입니다.");
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelRequest = async (id: string) => {
    if (!user) return;
    if (!confirm("출금 요청을 취소할까요? 잔액으로 환불됩니다.")) return;
    try {
      await apiPost("/api/withdraw/cancel", { requestId: id });
      await refreshBalance();
      await refreshList();
    } catch {
      alert("취소 실패. 잠시 후 다시 시도해주세요.");
    }
  };

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center dark-text-muted">로딩 중...</div>;
  }

  const maskAccount = (acc: string) =>
    acc.replace(/(\d{3})\d+(\d{4})/, "$1-****-$2");

  return (
    <div className="min-h-screen pb-20">
      <div className="dark-header border-b border-[#E8EAF0] bg-white/95 px-5 py-4 pl-16 pr-16">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="text-[#6B7394] hover:text-[#1A1F36]">&larr;</Link>
          <div>
            <h1 className="text-lg font-bold">출금하기</h1>
            <p className="text-xs dark-text-muted text-[#6B7394]">다랜드 계좌 → 내 은행계좌</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-5 py-5">
        <div className="rounded-2xl border border-cyan-500/20 p-5 text-center mb-5"
          style={{ background: "linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(168, 85, 247, 0.08))" }}>
          <div className="text-xs text-[#6B7394]">다랜드 내 계좌 잔액</div>
          <div className="mt-1 text-[#3B4CCA] text-4xl font-black">{balance.toLocaleString()}원</div>
          <div className="mt-1 text-xs text-[#6B7394]">= {balance.toLocaleString()}P (1원 = 1P)</div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 px-4 py-3 text-xs text-[#EF4444]">
            {error}
          </div>
        )}

        {step === "main" && (
          <div className="space-y-4">
            <div className="rounded-2xl border p-4" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-bold text-[#6B7394]">등록된 은행계좌</div>
                <button
                  onClick={() => { setStep("register"); setSelectedBank(null); setAccountNumber(""); setHolder(""); }}
                  className="text-xs text-[#3B4CCA] hover:underline"
                >
                  + 계좌 추가
                </button>
              </div>

              {accounts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#E8EAF0] p-4 text-center text-xs text-[#6B7394]">
                  출금받을 은행계좌를 등록해주세요
                </div>
              ) : (
                <div className="space-y-2">
                  {accounts.map((acc) => {
                    const bank = BANKS.find((b) => b.id === acc.bankId);
                    const isSelected = acc.id === selectedAccountId;
                    return (
                      <div
                        key={acc.id}
                        onClick={() => selectAccount(acc.id)}
                        className="cursor-pointer rounded-xl border p-3 transition-all"
                        style={{
                          borderColor: isSelected ? "rgba(16,185,129,0.4)" : "var(--card-border)",
                          background: isSelected ? "rgba(16,185,129,0.08)" : "transparent",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{bank?.icon || "🏦"}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold">{bank?.name || acc.bankId}</div>
                            <div className="text-xs text-[#6B7394] truncate">{maskAccount(acc.account)}</div>
                            <div className="text-xs text-[#6B7394]">예금주 {acc.holder}</div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {isSelected ? (
                              <span className="text-xs font-bold text-[#10B981]">✓ 선택됨</span>
                            ) : (
                              <span className="text-xs text-[#6B7394]">선택</span>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteAccount(acc.id); }}
                              className="text-[10px] text-[#EF4444] hover:underline"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedAccount ? (
              <button onClick={() => { setStep("amount"); setWithdrawAmount(""); setError(null); }}
                className="w-full rounded-2xl bg-gradient-to-r from-cyan-600 to-purple-600 py-4 text-base font-bold text-white shadow-lg shadow-[#3B4CCA]/15 transition-transform hover:scale-[1.02] active:scale-95">
                🏦 선택한 계좌로 출금 요청하기
              </button>
            ) : (
              <button onClick={() => { setStep("register"); setSelectedBank(null); setAccountNumber(""); setHolder(""); }}
                className="w-full rounded-2xl bg-[#FFB800] py-4 text-base font-bold text-[#1A1F36] shadow-lg shadow-[#3B4CCA]/15 transition-transform hover:scale-[1.02] active:scale-95">
                은행계좌 등록하기
              </button>
            )}

            {isConfigured && (
              <div className="rounded-2xl border p-4" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
                <div className="text-sm font-bold text-[#6B7394] mb-3">출금 요청 내역</div>
                {items.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#E8EAF0] p-4 text-center text-xs text-[#6B7394]">
                    아직 출금 요청 내역이 없습니다.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((it) => {
                      const statusColor =
                        it.status === "pending" ? "#f59e0b" : it.status === "completed" ? "#10b981" : "#EF4444";
                      const statusText =
                        it.status === "pending" ? "승인 대기" : it.status === "completed" ? "완료" : "반려";
                      const bank = BANKS.find((b) => b.id === it.bank);
                      return (
                        <div key={it.id} className="rounded-xl border border-[#E8EAF0] bg-[#F7F8FC] p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-bold">{it.amount.toLocaleString()}원</div>
                              <div className="text-xs text-[#6B7394]">
                                {bank?.name || it.bank} {it.accountNumber ? maskAccount(it.accountNumber) : ""}
                              </div>
                              <div className="text-xs text-[#6B7394]">
                                신청 {it.requestedAt ? new Date(it.requestedAt).toLocaleString("ko-KR") : "-"}
                              </div>
                              {it.processedAt && it.status !== "pending" && (
                                <div className="text-xs font-bold" style={{ color: statusColor }}>
                                  {it.status === "completed" ? "승인 " : "반려 "}
                                  {new Date(it.processedAt).toLocaleString("ko-KR")}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `${statusColor}22`, color: statusColor }}>
                                {statusText}
                              </span>
                              {it.status === "pending" && (
                                <button onClick={() => handleCancelRequest(it.id)} className="text-[10px] text-[#6B7394] hover:text-[#EF4444]">
                                  취소
                                </button>
                              )}
                            </div>
                          </div>
                          {it.rejectReason && (
                            <div className="mt-1 text-[10px] text-[#EF4444]">사유: {it.rejectReason}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-purple-500/20 p-4 text-xs leading-relaxed text-[#6B7394]"
              style={{ background: "linear-gradient(135deg, rgba(168, 85, 247, 0.05), rgba(6, 182, 212, 0.05))" }}>
              <div className="mb-2 text-sm font-bold text-[#3B4CCA]">출금 안내</div>
              <p>1. 다랜드 내 계좌의 포인트는 <strong className="text-[#1A1F36]">1원 = 1P</strong>입니다.</p>
              <p>2. 출금 요청 시 잔액이 즉시 차감됩니다(승인 대기 중).</p>
              <p>3. 관리자가 검토 후 영업일 기준 1~2일 내 입금됩니다.</p>
              <p>4. 최소 출금 금액: <strong className="text-[#3B4CCA]">1,000원</strong></p>
              <p>5. 출금 수수료: <strong className="text-[#10B981]">무료</strong></p>
              <p>6. 승인 대기 중인 요청은 직접 취소(환불) 가능합니다.</p>
            </div>
          </div>
        )}

        {step === "register" && (
          <div className="space-y-4">
            <div className="text-sm font-bold text-[#6B7394]">은행 선택</div>
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
              <>
                <div>
                  <label className="text-xs text-[#6B7394] mb-1 block">계좌번호 (숫자만, 6~30자리)</label>
                  <input type="text" placeholder="계좌번호" value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9-]/g, ""))}
                    className="dark-input w-full rounded-xl border border-[#E8EAF0] bg-white px-4 py-3 text-center text-lg font-bold placeholder-zinc-600 outline-none focus:border-[#3B4CCA]/50" />
                </div>
                <div>
                  <label className="text-xs text-[#6B7394] mb-1 block">예금주</label>
                  <input type="text" placeholder="예금주명" value={holder}
                    onChange={(e) => setHolder(e.target.value.slice(0, 30))}
                    className="dark-input w-full rounded-xl border border-[#E8EAF0] bg-white px-4 py-3 text-sm placeholder-zinc-600 outline-none focus:border-[#3B4CCA]/50" />
                </div>
              </>
            )}

            <button onClick={handleAddAccount}
              disabled={!selectedBank || !accountNumber.trim() || !holder.trim()}
              className="w-full rounded-xl bg-[#FFB800] py-3 text-sm font-bold text-[#1A1F36] disabled:opacity-50">
              계좌 추가 완료
            </button>
            <button onClick={() => setStep("main")}
              className="w-full text-center text-sm text-[#6B7394] hover:text-[#6B7394]">취소</button>
          </div>
        )}

        {step === "amount" && selectedAccount && selectedBankInfo && (
          <div className="space-y-4">
            <div className="rounded-xl border p-3" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
              <div className="text-xs text-[#6B7394]">출금 받을 계좌</div>
              <div className="text-sm font-bold mt-1">
                {selectedBankInfo.name} · {maskAccount(selectedAccount.account)}
              </div>
              <div className="text-xs text-[#6B7394]">예금주 {selectedAccount.holder}</div>
            </div>

            <div className="rounded-xl border p-3 text-center" style={{ borderColor: "var(--card-border)", background: "var(--card-bg)" }}>
              <div className="text-xs text-[#6B7394]">출금 가능 잔액</div>
              <div className="text-2xl font-black text-[#3B4CCA]">{balance.toLocaleString()}원</div>
            </div>

            <div>
              <label className="text-xs text-[#6B7394] mb-1 block">출금 금액 (원, 최소 1,000)</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="출금할 금액 입력"
                value={withdrawAmount ? parseInt(withdrawAmount).toLocaleString() : ""}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^0-9]/g, "");
                  setWithdrawAmount(digits);
                }}
                className="dark-input w-full rounded-xl border border-[#E8EAF0] bg-white px-4 py-3 text-center text-2xl font-black placeholder-zinc-600 outline-none focus:border-[#3B4CCA]/50"
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[10_000, 50_000, 100_000, 1_000_000, 10_000_000, 100_000_000].map((amt) => (
                <button key={amt} onClick={() => setWithdrawAmount(String(amt))}
                  className="rounded-lg border border-[#E8EAF0] bg-purple-900/10 py-2 text-xs font-bold text-[#3B4CCA] hover:bg-[#3B4CCA]/8">
                  {amt >= 100_000_000 ? `${amt / 100_000_000}억` : amt >= 10_000_000 ? `${amt / 10_000}만` : `${(amt / 10000).toLocaleString()}만`}
                </button>
              ))}
              <button onClick={() => setWithdrawAmount(String(balance))}
                className="rounded-lg border border-[#3B4CCA]/20 bg-[#3B4CCA]/8 py-2 text-xs font-bold text-[#3B4CCA] hover:bg-[#3B4CCA]/12">
                전액
              </button>
            </div>

            {withdrawAmount && parseInt(withdrawAmount) > 0 && (
              <div className="rounded-xl border border-[#10B981]/20 bg-emerald-500/5 p-3 text-center">
                <div className="text-xs text-[#6B7394]">출금 예정 금액</div>
                <div className="text-2xl font-black text-[#10B981]">{parseInt(withdrawAmount).toLocaleString()}원</div>
                <div className="text-xs text-[#6B7394] mt-1">{selectedBankInfo.name} {maskAccount(selectedAccount.account)}로 입금</div>
              </div>
            )}

            <button onClick={() => { if (parseInt(withdrawAmount) > 0 && parseInt(withdrawAmount) <= balance) setStep("confirm"); }}
              disabled={!withdrawAmount || parseInt(withdrawAmount) < 1000 || parseInt(withdrawAmount) > balance}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 py-3 text-sm font-bold text-white disabled:opacity-50">
              출금 신청
            </button>
            <button onClick={() => setStep("main")}
              className="w-full text-center text-sm text-[#6B7394] hover:text-[#6B7394]">취소</button>
          </div>
        )}

        {step === "confirm" && selectedAccount && selectedBankInfo && (() => {
          const amt = parseInt(withdrawAmount);
          const refund = calculateWithdrawalRefund(amt);
          return (
          <div className="space-y-4 text-center">
            <div className="text-lg font-bold">출금 확인</div>

            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-left">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-base">🔗</span>
                <span className="text-sm font-bold text-amber-700">비선형공식 락(고리) 적용</span>
              </div>
              <div className="space-y-1.5 text-xs text-[#6B7394]">
                <div className="flex justify-between"><span>출금 신청 금액</span><span className="font-bold text-[#1A1F36]">{amt.toLocaleString()}원</span></div>
                <div className="flex justify-between"><span>비선형공식 {refund.rate}% 확보</span><span className="font-bold text-[#10B981]">{refund.securedPool.toLocaleString()}원</span></div>
                <div className="flex justify-between"><span>본인 계좌로 이체 (100%)</span><span className="font-bold text-[#3B4CCA]">{refund.refundAmount.toLocaleString()}원</span></div>
                <div className="flex justify-between"><span>다랜드 시스템 수익 (20%)</span><span className="font-bold text-amber-600">+{refund.systemProfit.toLocaleString()}원</span></div>
              </div>
              <div className="mt-2 rounded-lg bg-white/70 px-2 py-1.5 text-[11px] leading-relaxed text-[#6B7394]">
                관리자 승인 후 영업일 기준 1~2일 내 입금됩니다.
              </div>
            </div>

            <div className="rounded-2xl border border-purple-500/20 p-5"
              style={{ background: "linear-gradient(135deg, rgba(168, 85, 247, 0.05), rgba(6, 182, 212, 0.05))" }}>
              <div className="text-xs text-[#6B7394] mb-2">출금 정보</div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-[#6B7394]">출금 금액</span><span className="font-bold text-[#3B4CCA]">{amt.toLocaleString()}원</span></div>
                <div className="flex justify-between text-sm"><span className="text-[#6B7394]">입금 은행</span><span className="font-bold">{selectedBankInfo.name}</span></div>
                <div className="flex justify-between text-sm"><span className="text-[#6B7394]">계좌번호</span><span className="font-bold">{maskAccount(selectedAccount.account)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-[#6B7394]">예금주</span><span className="font-bold">{selectedAccount.holder}</span></div>
                <div className="flex justify-between text-sm"><span className="text-[#6B7394]">수수료</span><span className="font-bold text-[#10B981]">무료</span></div>
                <div className="h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
                <div className="flex justify-between text-sm"><span className="font-bold">출금 후 잔액</span><span className="font-bold text-[#3B4CCA]">{(balance - amt).toLocaleString()}원</span></div>
              </div>
            </div>

            <button onClick={handleWithdraw} disabled={processing}
              className="w-full rounded-2xl bg-gradient-to-r from-cyan-600 to-purple-600 py-4 text-base font-bold text-white shadow-lg shadow-[#3B4CCA]/15">
              {processing ? "출금 요청 중..." : "출금 확정"}
            </button>
            <button onClick={() => setStep("amount")} disabled={processing}
              className="w-full text-center text-sm text-[#6B7394] hover:text-[#6B7394]">뒤로</button>
          </div>
          );
        })()}

        {step === "complete" && selectedAccount && selectedBankInfo && (
          <div className="text-center space-y-4">
            <div className="text-5xl">✅</div>
            <div className="text-xl font-bold">출금 요청 접수 완료!</div>
            <div className="rounded-2xl border border-[#10B981]/20 bg-emerald-500/5 p-5">
              <div className="text-3xl font-black text-[#10B981]">{completedAmount.toLocaleString()}원</div>
              <div className="mt-2 text-sm text-[#6B7394]">{selectedBankInfo.name} {maskAccount(selectedAccount.account)}</div>
              <div className="mt-1 text-xs text-[#6B7394]">관리자 승인 후 1~2일 내 입금 예정</div>
            </div>

            <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 text-xs text-left">
              <div className="mb-1 flex items-center gap-2"><span>⏳</span><span className="font-bold text-amber-700">승인 대기 중</span></div>
              <div className="text-[#6B7394]">잔액에서 차감되었습니다. 승인 전이라면 메인 화면에서 직접 취소 가능합니다.</div>
            </div>

            <div className="rounded-xl bg-purple-900/10 border border-purple-500/20 p-3 text-xs text-[#6B7394]">
              <p>다랜드 내 계좌 잔액: <strong className="text-[#3B4CCA]">{balance.toLocaleString()}원</strong></p>
              <p className="mt-1">앞으로도 신용카드를 사용하시면 자동으로 120% 증액 재충전됩니다!</p>
            </div>

            <button onClick={() => setStep("main")}
              className="block w-full rounded-xl border border-purple-500/30 bg-[#3B4CCA]/8 py-3 text-sm font-bold text-[#3B4CCA] hover:bg-[#3B4CCA]/15">
              내역으로 돌아가기
            </button>
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
