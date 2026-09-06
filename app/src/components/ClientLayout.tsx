"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import HamburgerMenu from "@/components/HamburgerMenu";
import BackButton from "@/components/BackButton";
import DesktopSidebar from "@/components/DesktopSidebar";
import DesktopHeader from "@/components/DesktopHeader";

export default function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // 관리자(/admin/*)는 자체 셸(app/admin/layout.tsx)을 쓴다 — 사용자 사이드바·헤더·햄버거 없음
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return <>{children}</>;
  }

  return (
    <>
      {/* PC: 좌측 고정 사이드바 (lg 이상) */}
      <DesktopSidebar />

      {/* 모바일 전용 상단 버튼 (PC에서는 숨김) */}
      <div className="lg:hidden">
        <BackButton />
        <HamburgerMenu />
      </div>

      {/* 본문: PC에서는 사이드바 폭(w-64)만큼 우측으로 이동 + 상단 헤더 */}
      <div className="lg:pl-64">
        <DesktopHeader />
        {children}
      </div>
    </>
  );
}
