"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const menuItems = [
  { href: "/dashboard", label: "홈", icon: "🏠", desc: "대시보드" },
  { href: "/stores", label: "지출등록", icon: "💳", desc: "신용카드 지출 & 120% 적립" },
  { href: "/withdraw", label: "출금", icon: "🏦", desc: "다랜드 계좌 → 내 은행계좌" },
  { href: "/card", label: "비선형카드", icon: "🪪", desc: "카드 잔액 & 충전데이터" },
  { href: "/history", label: "내역", icon: "📋", desc: "포인트 기록" },
  { href: "/store-dashboard", label: "멤버십 분배", icon: "🔄", desc: "회원간 분배 현황" },
  { href: "/simulation", label: "시뮬레이션", icon: "🎮", desc: "다랜드 체험" },
  { href: "/engine", label: "엔진 설명", icon: "⚙️", desc: "비선형공식 원리" },
  { href: "/advertiser", label: "광고주", icon: "🏢", desc: "광고주 120% 수익" },
  { href: "/philosophy", label: "자리이타", icon: "🙏", desc: "다랜드 핵심 철학" },
  { href: "/admin", label: "관리자", icon: "🛡️", desc: "시스템 관리 패널" },
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
        <span className="block h-0.5 w-5 rounded-full bg-[#3B4CCA] transition-all" />
        <span className="block h-0.5 w-5 rounded-full bg-[#3B4CCA] transition-all" />
        <span className="block h-0.5 w-5 rounded-full bg-[#3B4CCA] transition-all" />
      </button>

      {/* 오버레이 */}
      {open && (
        <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
      )}

      {/* 사이드 메뉴 */}
      <div
        className="fixed left-0 top-0 z-[101] flex h-full w-72 flex-col transition-transform duration-300"
        style={{
          background: "var(--background)",
          borderRight: "1px solid var(--card-border)",
          transform: open ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        {/* 로고 영역 */}
        <div className="border-b px-6 py-6" style={{ borderColor: "var(--card-border)" }}>
          <div className="text-[#3B4CCA] text-2xl font-black">
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

        {/* 메뉴 리스트 (스크롤 가능) */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="flex flex-col gap-1">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all"
                style={{
                  background: pathname === item.href ? "var(--primary-bg, rgba(59, 76, 202, 0.08))" : "transparent",
                }}
              >
                <span className="text-xl">{item.icon}</span>
                <div>
                  <div className="text-sm font-bold">{item.label}</div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>{item.desc}</div>
                </div>
                {pathname === item.href && (
                  <div className="ml-auto h-2 w-2 rounded-full bg-[#3B4CCA]" />
                )}
              </Link>
            ))}
          </div>
        </nav>

        {/* 로그아웃 */}
        <div className="shrink-0 border-t px-3 py-3" style={{ borderColor: "var(--card-border)" }}>
          <button
            onClick={() => { signOut(); setOpen(false); }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors hover:bg-[#EF4444]/8"
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
