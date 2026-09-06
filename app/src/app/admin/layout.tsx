"use client";

import "./admin.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { db, isConfigured } from "@/lib/firebase";
import { ADMIN_MODE, getDashboard } from "@/lib/admin-data";
import AdminIcon, { type AdminIconName } from "@/components/admin/AdminIcon";
import { ToastProvider } from "@/components/admin/Toast";
import { AdminContext, type AdminBadges } from "@/components/admin/AdminContext";

/**
 * AdminShell — 좌측 240px 그라데이션 사이드바 + 9메뉴 + 대기 배지 + 1024px 이하 햄버거 드로어.
 * 관리자 권한 검사(role === "admin")는 여기서 한 번만. 하위 페이지는 AdminContext 만 쓴다.
 */

interface MenuItem {
  href: string;
  label: string;
  icon: AdminIconName;
  badge?: keyof AdminBadges;
}

const MENU: MenuItem[] = [
  { href: "/admin", label: "대시보드", icon: "dashboard" },
  { href: "/admin/members", label: "회원", icon: "users" },
  { href: "/admin/deposits", label: "입금", icon: "deposit" },
  { href: "/admin/spend", label: "지출", icon: "receipt" },
  { href: "/admin/withdrawals", label: "출금", icon: "withdraw", badge: "pendingWithdrawals" },
  { href: "/admin/reward", label: "리워드광고", icon: "megaphone", badge: "pendingCampaigns" },
  { href: "/admin/ledger", label: "총량 검산", icon: "scale" },
  { href: "/admin/notices", label: "공지", icon: "notice" },
  { href: "/admin/settings", label: "설정", icon: "settings" },
];

type CheckState = "checking" | "ok" | "denied";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [check, setCheck] = useState<CheckState>("checking");
  const [sideOpen, setSideOpen] = useState(false);
  const [badges, setBadges] = useState<AdminBadges>({ pendingCampaigns: 0, pendingWithdrawals: 0 });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/");
      return;
    }
    if (!isConfigured) {
      // 데모 모드: 로그인한 체험 사용자는 누구나 관리자 화면을 볼 수 있다 (localStorage 데이터만)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCheck("ok");
      return;
    }
    if (!db) {
      setCheck("denied");
      return;
    }
    let cancelled = false;
    getDoc(doc(db, "users", user.uid))
      .then((snap) => {
        if (cancelled) return;
        setCheck(snap.exists() && snap.data().role === "admin" ? "ok" : "denied");
      })
      .catch((err) => {
        console.error("[admin] role check failed", err);
        if (!cancelled) setCheck("denied");
      });
    return () => {
      cancelled = true;
    };
  }, [user, loading, router]);

  const refreshBadges = useCallback(() => {
    if (check !== "ok") return;
    getDashboard()
      .then((d) => setBadges({ pendingCampaigns: d.pendingCampaigns, pendingWithdrawals: d.pendingWithdrawals }))
      .catch((err) => console.error("[admin] badge refresh failed", err));
  }, [check]);

  useEffect(() => {
    refreshBadges();
  }, [refreshBadges]);

  // 경로 바뀌면 모바일 드로어 닫기
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSideOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sideOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSideOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sideOpen]);

  if (loading || check === "checking") {
    return (
      <div className="ad-root">
        <div className="ad-fullscreen" style={{ width: "100%" }}>
          <div className="ad-muted">관리자 권한 확인 중...</div>
        </div>
      </div>
    );
  }
  if (check === "denied") {
    return (
      <div className="ad-root">
        <div className="ad-fullscreen" style={{ width: "100%" }}>
          <div className="ad-card">
            <div className="ad-placeholder" style={{ minHeight: 0 }}>
              <div>
                <div className="ad-tile" style={{ background: "var(--ad-error-light)", color: "var(--danger)" }}>
                  <AdminIcon name="shield-off" />
                </div>
                <div style={{ fontWeight: 700, color: "var(--danger)", marginBottom: 12 }}>관리자 권한이 없습니다.</div>
                <Link href="/dashboard" className="ad-btn ad-btn-primary">
                  대시보드로 이동
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const adminName = user?.displayName || user?.email || "관리자";
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  return (
    <AdminContext.Provider value={{ mode: ADMIN_MODE, adminName, badges, refreshBadges }}>
      <ToastProvider>
        <div className="ad-root">
          <aside className={`ad-sidebar ${sideOpen ? "open" : ""}`.trim()} aria-label="관리자 메뉴">
            <div className="ad-brand">
              <div className="ad-mark">D</div>
              <div className="ad-name">다랜드</div>
              <div className="ad-role">관리자{ADMIN_MODE === "demo" ? " · 데모" : ""}</div>
            </div>
            <nav className="ad-nav">
              {MENU.map((m) => {
                const count = m.badge ? badges[m.badge] : 0;
                return (
                  <Link key={m.href} href={m.href} className={isActive(m.href) ? "active" : undefined}>
                    <AdminIcon name={m.icon} />
                    {m.label}
                    {count > 0 && <span className="ad-cnt">{count}</span>}
                  </Link>
                );
              })}
            </nav>
            <div className="ad-foot">
              <Link href="/dashboard">
                <AdminIcon name="home" />
                사용자 앱으로
              </Link>
              <button type="button" onClick={() => signOut()}>
                <AdminIcon name="logout" />
                로그아웃
              </button>
              <div className="ad-ver">DaLand Admin · P0</div>
            </div>
          </aside>
          <div className={`ad-scrim ${sideOpen ? "show" : ""}`.trim()} onClick={() => setSideOpen(false)} />
          <main className="ad-main">
            {ADMIN_MODE === "demo" && (
              <div className="ad-callout info" style={{ marginTop: 0, marginBottom: "var(--ad-sp-lg)" }}>
                <AdminIcon name="alert" />
                <div>
                  <b>데모 모드</b> — Firebase 미연결. 이 브라우저의 localStorage 데이터(시드 캠페인 2건 · 데모 광고주 지출 2건)만 보입니다. 승인·거절·종료는 로컬에서만 반영됩니다.
                </div>
              </div>
            )}
            <AdminHamburger onOpen={() => setSideOpen(true)} />
            {children}
          </main>
        </div>
      </ToastProvider>
    </AdminContext.Provider>
  );
}

/** 페이지 헤더가 자기 자리에 넣는 햄버거 (1024px 이하만 보임). 헤더가 없는 페이지를 위해 레이아웃에도 하나 둔다. */
function AdminHamburger({ onOpen }: { onOpen: () => void }) {
  return (
    <button type="button" className="ad-btn-icon ad-hamburger" style={{ marginBottom: "var(--ad-sp-md)" }} onClick={onOpen} aria-label="메뉴 열기">
      <AdminIcon name="menu" />
    </button>
  );
}
