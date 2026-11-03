"use client";

import { useEffect } from "react";

/**
 * 큰 숫자판 — 휴대폰 자판 대신 화면 버튼으로 숫자를 넣는다 (PC 에서는 키보드 숫자도 된다).
 * money: 1,000 단위 쉼표 + "원", 빠른 더하기 버튼 / digits: 계좌번호처럼 숫자 그대로
 */
interface Props {
  value: string;
  onChange: (digits: string) => void;
  mode?: "money" | "digits";
  /** 누르면 더해지는 금액 (money) */
  quick?: number[];
  maxLength?: number;
}

function quickLabel(n: number): string {
  if (n >= 100_000_000) return `+${n / 100_000_000}억`;
  if (n >= 10_000) return `+${(n / 10_000).toLocaleString()}만`;
  return `+${n.toLocaleString()}`;
}

export default function NumberPad({ value, onChange, mode = "money", quick = [], maxLength = mode === "money" ? 11 : 16 }: Props) {
  const push = (d: string) => {
    const next = (value + d).replace(/^0+/, "");
    if (next.length <= maxLength) onChange(next);
  };
  const back = () => onChange(value.slice(0, -1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (/^[0-9]$/.test(e.key)) push(e.key);
      else if (e.key === "Backspace") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const shown = mode === "money" ? (value ? Number(value).toLocaleString() : "0") : value || " ";
  const key = "flex min-h-[72px] items-center justify-center rounded-2xl border-2 border-[#E8EAF0] bg-white text-[36px] font-black text-[#1A1F36] active:scale-95 active:bg-[#F0F2F8]";

  return (
    <div className="flex flex-col gap-4">
      <div
        aria-live="polite"
        className="flex min-h-[96px] items-center justify-end gap-2 rounded-3xl border-2 border-[#3B4CCA] bg-white px-6 font-black text-[#1A1F36]"
      >
        <span className={`whitespace-nowrap leading-tight ${shown.length > 12 ? "text-[32px]" : "text-[48px]"}`}>{shown}</span>
        {mode === "money" && <span className="text-[30px]">원</span>}
      </div>

      {mode === "money" && quick.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {quick.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                const next = String((Number(value) || 0) + n);
                if (next.length <= maxLength) onChange(next);
              }}
              className="min-h-[64px] rounded-2xl border-2 border-[#3B4CCA]/30 bg-[#3B4CCA]/5 text-[26px] font-black text-[#3B4CCA] active:scale-95"
            >
              {quickLabel(n)}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" onClick={() => push(d)} className={key}>
            {d}
          </button>
        ))}
        <button type="button" onClick={() => onChange("")} className={`${key} text-[26px] text-[#6B7394]`}>
          다시
        </button>
        <button type="button" onClick={() => push("0")} className={key}>
          0
        </button>
        <button type="button" onClick={back} aria-label="한 글자 지우기" className={`${key} text-[30px] text-[#6B7394]`}>
          ⌫
        </button>
      </div>
    </div>
  );
}
