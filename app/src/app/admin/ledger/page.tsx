"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage, getTotals } from "@/lib/admin-data";
import type { LedgerTotals } from "@/lib/admin-types";
import { fmt, fmtDateTime, fmtP, fmtSigned } from "@/lib/admin-format";
import PageHeader from "@/components/admin/PageHeader";
import KpiCard from "@/components/admin/KpiCard";
import DataTable, { type Column } from "@/components/admin/DataTable";
import StatusBadge from "@/components/admin/StatusBadge";
import AdminIcon from "@/components/admin/AdminIcon";
import { useToast } from "@/components/admin/Toast";

interface Term {
  key: string;
  label: string;
  value: number;
  src: string;
  op: "+" | "−";
  tone?: "beta" | "zero" | "warn";
}

/**
 * 총량 검산 (P0-5): 정합식 스트립 + 좌·우변 비교 + warnings.
 * 일자별 스냅샷 저장은 P1-9 — 지금은 "스냅샷 생성" = 현재 시점 재집계 1행.
 */
export default function AdminLedgerPage() {
  const toast = useToast();
  const [totals, setTotals] = useState<LedgerTotals | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (announce: "none" | "refresh" | "snapshot" = "none") => {
      setBusy(true);
      setError(null);
      try {
        const t = await getTotals();
        setTotals(t);
        if (announce === "refresh") toast("최신 데이터로 갱신했습니다");
        if (announce === "snapshot") {
          toast(t.diff === 0 ? "스냅샷을 생성했습니다 — 일치" : `스냅샷을 생성했습니다 — 안 맞음 ${fmtSigned(t.diff)} P`, t.diff !== 0);
        }
      } catch (err) {
        setError(errorMessage(err, "총량 집계 실패"));
        console.error("[admin/ledger]", err);
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    load();
  }, [load]);

  const b = totals?.byType || {};
  const g = (k: string) => b[k] || { count: 0, amount: 0, totalDelta: 0, lockedDelta: 0 };
  const deposit = g("deposit").totalDelta;
  const withdrawnNet = -(g("withdrawal_request").totalDelta + g("withdrawal_refund").totalDelta);
  const spendBonus = g("spend_bonus").totalDelta;
  const spendPrincipal = -g("spend_principal").totalDelta;
  const spendCard = g("spend_card").totalDelta;
  const untyped = g("untyped_legacy").totalDelta;
  const rewardNet = totals?.rewardNet || 0;
  const beta = totals?.betaAdjustment || 0;
  const betaFunds = totals?.right.betaInitialFunds || 0;
  const unknown = Object.entries(b).filter(([k]) => k.startsWith("unknown:"));
  const unknownSum = unknown.reduce((s, [, v]) => s + v.totalDelta + v.lockedDelta, 0);

  const terms: Term[] = [
    { key: "deposit", label: "Σ입금", value: deposit, src: `transactions.deposit · ${g("deposit").count}건`, op: "+" },
    { key: "withdraw", label: "Σ출금 (요청 − 환불)", value: withdrawnNet, src: "withdrawal_request − withdrawal_refund", op: "−" },
    { key: "bonus", label: "Σ120% 적립 (포인트 결제)", value: spendBonus, src: "spend.totalAccumulation", op: "+" },
    { key: "principal", label: "Σ포인트 결제 차감", value: spendPrincipal, src: "spend.amount (포인트 결제분)", op: "−" },
    ...(spendCard !== 0 ? [{ key: "card", label: "카드 실지출 발행", value: spendCard, src: "spend.source=card_codef · 무차감", op: "+", tone: "warn" } as Term] : []),
    { key: "reward", label: "리워드 이전 (제로섬)", value: rewardNet, src: `lock ${fmt(g("reward_lock").amount)} / out ${fmt(g("reward_out").amount)} / in ${fmt(g("reward_in").amount)} / refund ${fmt(g("reward_refund").amount)}`, op: "+", tone: "zero" },
    { key: "beta", label: "베타 조정", value: beta, src: `구 invite_* ${g("beta_adjust_invitee").count + g("beta_adjust_advertiser").count}건 · 무에서 생성`, op: "+", tone: "beta" },
    { key: "betaFunds", label: "베타 초기 지급금", value: betaFunds, src: "users.betaTestFunds (가입 시 지급)", op: "+" },
    ...(untyped !== 0 || g("untyped_legacy").count > 0 ? [{ key: "untyped", label: "type 없는 구 거래", value: untyped, src: `${g("untyped_legacy").count}건 · spend 로 간주`, op: "+", tone: "warn" } as Term] : []),
    ...(unknown.length > 0 ? [{ key: "unknown", label: "집계 규칙 없는 유형", value: unknownSum, src: unknown.map(([k]) => k.slice(8)).join(", "), op: "+", tone: "warn" } as Term] : []),
  ];

  const mismatch = totals ? totals.diff !== 0 : false;
  const warnCount = totals?.warnings.length || 0;

  type SnapRow = { at: number; left: number; right: number; diff: number; beta: number; warnings: number };
  const snapRows: SnapRow[] = totals ? [{ at: totals.generatedAt, left: totals.left.sum, right: totals.right.sum, diff: totals.diff, beta, warnings: warnCount }] : [];
  const snapColumns: Column<SnapRow>[] = [
    { key: "at", header: "일자", render: (r) => <span className="ad-num">{fmtDateTime(r.at)}</span> },
    { key: "left", header: "좌변 Σ잔액 + Σ잠김", align: "right", render: (r) => <span className="ad-num">{fmt(r.left)}</span> },
    { key: "right", header: "우변 원장 항목 합", align: "right", render: (r) => <span className="ad-num">{fmt(r.right)}</span> },
    { key: "diff", header: "차이", align: "right", render: (r) => <span className={`ad-num ${r.diff !== 0 ? "ad-num-diff" : ""}`}>{fmtSigned(r.diff)}</span> },
    { key: "beta", header: "베타 조정", align: "right", render: (r) => <span className="ad-num">{fmt(r.beta)}</span> },
    { key: "status", header: "상태", render: (r) => <StatusBadge tone={r.warnings > 0 ? "mismatch" : "ok"} label={r.warnings > 0 ? `안 맞음 ${r.warnings}건` : "일치"} /> },
  ];

  return (
    <>
      <PageHeader title="총량 검산" sub="회원 잔액 합계(잠김 포함)가 원장 항목의 합과 같은지 확인합니다 · 1P = 1원" onRefresh={() => load("refresh")} refreshing={busy}>
        <button type="button" className={`ad-btn ad-btn-primary ${busy ? "loading" : ""}`} onClick={() => load("snapshot")} disabled={busy}>
          <AdminIcon name="camera" />
          스냅샷 생성
        </button>
      </PageHeader>

      {error && (
        <div className="ad-callout error" style={{ marginTop: 0, marginBottom: "var(--ad-sp-lg)" }}>
          <AdminIcon name="alert" />
          <div>{error}</div>
        </div>
      )}

      <div className="ad-kpis">
        <KpiCard icon="wallet" tone="primary" label="Σ회원 잔액 (좌변)" value={totals ? totals.left.sum : null} unit="P" delta={totals ? `totalPoints ${fmt(totals.left.totalPoints)} + 잠김 ${fmt(totals.left.lockedPoints)} · ${fmt(totals.left.userCount)}명` : undefined} />
        <KpiCard icon="deposit" tone="info" label="Σ입금 − Σ출금" value={totals ? deposit - withdrawnNet : null} unit="P" delta={totals ? `${fmt(deposit)} − ${fmt(withdrawnNet)}` : undefined} />
        <KpiCard icon="coins" tone="success" label="Σ120% 증액 발행" value={totals ? spendBonus - spendPrincipal + spendCard : null} unit="P" delta="포인트 결제 증액분 + 카드 실지출 발행" />
        <KpiCard icon="alert" tone={warnCount > 0 ? "error" : "success"} label="안 맞음" value={totals ? warnCount : null} unit="건" delta={totals ? (warnCount > 0 ? "아래 경고 목록 확인" : "경고 없음") : undefined} deltaTone={warnCount > 0 ? "err" : "up"} />
      </div>

      <div className="ad-card" style={{ marginBottom: "var(--ad-sp-lg)" }}>
        <div className="ad-card-head">
          <div className="ad-tile"><AdminIcon name="scale" /></div>
          <h2>정합식 — {totals ? `${fmtDateTime(totals.generatedAt)} 집계` : "집계 중"}</h2>
          {totals && <StatusBadge tone={mismatch ? "mismatch" : "ok"} label={mismatch ? `안 맞음 ${fmtSigned(totals.diff)} P` : "일치"} large />}
        </div>

        {totals ? (
          <>
            <div className="ad-formula">
              <div className="ad-term lhs">
                <div className="ad-label">Σ회원 잔액 + Σ잠김</div>
                <div className="ad-value ad-num">{fmtP(totals.left.sum)}</div>
                <div className="ad-src">users.totalPoints + users.lockedPoints</div>
              </div>
              <div className="ad-op">=</div>
              {terms.map((t, i) => (
                <div key={t.key} style={{ display: "contents" }}>
                  {i > 0 && <div className="ad-op">{t.op}</div>}
                  <div className={`ad-term ${t.tone || ""}`.trim()}>
                    <div className="ad-label">{t.label}</div>
                    <div className="ad-value ad-num">{fmtP(t.op === "−" ? t.value : t.value)}</div>
                    <div className="ad-src">{t.src}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="ad-compare" style={{ marginTop: "var(--ad-sp-lg)" }}>
              <div className="ad-side">
                <div className="ad-muted">좌변 · Σ회원 잔액 + Σ잠김</div>
                <div className="ad-value ad-num primary">{fmtP(totals.left.sum)}</div>
                <div className="ad-muted">회원 {fmt(totals.left.userCount)}명 · 거래 {fmt(totals.transactionCount)}건</div>
              </div>
              <div className={`ad-diff ${mismatch ? "" : "ok"}`.trim()}>
                <div className="ad-muted">차이 (좌변 − 우변)</div>
                <div className="ad-value ad-num">{fmtSigned(totals.diff)} P</div>
                <div style={{ fontWeight: 600 }}>{mismatch ? (totals.diff === beta ? "= 베타 조정 전액" : "원인 미확인") : "무에서 생성 없음"}</div>
              </div>
              <div className="ad-side">
                <div className="ad-muted">우변 · 원장 항목 합</div>
                <div className="ad-value ad-num">{fmtP(totals.right.sum)}</div>
                <div className="ad-muted">거래 Δ {fmtSigned(totals.right.transactionsTotalDelta + totals.right.transactionsLockedDelta)} + 베타 초기 {fmt(betaFunds)}</div>
              </div>
            </div>

            {totals.warnings.length > 0 ? (
              <div className="ad-warnings">
                {totals.warnings.map((w, i) => (
                  <div key={i} className={`ad-callout ${w.includes("불일치") || w.includes("음수") ? "error" : ""}`.trim()} style={{ marginTop: 0 }}>
                    <AdminIcon name="alert" />
                    <div>{w}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ad-callout ok">
                <AdminIcon name="check" />
                <div>경고 없음 — 좌·우변 일치, 리워드 원장 순변화 0.</div>
              </div>
            )}
          </>
        ) : (
          <div className="ad-stack" style={{ gap: 10 }}>
            <span className="ad-skeleton" />
            <span className="ad-skeleton" style={{ width: "85%" }} />
            <span className="ad-skeleton" style={{ width: "70%" }} />
          </div>
        )}
      </div>

      <div className="ad-card">
        <div className="ad-card-head">
          <div className="ad-tile"><AdminIcon name="clock" /></div>
          <h2>일자별 스냅샷</h2>
        </div>
        <DataTable columns={snapColumns} rows={snapRows} rowKey={(r) => String(r.at)} loading={!totals} rowClassName={(r) => (r.warnings > 0 ? "danger" : "")} minWidth={760} skeletonRows={1} />
        <div className="ad-card-foot">지금은 현재 시점 1행만 표시합니다. 매일 00:00 자동 저장 + 텔레그램 알림은 P1-9. 단위: P (1P = 1원).</div>
      </div>
    </>
  );
}
