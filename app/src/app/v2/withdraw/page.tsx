"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { loadMyAccount } from "@/lib/account-client";
import {
  BANKS,
  loadAccounts,
  loadSelectedAccount,
  saveAccounts,
  selectAccount,
  type Bank,
  type SavedAccount,
} from "@/lib/saved-accounts";
import { requestWithdraw, WithdrawError } from "@/lib/withdraw-client";
import V2Shell from "@/components/v2/V2Shell";
import BigButton from "@/components/v2/BigButton";
import NumberPad from "@/components/v2/NumberPad";
import { speak } from "@/components/v2/speak";

type Step = "amount" | "bank" | "number" | "holder";

const input =
  "w-full min-h-[80px] rounded-2xl border-2 border-[#BEC4D4] bg-white px-5 text-[28px] font-bold text-[#1A1F36] outline-none focus:border-[#3B4CCA]";

export default function V2Withdraw() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [account, setAccount] = useState<SavedAccount | null>(null);
  const [step, setStep] = useState<Step>("amount");
  const [bank, setBank] = useState<Bank | null>(null);
  const [number, setNumber] = useState("");
  const [holder, setHolder] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ amount: number; pending: boolean } | null>(null);

  useEffect(() => {
    if (!user) return;
    const acc = loadSelectedAccount(user.uid);
    setAccount(acc);
    if (!acc) setStep("bank");
    loadMyAccount(user)
      .then((a) => setBalance(a.balance))
      .catch(() => setBalance(null));
  }, [user]);

  const saveNewAccount = () => {
    if (!user || !bank || !number || !holder.trim()) return;
    const next: SavedAccount = { id: `acc-${Date.now()}`, bankId: bank.id, account: number, holder: holder.trim() };
    saveAccounts(user.uid, [...loadAccounts(user.uid), next]);
    selectAccount(user.uid, next.id);
    setAccount(next);
    setBank(null);
    setNumber("");
    setHolder("");
    setStep("amount");
  };

  const submit = async () => {
    if (!user || !account) return;
    const value = Number(amount) || 0;
    if (balance !== null && value > balance) return setError("잔액보다 많아요.");
    setBusy(true);
    setError("");
    try {
      const r = await requestWithdraw(user, value, account);
      setDone({ amount: r.amount, pending: r.pending });
      speak(r.pending ? "돈 찾기를 신청했어요" : "돈을 찾았어요");
    } catch (err) {
      setError(err instanceof WithdrawError ? err.message : "다시 한 번 해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const errorBox = error && (
    <p role="alert" className="rounded-2xl bg-[#EF4444]/10 px-5 py-4 text-[24px] font-bold text-[#EF4444]">
      {error}
    </p>
  );

  if (done) {
    return (
      <V2Shell title="돈 찾기">
        <section className="flex flex-col items-center gap-2 py-3 text-center">
          <div className="text-[80px]" aria-hidden>
            ✅
          </div>
          <div className="text-[40px] font-black">
            {done.amount.toLocaleString()}원 {done.pending ? "신청했어요" : "찾았어요"}
          </div>
          {done.pending && <div className="text-[26px] text-[#6B7394]">확인이 끝나면 통장으로 들어가요</div>}
        </section>
        <BigButton href="/v2/home" tone="gold" icon="🏠">
          처음으로
        </BigButton>
      </V2Shell>
    );
  }

  if (step === "bank") {
    return (
      <V2Shell title="돈 찾기" back="/v2/home">
        <h2 className="text-[34px] font-black">어느 은행이에요?</h2>
        <div className="flex flex-col gap-3">
          {BANKS.map((b) => (
            <BigButton
              key={b.id}
              small
              onClick={() => {
                setBank(b);
                setStep("number");
              }}
            >
              {b.name}
            </BigButton>
          ))}
        </div>
      </V2Shell>
    );
  }

  if (step === "number") {
    return (
      <V2Shell
        title="돈 찾기"
        back="/v2/home"
        action={
          <BigButton tone="gold" onClick={() => setStep("holder")} disabled={number.length < 8}>
            다음
          </BigButton>
        }
      >
        <h2 className="text-[34px] font-black">{bank?.name} 계좌번호</h2>
        <NumberPad value={number} onChange={setNumber} mode="digits" />
      </V2Shell>
    );
  }

  if (step === "holder") {
    return (
      <V2Shell title="돈 찾기" back="/v2/home">
        <h2 className="text-[34px] font-black">통장 주인 이름</h2>
        <input className={input} value={holder} onChange={(e) => setHolder(e.target.value)} autoComplete="name" />
        <BigButton tone="gold" onClick={saveNewAccount} disabled={!holder.trim()}>
          저장
        </BigButton>
      </V2Shell>
    );
  }

  const bankName = BANKS.find((b) => b.id === account?.bankId)?.name || "은행";
  return (
    <V2Shell
      title="돈 찾기"
      back="/v2/home"
      action={
        <BigButton tone="gold" onClick={submit} disabled={busy || !amount}>
          {busy ? "잠시만요…" : "찾기"}
        </BigButton>
      }
    >
      <button
        type="button"
        onClick={() => setStep("bank")}
        className="flex min-h-[96px] items-center gap-4 rounded-3xl border-2 border-[#BEC4D4] bg-white px-5 text-left"
      >
        <span className="text-[40px]" aria-hidden>
          🏦
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[26px] font-black">
            {bankName} ****{account?.account.slice(-4)}
          </span>
          <span className="block text-[20px] text-[#6B7394]">{account?.holder}</span>
        </span>
        <span className="text-[22px] font-bold text-[#3B4CCA]">바꾸기</span>
      </button>

      <h2 className="text-[34px] font-black">얼마 찾을까요?</h2>
      <NumberPad value={amount} onChange={setAmount} quick={[10_000, 100_000, 1_000_000]} />
      {balance !== null && balance > 0 && (
        <BigButton small onClick={() => setAmount(String(balance))}>
          전부 ({balance.toLocaleString()}원)
        </BigButton>
      )}
      {errorBox}
    </V2Shell>
  );
}
