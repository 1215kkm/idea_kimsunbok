"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/AdminContext";
import { errorMessage, getSettings, setSplitMode, type SplitMode } from "@/lib/admin-data";
import { fmt, fmtDateTime } from "@/lib/admin-format";
import { ADVERTISER_MIN_DEPOSIT, DEFAULT_DAILY_CAP, MAX_HEADCOUNT, REWARD_UNIT_AMOUNTS } from "@/lib/reward-ledger";
import PageHeader from "@/components/admin/PageHeader";
import AdminIcon from "@/components/admin/AdminIcon";
import { useToast } from "@/components/admin/Toast";

/** 설정 (P0-6 이관): 분배 모드 auto/manual 그대로. 나머지는 코드 상수 표시 (P1-8 에서 편집 가능). */
export default function AdminSettingsPage() {
  const { mode } = useAdmin();
  const toast = useToast();
  const [splitMode, setMode] = useState<SplitMode | null>(null);
  const [limit, setLimit] = useState<number>(1_000_000_000);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const s = await getSettings();
      setMode(s.splitMode);
      setLimit(s.splitAutoLimit);
      setUpdatedAt(s.updatedAt);
    } catch (err) {
      setError(errorMessage(err, "설정 조회 실패"));
      console.error("[admin/settings]", err);
      setMode("auto");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const change = async (next: SplitMode) => {
    if (next === splitMode || busy) return;
    setBusy(true);
    setError(null);
    try {
      await setSplitMode(next);
      setMode(next);
      setUpdatedAt(Date.now());
      toast(`분배 모드 → ${next === "auto" ? "자동" : "수동"}`);
    } catch (err) {
      const msg = errorMessage(err, "분배 모드 변경 실패");
      setError(msg);
      toast(msg, true);
      console.error("[admin/settings] split mode failed", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="설정" sub="분배 모드 · 리워드 상수 · 관리자 접근" />

      {error && (
        <div className="ad-callout error" style={{ marginTop: 0, marginBottom: "var(--ad-sp-lg)" }}>
          <AdminIcon name="alert" />
          <div>{error}</div>
        </div>
      )}

      <div className="ad-grid-2-1">
        <div className="ad-card">
          <div className="ad-card-head">
            <div className="ad-tile"><AdminIcon name="settings" /></div>
            <h2>분배 모드</h2>
          </div>
          <p className="ad-muted" style={{ marginTop: 0 }}>
            소비자단계 <b style={{ color: "var(--foreground)" }}>{fmt(limit)}P 까지 자동</b> 분할 처리 · 초과 대량 거래는 수동 모드에서 관리자가 직접 관리 (의뢰자 확정)
          </p>
          <div className="ad-toggle-grid">
            <button type="button" className={`ad-toggle ${splitMode === "auto" ? "on-success" : ""}`.trim()} disabled={busy || splitMode === null} onClick={() => change("auto")}>
              자동 모드{splitMode === "auto" ? " (활성)" : ""}
            </button>
            <button type="button" className={`ad-toggle ${splitMode === "manual" ? "on-warning" : ""}`.trim()} disabled={busy || splitMode === null} onClick={() => change("manual")}>
              수동 모드{splitMode === "manual" ? " (활성)" : ""}
            </button>
          </div>
          <div className="ad-card-foot">
            {splitMode === null ? "불러오는 중..." : `마지막 변경 ${updatedAt ? fmtDateTime(updatedAt) : "—"}`}
            {mode === "demo" && " · 데모 모드: 이 브라우저에만 저장"}
          </div>
        </div>

        <div className="ad-card">
          <div className="ad-card-head">
            <div className="ad-tile"><AdminIcon name="shield" /></div>
            <h2>시스템 상태</h2>
          </div>
          <div className="ad-kv"><span className="k">Firebase 연동</span><span className="v" style={{ color: mode === "live" ? "var(--success)" : "var(--ad-warning)" }}>{mode === "live" ? "연결됨" : "데모 (미연결)"}</span></div>
          <div className="ad-kv"><span className="k">비선형공식 엔진</span><span className="v" style={{ color: "var(--success)" }}>정상</span></div>
          <div className="ad-kv"><span className="k">출금 승인 플로우</span><span className="v" style={{ color: "var(--success)" }}>활성</span></div>
          <div className="ad-kv"><span className="k">리워드 원장 (에스크로)</span><span className="v" style={{ color: "var(--success)" }}>제로섬 · 감사 로그 기록</span></div>
        </div>
      </div>

      <div className="ad-card">
        <div className="ad-card-head">
          <div className="ad-tile"><AdminIcon name="megaphone" /></div>
          <h2>리워드광고 상수 <span className="ad-muted" style={{ fontWeight: 400 }}>(코드 고정 · 편집은 P1-8)</span></h2>
        </div>
        <div className="ad-kv"><span className="k">광고주 자격 하한 (확인된 입금 누적)</span><span className="v ad-num">{fmt(ADVERTISER_MIN_DEPOSIT)} P</span></div>
        <div className="ad-kv"><span className="k">1인 리워드 프리셋</span><span className="v ad-num">{REWARD_UNIT_AMOUNTS.map((n) => fmt(n)).join(" / ")} P</span></div>
        <div className="ad-kv"><span className="k">캠페인 모집 인원 범위</span><span className="v ad-num">1 ~ {fmt(MAX_HEADCOUNT)}명</span></div>
        <div className="ad-kv"><span className="k">캠페인당 일일 지급 상한 기본값</span><span className="v ad-num">{DEFAULT_DAILY_CAP}명/일 (캠페인별 변경은 리워드광고 드로어)</span></div>
        <div className="ad-kv"><span className="k">지급 조건 (P0)</span><span className="v">가입 + 이메일 인증 + 1인 1회 (uid · 구 초대 · 이메일 해시)</span></div>
        <div className="ad-kv"><span className="k">관리자 이메일 allowlist</span><span className="v">서버 환경변수 ADMIN_EMAIL_ALLOWLIST (가입 시 role 부여)</span></div>
      </div>
    </>
  );
}
