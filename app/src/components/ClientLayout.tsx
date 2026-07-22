"use client";

import { ReactNode } from "react";
import HamburgerMenu from "@/components/HamburgerMenu";
import BackButton from "@/components/BackButton";
import DesktopSidebar from "@/components/DesktopSidebar";
import DesktopHeader from "@/components/DesktopHeader";

export default function ClientLayout({ children }: { children: ReactNode }) {
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
