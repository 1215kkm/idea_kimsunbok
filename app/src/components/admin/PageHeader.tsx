"use client";

import type { ReactNode } from "react";
import AdminIcon from "./AdminIcon";
import { useAdmin } from "./AdminContext";

interface PageHeaderProps {
  title: ReactNode;
  sub?: ReactNode;
  search?: { value: string; onChange: (v: string) => void; placeholder: string };
  onRefresh?: () => void;
  refreshing?: boolean;
  children?: ReactNode; // 추가 툴 버튼
}

export default function PageHeader({ title, sub, search, onRefresh, refreshing = false, children }: PageHeaderProps) {
  const { openSidebar } = useAdmin();
  return (
    <header className="ad-topbar">
      <div className="ad-title">
        {/* ≤1024px 에서만 보임 (.ad-hamburger) — 목업처럼 h1 왼쪽 인라인 */}
        <button type="button" className="ad-btn-icon ad-hamburger" onClick={openSidebar} aria-label="메뉴 열기">
          <AdminIcon name="menu" />
        </button>
        <div>
          <h1>{title}</h1>
          {sub && <div className="ad-sub">{sub}</div>}
        </div>
      </div>
      <div className="ad-tools">
        {search && (
          <div className="ad-search">
            <AdminIcon name="search" />
            <input
              type="search"
              value={search.value}
              placeholder={search.placeholder}
              aria-label="검색"
              onChange={(e) => search.onChange(e.target.value)}
            />
          </div>
        )}
        {children}
        {onRefresh && (
          <button
            type="button"
            className={`ad-btn-icon ${refreshing ? "spin" : ""}`.trim()}
            onClick={onRefresh}
            aria-label="새로고침"
            disabled={refreshing}
          >
            <AdminIcon name="refresh" />
          </button>
        )}
      </div>
    </header>
  );
}
