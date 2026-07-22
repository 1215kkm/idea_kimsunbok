"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Icon from "@/components/Icon";

/**
 * PC(데스크톱) 전용 상단 헤더 — lg 이상에서만 표시.
 * 좌측 빠른 링크 + 우측 알림/사용자/로그아웃. 모바일에는 렌더되지 않는다.
 */
const QUICK_LINKS = [
  { href: "/dashboard", label: "홈" },
  { href: "/stores", label: "지출등록" },
  { href: "/engine", label: "이용안내" },
  { href: "/advertiser", label: "광고주" },
];

export default function DesktopHeader() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  return (
    <header
      className="sticky top-0 z-30 hidden h-14 items-center justify-between border-b px-6 backdrop-blur-md lg:flex"
      style={{ background: "var(--card-bg, rgba(255,255,255,0.9))", borderColor: "var(--card-border, #E8EAF0)" }}
    >
      <nav className="flex items-center gap-1">
        {QUICK_LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                active ? "font-bold text-[#3B4CCA]" : "text-[#6B7394] hover:text-[#3B4CCA]"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3">
        <Link
          href="/history"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#6B7394] transition-colors hover:bg-[#3B4CCA]/8 hover:text-[#3B4CCA]"
          aria-label="내역"
        >
          <Icon name="notifications" size={20} />
        </Link>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3B4CCA]/10 text-[#3B4CCA]">
            <Icon name="person" size={18} filled />
          </span>
          <span className="text-sm font-bold text-[#1A1F36]">{user.displayName || "회원"}님</span>
        </div>
        <button
          onClick={() => signOut()}
          className="rounded-lg border border-[#E8EAF0] px-3 py-1.5 text-xs font-bold text-[#6B7394] transition-colors hover:bg-[#F7F8FC]"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
