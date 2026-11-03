"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { loadMyAccount } from "@/lib/account-client";
import V2Shell from "@/components/v2/V2Shell";
import BigButton from "@/components/v2/BigButton";
import { bigNumberSize } from "@/components/v2/fit";

export default function V2Home() {
  const { user, signOut } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    loadMyAccount(user)
      .then((a) => setBalance(a.balance))
      .catch(() => setBalance(null));
  }, [user]);

  const shown = balance === null ? "…" : balance.toLocaleString();

  return (
    <V2Shell title="다랜드">
      <section className="rounded-3xl bg-gradient-to-br from-[#3B4CCA] to-[#2D3A8C] px-6 py-10 text-center text-white">
        <div className="text-[26px] font-bold text-white/85">내 포인트</div>
        <div className={`mt-3 whitespace-nowrap font-black leading-tight ${bigNumberSize(shown)}`}>
          {shown}
          <span className="ml-2 text-[28px]">P</span>
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <BigButton href="/v2/spend" icon="🛒" tone="gold">
          쓴 돈 적기
        </BigButton>
        <BigButton href="/v2/charge" icon="💰">
          돈 넣기
        </BigButton>
        <BigButton href="/v2/withdraw" icon="🏦">
          돈 찾기
        </BigButton>
        <BigButton href="/v2/history" icon="📋">
          내역 보기
        </BigButton>
      </section>

      <section className="flex flex-col gap-4 border-t-2 border-[#E8EAF0] pt-10">
        <BigButton small onClick={signOut}>
          나가기
        </BigButton>
        <Link href="/dashboard" className="py-3 text-center text-[22px] font-bold text-[#6B7394] underline">
          예전 화면으로
        </Link>
      </section>
    </V2Shell>
  );
}
