"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const menuItems = [
  { href: "/dashboard", label: "홈", icon: "🏠", desc: "대시보드" },
  { href: "/stores", label: "가맹점", icon: "🏪", desc: "결제 & 120% 적립" },
  { href: "/card", label: "비선형카드", icon: "💳", desc: "카드 잔액 & 결제" },
  { href: "/history", label: "내역", icon: "📋", desc: "포인트 기록" },
  { href: "/simulation", label: "시뮬레이션", icon: "🎮", desc: "다랜드 마을 체험" },
  { href: "/engine", label: "엔진 설명", icon: "⚙️", desc: "비선형공식 원리" },
  { href: "/advertiser", label: "광고주", icon: "🏢", desc: "광고주 120% 수익" },
  { href: "/philosophy", label: "자리이타", icon: "🙏", desc: "다랜드 핵심 철학" },
];

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <>
      {/* 햄버거 버튼 */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 flex-col items-center justify-center gap-1 rounded-xl shadow-lg transition-transform active:scale-90"
        style={{ background: "var(--header-bg)", border: "1px solid var(--card-border)" }}
      >
        <span className="block h-0.5 w-5 rounded-full bg-purple-400 transition-all" />
        <span className="block h-0.5 w-5 rounded-full bg-purple-400 transition-all" />
        <span className="block h-0.5 w-5 rounded-full bg-purple-400 transition-all" />
      </button>

      {/* 오버레이 */}
      {open && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      )}

      {/* 사이드 메뉴 */}
      <div
        className="fixed left-0 top-0 z-[101] h-full w-72 transition-transform duration-300"
        style={{
          background: "var(--background)",
          borderRight: "1px solid var(--card-border)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        {/* 로고 영역 */}
        <div className="border-b px-6 py-6" style={{ borderColor: "var(--card-border)" }}>
          <div className="bg-gradient-to-r from-cyan-400 via-purple-500 to-rose-400 bg-clip-text text-2xl font-black text-transparent">
            다랜드
          </div>
          <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            쓸수록 쌓이는 120%
          </div>
        </div>

        {/* 유저 정보 */}
        <div className="border-b px-6 py-4" style={{ borderColor: "var(--card-border)" }}>
          <div className="text-sm font-bold">{user.displayName || "사용자"}님</div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>{user.email}</div>
        </div>

        {/* 메뉴 리스트 */}
        <nav className="flex flex-col gap-1 p-3">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all"
              style={{
                background: pathname === item.href ? "var(--card-border)" : "transparent",
              }}
            >
              <span className="text-xl">{item.icon}</span>
              <div>
                <div className="text-sm font-bold">{item.label}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>{item.desc}</div>
              </div>
              {pathname === item.href && (
                <div className="ml-auto h-2 w-2 rounded-full bg-purple-500" />
              )}
            </Link>
          ))}
        </nav>

        {/* 로그아웃 */}
        <div className="absolute bottom-6 left-0 right-0 px-3">
          <button
            onClick={() => { signOut(); setOpen(false); }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors hover:bg-rose-500/10"
            style={{ color: "var(--text-muted)" }}
          >
            <span className="text-xl">👋</span>
            <span>로그아웃</span>
          </button>
        </div>
      </div>
    </>
  );
}
