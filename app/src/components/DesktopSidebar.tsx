"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Icon from "@/components/Icon";
import { NAV_ITEMS } from "@/lib/nav-items";
import { db, isConfigured } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { getBalance as getDemoBalance } from "@/lib/demo-store";

/**
 * PC(데스크톱) 전용 좌측 사이드바 — lg 이상에서만 표시.
 * 모바일에서는 기존 하단 Navbar + 햄버거 메뉴를 그대로 사용한다.
 */
export default function DesktopSidebar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    if (!isConfigured || !db) {
      setBalance(getDemoBalance(user));
      setIsAdmin(false);
      return;
    }
    getDoc(doc(db, "users", user.uid))
      .then((snap) => {
        if (cancelled || !snap.exists()) return;
        setBalance(snap.data().totalPoints || 0);
        if (snap.data().role === "admin") setIsAdmin(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  const items = NAV_ITEMS.filter((m) => !m.admin || isAdmin);

  return (
    <aside
      className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r lg:flex"
      style={{ background: "var(--card-bg, #fff)", borderColor: "var(--card-border, #E8EAF0)" }}
    >
      {/* 로고 */}
      <Link href="/dashboard" className="flex items-center gap-2 border-b px-5 py-5" style={{ borderColor: "var(--card-border, #E8EAF0)" }}>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3B4CCA] text-lg font-black text-white">D</span>
        <div>
          <div className="text-lg font-black text-[#3B4CCA]">DaLand</div>
          <div className="text-[10px] text-[#6B7394]">다랜드 결제 플랫폼</div>
        </div>
      </Link>

      {/* MY BALANCE */}
      <div className="m-4 rounded-2xl bg-gradient-to-br from-[#3B4CCA] to-[#2D3A8C] p-4 text-white">
        <div className="text-[11px] text-white/70">MY BALANCE · 보유 포인트</div>
        <div className="mt-1 text-2xl font-black">
          {balance === null ? "—" : balance.toLocaleString()}P
        </div>
        <Link
          href="/deposit"
          className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-white/15 py-2 text-xs font-bold text-white transition-colors hover:bg-white/25"
        >
          <Icon name="add_circle" size={16} /> 충전/입금
        </Link>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="flex flex-col gap-0.5">
          {items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all"
                style={{
                  background: active ? "rgba(59, 76, 202, 0.1)" : "transparent",
                }}
              >
                <Icon name={item.icon} size={20} filled={active} className={active ? "text-[#3B4CCA]" : "text-[#6B7394]"} />
                <span className={`text-sm ${active ? "font-bold text-[#3B4CCA]" : "text-[#1A1F36]"}`}>{item.label}</span>
                {item.badge && (
                  <span className="ml-auto rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 리워드 광고 프로모 */}
      <Link href="/advertiser" className="mx-4 mb-2 block rounded-2xl border border-[#FFB800]/40 bg-[#FFB800]/8 p-3">
        <div className="text-xs font-bold text-[#1A1F36]">🎁 다랜드 리워드 광고</div>
        <div className="mt-0.5 text-[11px] text-[#6B7394]">보상받고 혜택 누리세요!</div>
      </Link>

      {/* 로그아웃 */}
      <div className="border-t px-3 py-3" style={{ borderColor: "var(--card-border, #E8EAF0)" }}>
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#6B7394] transition-colors hover:bg-[#EF4444]/8"
        >
          <Icon name="logout" size={20} /> 로그아웃
        </button>
      </div>
    </aside>
  );
}
