"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { registerSpend, SpendError, type SpendOutcome } from "@/lib/spend-client";
import { STORE_MODE_THRESHOLD } from "@/lib/small-spend";
import V2Shell from "@/components/v2/V2Shell";
import BigButton from "@/components/v2/BigButton";
import NumberPad from "@/components/v2/NumberPad";
import { speak } from "@/components/v2/speak";

// 지출 종류 (기존 /stores 와 같은 id — 서버 spend-categories). 생활비를 맨 앞에.
const KINDS = [
  { id: "living", name: "생활비", icon: "🏠" },
  { id: "food-material", name: "식자재", icon: "🥬" },
  { id: "utility", name: "공과금", icon: "💡" },
  { id: "rent", name: "임대료", icon: "🏢" },
  { id: "labor", name: "인건비", icon: "👷" },
  { id: "tax", name: "세금", icon: "🏛️" },
  { id: "loan", name: "대출상환", icon: "🏦" },
  { id: "invest", name: "투자금", icon: "📈" },
] as const;

type Kind = (typeof KINDS)[number];

export default function V2Spend() {
  const { user } = useAuth();
  const [kind, setKind] = useState<Kind | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<(SpendOutcome & { amount: number }) | null>(null);

  const submit = async () => {
    if (!user || !kind) return;
    const value = Number(amount) || 0;
    if (value <= 0) return;
    setBusy(true);
    setError("");
    try {
      const r = await registerSpend(user, { categoryId: kind.id, categoryName: kind.name, amount: value });
      setDone({ ...r, amount: value });
      if (r.storeMode === "stored") speak("모아 둘게요");
      else speak(`${r.earned.toLocaleString()} 포인트 쌓였어요`);
    } catch (err) {
      setError(err instanceof SpendError ? err.message : "다시 한 번 해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    const stored = done.storeMode === "stored";
    return (
      <V2Shell title="쓴 돈 적기">
        <section className="flex flex-col items-center gap-2 py-3 text-center">
          <div className="text-[80px]" aria-hidden>
            {stored ? "🪙" : "✅"}
          </div>
          {stored ? (
            <>
              <div className="text-[40px] font-black">모아 둘게요</div>
              <div className="text-[26px] text-[#6B7394]">
                {done.smallSpendPending.toLocaleString()}원 · {STORE_MODE_THRESHOLD.toLocaleString()}원이 되면 쌓여요
              </div>
            </>
          ) : (
            <>
              <div className="text-[28px] text-[#6B7394]">{done.amount.toLocaleString()}원 썼어요</div>
              <div className="text-[48px] font-black text-[#10B981]">+{done.earned.toLocaleString()} P</div>
              <div className="text-[30px] font-black">쌓였어요</div>
            </>
          )}
        </section>
        <BigButton href="/v2/home" tone="gold" icon="🏠">
          처음으로
        </BigButton>
        <BigButton
          small
          onClick={() => {
            setDone(null);
            setKind(null);
            setAmount("");
          }}
        >
          하나 더 적기
        </BigButton>
      </V2Shell>
    );
  }

  if (!kind) {
    return (
      <V2Shell title="쓴 돈 적기" back="/v2/home">
        <h2 className="text-[34px] font-black">어디에 썼어요?</h2>
        <div className="grid grid-cols-2 gap-3">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k)}
              className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-[#BEC4D4] bg-white text-[28px] font-black active:scale-[0.98]"
            >
              <span className="text-[48px]" aria-hidden>
                {k.icon}
              </span>
              {k.name}
            </button>
          ))}
        </div>
      </V2Shell>
    );
  }

  return (
    <V2Shell
      title="쓴 돈 적기"
      back="/v2/home"
      action={
        <BigButton tone="gold" onClick={submit} disabled={busy || !amount}>
          {busy ? "잠시만요…" : "적기"}
        </BigButton>
      }
    >
      <button
        type="button"
        onClick={() => setKind(null)}
        className="flex min-h-[80px] items-center gap-3 rounded-2xl border-2 border-[#3B4CCA] bg-[#3B4CCA]/10 px-5 text-[28px] font-black text-[#3B4CCA]"
      >
        <span aria-hidden className="text-[36px]">
          {kind.icon}
        </span>
        {kind.name}
        <span className="ml-auto text-[22px] font-bold">바꾸기</span>
      </button>
      <h2 className="text-[34px] font-black">얼마 썼어요?</h2>
      <NumberPad value={amount} onChange={setAmount} quick={[1_000, 10_000, 100_000]} />
      {error && (
        <p role="alert" className="rounded-2xl bg-[#EF4444]/10 px-5 py-4 text-[24px] font-bold text-[#EF4444]">
          {error}
        </p>
      )}
    </V2Shell>
  );
}
