"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/AdminContext";
import { errorMessage, getDashboard, getTotals } from "@/lib/admin-data";
import { ACTIVITY_META, type ActivityItem, type AdminDashboard, type LedgerTotals } from "@/lib/admin-types";
import { fmt, fmtElapsed, fmtP, fmtShort, fmtSigned, maskEmail } from "@/lib/admin-format";
import PageHeader from "@/components/admin/PageHeader";
import KpiCard from "@/components/admin/KpiCard";
import DataTable, { type Column } from "@/components/admin/DataTable";
import StatusBadge from "@/components/admin/StatusBadge";
import AdminIcon from "@/components/admin/AdminIcon";
import { useToast } from "@/components/admin/Toast";

/** 대시보드 (P0-5): KPI 4 · 총량 검산 2×2 + 정합 상태 · 채널 바차트 자리(P1) · 최근 활동 20건 */
export default function AdminDashboardPage() {
  const { adminName, refreshBadges } = useAdmin();
  const router = useRouter();
  const toast = useToast();
  const [dash, setDash] = useState<AdminDashboard | null>(null);
  const [totals, setTotals] = useState<LedgerTotals | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      setRefreshing(true);
      setError(null);
      try {
        const [d, t] = await Promise.all([getDashboard(), getTotals()]);
        setDash(d);
        setTotals(t);
        refreshBadges();
        if (!silent) toast("최신 데이터로 갱신했습니다");
      } catch (err) {
        const msg = errorMessage(err, "대시보드 조회 실패");
        setError(msg);
        console.error("[admin/dashboard]", err);
      } finally {
        setRefreshing(false);
      }
    },
    [refreshBadges, toast],
  );

  useEffect(() => {
    load(true);
  }, [load]);

  const now = new Date();
  const b = totals?.byType || {};
  const deposit = b.deposit?.amount || 0;
  const withdrawn = (b.withdrawal_request?.amount || 0) - (b.withdrawal_refund?.amount || 0);
  const bonusIssued = (b.spend_bonus?.totalDelta || 0) - (b.spend_principal?.amount || 0) + (b.spend_card?.totalDelta || 0);
  const rewardMoved = b.reward_in?.amount || 0;
  const mismatch = totals ? totals.diff !== 0 : false;
  const warnCount = totals?.warnings.length || 0;
  const diffRatio = totals && totals.left.sum !== 0 ? Math.abs(totals.diff) / Math.abs(totals.left.sum) : 0;

  const columns: Column<ActivityItem>[] = [
    { key: "at", header: "시각", render: (r) => <span className="ad-num">{fmtShort(r.at)}</span> },
    {
      key: "user",
      header: "회원",
      render: (r) => (
        <>
          <strong>{r.userName || maskEmail(r.userEmail) || r.userId.slice(0, 8)}</strong>
          {r.userName && r.userEmail && <span className="ad-sub">{maskEmail(r.userEmail)}</span>}
          {r.campaignId && <span className="ad-sub">캠페인 {r.campaignId}</span>}
          {r.categoryName && <span className="ad-sub">{r.categoryName}{r.source === "card_codef" ? " · 카드" : ""}</span>}
        </>
      ),
    },
    {
      key: "type",
      header: "유형",
      render: (r) => {
        const meta = ACTIVITY_META[r.type];
        if (!meta) return <span className="ad-chip gray">{r.type || "구 거래 (type 없음)"}</span>;
        return <span className={`ad-chip ${meta.chip}`}>{meta.label}</span>;
      },
    },
    {
      key: "amount",
      header: "금액",
      align: "right",
      render: (r) => {
        if (r.type === "spend") return <span className="ad-num">{fmt(r.amount)} → {fmt(r.totalAccumulation)} P</span>;
        if (r.type === "reward_lock") return <span className="ad-num">{fmt(r.amount)} P 잠금</span>;
        if (r.type === "reward_out") return <span className="ad-num">{fmt(r.amount)} P 이전</span>;
        return <span className="ad-num">{fmtSigned(r.totalAccumulation || r.amount)} P</span>;
      },
    },
    {
      key: "status",
      header: "상태",
      render: (r) =>
        r.type === "reward_lock" ? (
          <StatusBadge tone="pending" label="승인 대기" />
        ) : r.type === "withdrawal_request" ? (
          <StatusBadge tone="pending" label="요청" />
        ) : (
          <StatusBadge tone="ok" label="완료" />
        ),
    },
    {
      key: "open",
      header: "",
      align: "right",
      render: (r) => {
        const meta = ACTIVITY_META[r.type];
        const href = meta?.href || "/admin/ledger";
        return (
          <div className="ad-row-actions">
            <Link href={href} className="ad-btn ad-btn-outline ad-btn-sm" onClick={(e) => e.stopPropagation()}>
              열기
              <AdminIcon name="chevron" small />
            </Link>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title={`안녕하세요, ${adminName} 님`}
        sub={`다랜드 관리자 — ${now.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" })} ${now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })} 기준 · 1P = 1원`}
        onRefresh={() => load()}
        refreshing={refreshing}
      />

      {error && (
        <div className="ad-callout error" style={{ marginTop: 0, marginBottom: "var(--ad-sp-lg)" }}>
          <AdminIcon name="alert" />
          <div>{error}</div>
        </div>
      )}

      <div className="ad-kpis">
        <KpiCard
          icon="user-plus"
          tone="primary"
          label="오늘 가입"
          value={dash ? dash.todaySignups : null}
          unit="명"
          delta="한국 시간 00:00 이후"
          onClick={() => router.push("/admin/members")}
        />
        <KpiCard
          icon="clock"
          tone="warning"
          label="승인 대기 캠페인"
          value={dash ? dash.pendingCampaigns : null}
          unit="건"
          delta={dash?.oldestPendingAt ? `가장 오래된 건 ${fmtElapsed(dash.oldestPendingAt)}` : "대기 건 없음"}
          deltaTone={dash?.pendingCampaigns ? "warn" : "muted"}
          onClick={() => router.push("/admin/reward?status=pending_review")}
        />
        <KpiCard
          icon="transfer"
          tone="success"
          label="오늘 리워드 지급"
          value={dash ? dash.todayRewardPaid : null}
          unit="P"
          delta={dash ? `광고주 예산 → 회원 이전 · ${dash.todayRewardCount}건` : undefined}
          onClick={() => router.push("/admin/reward")}
        />
        <KpiCard
          icon="withdraw"
          tone="info"
          label="출금 대기"
          value={dash ? dash.pendingWithdrawals : null}
          unit="건"
          delta={dash ? `합계 ${fmtP(dash.pendingWithdrawalAmount)}` : undefined}
          onClick={() => router.push("/admin/withdrawals?status=pending")}
        />
      </div>

      <div className="ad-grid-2-1">
        <div className="ad-card">
          <div className="ad-card-head">
            <div className="ad-tile">
              <AdminIcon name="scale" />
            </div>
            <h2>총량 검산</h2>
            <div className="ad-actions">
              <Link href="/admin/ledger" className="ad-btn ad-btn-outline ad-btn-sm">
                상세 보기
                <AdminIcon name="chevron" small />
              </Link>
            </div>
          </div>
          <div className="ad-stat-grid">
            <Stat label="입금 총량 (Σ입금)" value={totals ? fmtP(deposit) : null} note="transactions.deposit · 100% 반영" primary />
            <Stat label="출금 총량 (Σ출금 − 환불)" value={totals ? fmtP(withdrawn) : null} note="withdrawal_request − withdrawal_refund" />
            <Stat label="120% 증액 발행 (Σ증액)" value={totals ? fmtP(bonusIssued) : null} note="포인트 결제 증액분 + 카드 실지출 발행" />
            <Stat label="리워드 이전 (누적)" value={totals ? fmtP(rewardMoved) : null} note="광고주 → 회원 이동 · 합계 변화 0" />
          </div>
          <div className="ad-card-foot">
            정합식: <b>Σ회원 잔액 + Σ잠김 = Σ입금 − Σ출금 + Σ증액 − Σ포인트 결제 차감 + 0(리워드) + 베타 조정 + 베타 초기 지급</b>. 이 식이 안 맞으면 어딘가에서 포인트가 무에서 생성된 것입니다.
          </div>
        </div>

        <div className="ad-card">
          <div className="ad-card-head">
            <div className={`ad-tile ${mismatch ? "error" : ""}`.trim()}>
              <AdminIcon name={mismatch ? "alert" : "check"} />
            </div>
            <h2>정합 상태</h2>
            {totals && (
              <StatusBadge tone={warnCount > 0 ? "mismatch" : "ok"} label={warnCount > 0 ? `안 맞음 ${warnCount}건` : "일치"} />
            )}
          </div>
          {totals ? (
            <>
              <div className="ad-stack" style={{ gap: 10 }}>
                <div className="ad-row">
                  <span className="ad-muted">좌변 Σ잔액 + Σ잠김</span>
                  <b className="ad-num">{fmtP(totals.left.sum)}</b>
                </div>
                <div className="ad-row">
                  <span className="ad-muted">우변 원장 항목 합</span>
                  <b className="ad-num">{fmtP(totals.right.sum)}</b>
                </div>
                <div className={`ad-row ${mismatch ? "err" : ""}`.trim()}>
                  <span>차이</span>
                  <b className="ad-num">{fmtSigned(totals.diff)} P</b>
                </div>
              </div>
              <div className="ad-muted" style={{ margin: "16px 0 6px", fontSize: "var(--ad-font-sm)" }}>
                차이 / 좌변 = {(diffRatio * 100).toFixed(2)}%
              </div>
              <div className="ad-bar-track">
                <div className={`ad-bar-fill ${mismatch ? "error" : "success"}`} style={{ width: `${mismatch ? Math.max(8, Math.min(100, diffRatio * 1000)) : 100}%` }} />
              </div>
              {totals.betaAdjustment !== 0 && (
                <div className="ad-callout">
                  <AdminIcon name="alert" />
                  <div>
                    베타 조정 <b>{fmtSigned(totals.betaAdjustment)} P</b> (구 inviteRedemptions · 무에서 생성). 정식 항목으로 설명되지 않는 잔액 → 소급 차감 없이 분리 표기 (§8-6).
                  </div>
                </div>
              )}
              <Link href="/admin/ledger" className="ad-btn ad-btn-primary" style={{ width: "100%", marginTop: 16 }}>
                총량 검산에서 원인 보기
              </Link>
            </>
          ) : (
            <div className="ad-stack" style={{ gap: 10 }}>
              <span className="ad-skeleton" />
              <span className="ad-skeleton" style={{ width: "80%" }} />
              <span className="ad-skeleton" style={{ width: "60%" }} />
            </div>
          )}
        </div>
      </div>

      <div className="ad-card" style={{ marginBottom: "var(--ad-sp-lg)" }}>
        <div className="ad-card-head">
          <div className="ad-tile">
            <AdminIcon name="chart" />
          </div>
          <h2>
            채널별 송출·가입 전환 <span className="ad-muted" style={{ fontWeight: 400 }}>(최근 30일)</span>
          </h2>
        </div>
        <div className="ad-placeholder" style={{ minHeight: 160 }}>
          <div>P1 성과 수집(도달 = 공유 링크 클릭 · 가입 전환) 후 표시됩니다.</div>
        </div>
      </div>

      <div className="ad-card">
        <div className="ad-card-head">
          <div className="ad-tile">
            <AdminIcon name="activity" />
          </div>
          <h2>최근 활동</h2>
        </div>
        <DataTable
          columns={columns}
          rows={dash?.recent || []}
          rowKey={(r) => r.id}
          loading={!dash}
          emptyText="아직 거래가 없습니다."
          minWidth={760}
        />
      </div>
    </>
  );
}

function Stat({ label, value, note, primary = false }: { label: string; value: string | null; note: string; primary?: boolean }) {
  return (
    <div className="ad-stat">
      <div className="ad-label">{label}</div>
      <div className={`ad-value ad-num ${primary ? "primary" : ""}`.trim()}>
        {value === null ? <span className="ad-skeleton" style={{ width: "70%" }} /> : value}
      </div>
      <div className="ad-note">{note}</div>
    </div>
  );
}
