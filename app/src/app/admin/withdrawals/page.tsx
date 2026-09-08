"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdmin } from "@/components/admin/AdminContext";
import { approveWithdrawal, errorMessage, listWithdrawals, rejectWithdrawal } from "@/lib/admin-data";
import { BANK_NAMES, type AdminWithdrawal } from "@/lib/admin-types";
import { fmtDateTime, fmtP } from "@/lib/admin-format";
import { seoulDayStart } from "@/lib/admin-types";
import PageHeader from "@/components/admin/PageHeader";
import KpiCard from "@/components/admin/KpiCard";
import DataTable, { type Column } from "@/components/admin/DataTable";
import StatusBadge from "@/components/admin/StatusBadge";
import FilterChips from "@/components/admin/FilterChips";
import { ConfirmModal, ReasonModal } from "@/components/admin/Modal";
import AdminIcon from "@/components/admin/AdminIcon";
import { useToast } from "@/components/admin/Toast";

type Filter = "all" | "pending" | "completed" | "rejected";
const FILTERS: Filter[] = ["all", "pending", "completed", "rejected"];
const LABEL: Record<Filter, string> = { all: "전체", pending: "대기", completed: "완료", rejected: "반려" };

/** 출금 (P0-6 이관): 기존 승인·반려 API 그대로. confirm/prompt → 모달. */
export default function AdminWithdrawalsPage() {
  return (
    <Suspense fallback={<div className="ad-muted">불러오는 중...</div>}>
      <WithdrawalsScreen />
    </Suspense>
  );
}

