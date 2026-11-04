"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * 간단 화면(v2) 큰 버튼 — 높이 96px 이상, 글자 28px.
 * gold = 이 화면에서 할 일(하나만), plain = 나머지, blue = 선택된 항목
 */
type Tone = "gold" | "plain" | "blue";

const TONE: Record<Tone, string> = {
  gold: "bg-[#FFB800] text-[#1A1F36] hover:bg-[#E5A600] border-transparent",
  plain: "bg-white text-[#1A1F36] border-[#BEC4D4] hover:border-[#3B4CCA]",
  blue: "bg-[#3B4CCA]/10 text-[#3B4CCA] border-[#3B4CCA]",
};

interface Props {
  children: ReactNode;
  icon?: string;
  tone?: Tone;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  small?: boolean;
}

export default function BigButton({ children, icon, tone = "plain", href, onClick, disabled, small }: Props) {
  const cls = `flex w-full items-center justify-center gap-4 rounded-3xl border-2 px-6 font-black transition-transform active:scale-[0.98] disabled:opacity-40 ${
    small ? "min-h-[72px] text-[24px]" : "min-h-[104px] text-[30px]"
  } ${TONE[tone]}`;
  const inner = (
    <>
      {icon && (
        <span aria-hidden className={small ? "text-[30px]" : "text-[40px]"}>
          {icon}
        </span>
      )}
      <span>{children}</span>
    </>
  );
  if (href && !disabled) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {inner}
    </button>
  );
}
