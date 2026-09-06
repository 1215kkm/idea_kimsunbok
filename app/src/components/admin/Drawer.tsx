"use client";

import { useEffect, type ReactNode } from "react";
import AdminIcon from "./AdminIcon";

interface DrawerProps {
  open: boolean;
  title: ReactNode;
  badge?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}

/** 우측 슬라이드 드로어 — 스크림 클릭·Esc 로 닫힘. */
export default function Drawer({ open, title, badge, onClose, footer, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div className={`ad-drawer-scrim ${open ? "show" : ""}`.trim()} onClick={onClose} />
      <aside className={`ad-drawer ${open ? "open" : ""}`.trim()} aria-hidden={!open} aria-label="상세">
        <div className="ad-d-head">
          <h3>{title}</h3>
          {badge}
          <button type="button" className="ad-btn-icon" onClick={onClose} aria-label="닫기">
            <AdminIcon name="x" />
          </button>
        </div>
        <div className="ad-d-body">{children}</div>
        {footer && <div className="ad-d-foot">{footer}</div>}
      </aside>
    </>
  );
}
