"use client";

import AdminIcon, { type AdminIconName } from "./AdminIcon";

export type KpiTone = "primary" | "warning" | "success" | "info" | "error";

interface KpiCardProps {
  icon: AdminIconName;
  tone?: KpiTone;
  label: string;
  value: number | string | null; // null = 로딩 스켈레톤
  unit?: string;
  delta?: string;
  deltaTone?: "up" | "warn" | "err" | "muted";
  onClick?: () => void;
}

export default function KpiCard({ icon, tone = "primary", label, value, unit, delta, deltaTone = "muted", onClick }: KpiCardProps) {
  const inner = (
    <>
      <div className={`ad-tile ${tone}`}>
        <AdminIcon name={icon} />
      </div>
      <div className="ad-label">{label}</div>
      <div className="ad-value ad-num">
        {value === null ? (
          <span className="ad-skeleton" style={{ width: "60%" }} />
        ) : (
          <>
            {typeof value === "number" ? value.toLocaleString("ko-KR") : value}
            {unit && <small>{unit}</small>}
          </>
        )}
      </div>
      {delta && <div className={`ad-delta ${deltaTone === "muted" ? "" : deltaTone}`}>{delta}</div>}
    </>
  );
  if (onClick) {
    return (
      <button type="button" className="ad-card ad-kpi clickable" onClick={onClick}>
        {inner}
      </button>
    );
  }
  return <div className="ad-card ad-kpi">{inner}</div>;
}
