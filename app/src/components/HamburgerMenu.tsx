"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Icon from "@/components/Icon";
import { NAV_ITEMS } from "@/lib/nav-items";
import { db, isConfigured } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const menuItems = NAV_ITEMS;

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user || !isConfigured || !db) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    getDoc(doc(db, "users", user.uid))
      .then((snap) => {
        if (cancelled) return;
        if (snap.exists() && snap.data().role === "admin") setIsAdmin(true);
        else setIsAdmin(false);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  const visibleItems = menuItems.filter((m) => !m.admin || isAdmin);

  return (
    <>
      {/* 햄버거 버튼 (우측) */}
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 top-4 z-50 flex h-10 w-10 flex-col items-center justify-center gap-1 rounded-xl shadow-lg transition-transform active:scale-90"
        style={{ background: "var(--header-bg)", border: "1px solid var(--card-border)" }}
        aria-label="메뉴 열기"
      >
        <span className="block h-0.5 w-5 rounded-full bg-[#3B4CCA] transition-all" />
        <span className="block h-0.5 w-5 rounded-full bg-[#3B4CCA] transition-all" />
        <span className="block h-0.5 w-5 rounded-full bg-[#3B4CCA] transition-all" />
      </button>

      {/* 오버레이 */}
      {open && (
        <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
      )}

      {/* 사이드 메뉴 (우측에서 슬라이드) */}
      <div
        className="fixed right-0 top-0 z-[101] flex h-full w-72 flex-col transition-transform duration-300"
        style={{
          background: "var(--background)",
          borderLeft: "1px solid var(--card-border)",
          transform: open ? "translateX(0)" : "translateX(100%)",
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
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all"
                style={{
                  background: pathname === item.href ? "var(--primary-bg, rgba(59, 76, 202, 0.08))" : "transparent",
                }}
              >
                <Icon
                  name={item.icon}
                  size={22}
                  className={pathname === item.href ? "text-[#3B4CCA]" : "text-[#6B7394]"}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold">{item.label}</span>
                    {item.badge && (
                      <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                        {item.badge}
                      </span>
                    )}
                  </div>
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
            <Icon name="logout" size={22} />
            <span>로그아웃</span>
          </button>
        </div>
      </div>
    </>
  );
}