function WithdrawalsScreen() {
  const { mode, refreshBadges } = useAdmin();
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get("status");
  const [filter, setFilter] = useState<Filter>(FILTERS.includes(initial as Filter) ? (initial as Filter) : "all");
  const [items, setItems] = useState<AdminWithdrawal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modal, setModal] = useState<{ kind: "approve" | "reject"; item: AdminWithdrawal } | null>(null);

  // 목록은 항상 전체를 받고 화면에서 거른다 (KPI 4개가 전체를 필요로 함)
  const load = useCallback(
    async (silent = false) => {
      setRefreshing(true);
      setError(null);
      try {
        setItems(await listWithdrawals("all"));
        refreshBadges();
        if (!silent) toast("최신 데이터로 갱신했습니다");
      } catch (err) {
        setError(errorMessage(err, "출금 요청 조회 실패"));
        console.error("[admin/withdrawals]", err);
      } finally {
        setRefreshing(false);
      }
    },
    [refreshBadges, toast],
  );

  useEffect(() => {
    load(true);
  }, [load]);

  const all = useMemo(() => items || [], [items]);
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: all.length, pending: 0, completed: 0, rejected: 0 };
    for (const w of all) c[w.status] += 1;
    return c;
  }, [all]);
  const dayStart = seoulDayStart();
  const todayApproved = all.filter((w) => w.status === "completed" && w.processedAt && w.processedAt >= dayStart).length;
  const completedSum = all.filter((w) => w.status === "completed").reduce((s, w) => s + w.amount, 0);
  const pendingSum = all.filter((w) => w.status === "pending").reduce((s, w) => s + w.amount, 0);
  const rows = all.filter((w) => filter === "all" || w.status === filter);

  const applyFilter = (f: Filter) => {
    setFilter(f);
    router.replace(f === "all" ? "/admin/withdrawals" : `/admin/withdrawals?status=${f}`);
  };

  const doApprove = async (w: AdminWithdrawal) => {
    setBusyId(w.id);
    try {
      await approveWithdrawal(w.id);
      toast(`${fmtP(w.amount)} 출금 승인 처리 — 외부 송금 완료로 기록됩니다.`);
      setModal(null);
      await load(true);
    } catch (err) {
      toast(errorMessage(err, "승인 실패"), true);
      console.error("[admin/withdrawals] approve failed", w.id, err);
    } finally {
      setBusyId(null);
    }
  };

  const doReject = async (w: AdminWithdrawal, reason: string) => {
    setBusyId(w.id);
    try {
      await rejectWithdrawal(w.id, reason);
      toast(`${fmtP(w.amount)} 출금 반려 — 회원 잔액으로 환불됐습니다.`);
      setModal(null);
      await load(true);
    } catch (err) {
      toast(errorMessage(err, "반려 실패"), true);
      console.error("[admin/withdrawals] reject failed", w.id, err);
    } finally {
      setBusyId(null);
    }
  };

  const columns: Column<AdminWithdrawal>[] = [
    { key: "at", header: "요청 시각", render: (w) => <span className="ad-num">{fmtDateTime(w.requestedAt)}</span> },
    {
      key: "who",
      header: "회원",
      render: (w) => (
        <>
          <strong>{w.userName || "(이름 없음)"}</strong>
          <span className="ad-sub">{w.userEmail || w.userId}</span>
        </>
      ),
    },
    { key: "amount", header: "금액", align: "right", render: (w) => <span className="ad-num" style={{ fontWeight: 700 }}>{fmtP(w.amount)}</span> },
    {
      key: "bank",
      header: "계좌",
      render: (w) => (
        <>
          {BANK_NAMES[w.bankInfo?.bank] || w.bankInfo?.bank} {w.bankInfo?.accountNumber}
          <span className="ad-sub">예금주 {w.bankInfo?.holder || "—"}</span>
        </>
      ),
    },
    {
      key: "status",
      header: "상태",
      render: (w) => (
        <>
          <StatusBadge tone={w.status === "pending" ? "pending" : w.status === "completed" ? "ok" : "rejected"} label={LABEL[w.status]} />
          {w.rejectReason && <span className="ad-sub" style={{ color: "var(--danger)" }}>사유: {w.rejectReason}</span>}
          {w.processedAt && <span className="ad-sub">처리 {fmtDateTime(w.processedAt)}</span>}
        </>
      ),
    },
    {
      key: "actions",
      header: "액션",
      align: "right",
      render: (w) =>
        w.status === "pending" ? (
          <div className="ad-row-actions">
            <button type="button" className={`ad-btn ad-btn-primary ad-btn-sm ${busyId === w.id ? "loading" : ""}`} disabled={busyId === w.id} onClick={() => setModal({ kind: "approve", item: w })}>
              <AdminIcon name="check" small />승인
            </button>
            <button type="button" className="ad-btn ad-btn-danger ad-btn-sm" disabled={busyId === w.id} onClick={() => setModal({ kind: "reject", item: w })}>
              <AdminIcon name="x" small />반려
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader title="출금" sub="회원 → 은행계좌 출금 요청 승인 · 반려. 승인 = 외부 송금이 끝났다는 기록 (잔액은 요청 시 이미 차감)" onRefresh={() => load()} refreshing={refreshing} />

      {error && (
        <div className="ad-callout error" style={{ marginTop: 0, marginBottom: "var(--ad-sp-lg)" }}>
          <AdminIcon name="alert" />
          <div>{error}</div>
        </div>
      )}

      <div className="ad-kpis">
        <KpiCard icon="clock" tone="warning" label="대기" value={items ? counts.pending : null} unit="건" delta={items ? `합계 ${fmtP(pendingSum)}` : undefined} deltaTone={counts.pending ? "warn" : "muted"} onClick={() => applyFilter("pending")} />
        <KpiCard icon="check" tone="success" label="오늘 승인" value={items ? todayApproved : null} unit="건" delta="한국 시간 00:00 이후" onClick={() => applyFilter("completed")} />
        <KpiCard icon="x" tone="error" label="반려" value={items ? counts.rejected : null} unit="건" delta="회원 잔액으로 환불됨" onClick={() => applyFilter("rejected")} />
        <KpiCard icon="withdraw" tone="info" label="총 출금 (완료)" value={items ? completedSum : null} unit="P" delta={items ? `${counts.completed}건` : undefined} />
      </div>

      <div className="ad-card">
        <div className="ad-card-head">
          <div className="ad-tile"><AdminIcon name="withdraw" /></div>
          <h2>출금 요청</h2>
        </div>
        <FilterChips chips={FILTERS.map((f) => ({ key: f, label: LABEL[f], count: items ? counts[f] : undefined }))} active={filter} onChange={applyFilter} />
        <DataTable columns={columns} rows={rows} rowKey={(w) => w.id} loading={!items} emptyText={mode === "demo" ? "데모 모드는 출금이 즉시 차감되어 승인 대기열이 없습니다." : "요청이 없습니다."} minWidth={960} />
      </div>

      <ConfirmModal
        open={modal?.kind === "approve"}
        title="출금 승인"
        message={modal ? `${modal.item.userName || modal.item.userEmail || modal.item.userId} 님의 ${fmtP(modal.item.amount)} 출금을 승인 처리할까요?\n외부 송금이 끝났다는 의미입니다.` : ""}
        confirmLabel="승인 (송금 완료)"
        busy={!!modal && busyId === modal.item.id}
        onConfirm={() => modal && doApprove(modal.item)}
        onCancel={() => setModal(null)}
      />
      <ReasonModal
        open={modal?.kind === "reject"}
        title="출금 반려"
        message={modal ? `${fmtP(modal.item.amount)} 가 회원 잔액으로 환불됩니다. 사유는 회원에게 표시됩니다.` : undefined}
        placeholder="반려 사유 (비우면 'admin_rejected' 로 기록)"
        confirmLabel="반려하고 환불"
        required={false}
        busy={!!modal && busyId === modal.item.id}
        onSubmit={(reason) => modal && doReject(modal.item, reason)}
        onCancel={() => setModal(null)}
      />
    </>
  );
}
