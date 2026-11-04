"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { loadMyAccount } from "@/lib/account-client";
import { DepositError, registerDeposit } from "@/lib/deposit-client";
import { depositLimitFor } from "@/lib/deposit-limits";
import type { MemberType } from "@/lib/business";
import V2Shell from "@/components/v2/V2Shell";
import BigButton from "@/components/v2/BigButton";
import NumberPad from "@/components/v2/NumberPad";
import { speak } from "@/components/v2/speak";

export default function V2Charge() {
  const { user } = useAuth();
  const [memberType, setMemberType] = useState<MemberType>("personal");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ amount: number; newBalance: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    loadMyAccount(user)
      .then((a) => setMemberType(a.memberType))
      .catch(() => {});
  }, [user]);

  const limit = depositLimitFor(memberType);

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      const r = await registerDeposit(user, Number(amount) || 0, memberType);
      setDone(r);
      speak(`${r.amount.toLocaleString()}원 넣었어요`);
    } catch (err) {
      setError(err instanceof DepositError ? err.message : "다시 한 번 해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <V2Shell title="돈 넣기">
        <section className="flex flex-col items-center gap-2 py-3 text-center">
          <div className="text-[80px]" aria-hidden>
            ✅
          </div>
          <div className="text-[40px] font-black">{done.amount.toLocaleString()}원 넣었어요</div>
          <div className="text-[26px] text-[#6B7394]">내 포인트 {done.newBalance.toLocaleString()} P</div>
        </section>
        <BigButton href="/v2/home" tone="gold" icon="🏠">
          처음으로
        </BigButton>
      </V2Shell>
    );
  }

  return (
    <V2Shell
      title="돈 넣기"
      back="/v2/home"
      action={
        <BigButton tone="gold" onClick={submit} disabled={busy || !amount}>
          {busy ? "잠시만요…" : "넣기"}
        </BigButton>
      }
    >
      <h2 className="text-[34px] font-black">얼마 넣을까요?</h2>
      <NumberPad value={amount} onChange={setAmount} quick={[10_000, 100_000, 1_000_000]} />
      {error && (
        <p role="alert" className="rounded-2xl bg-[#EF4444]/10 px-5 py-4 text-[24px] font-bold text-[#EF4444]">
          {error}
        </p>
      )}
      <p className="text-center text-[20px] text-[#6B7394]">
        {limit.min.toLocaleString()}원 ~ {limit.max.toLocaleString()}원 · 베타 기간에는 가상으로 넣어요
      </p>
    </V2Shell>
  );
}
