"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdmin } from "@/components/admin/AdminContext";
import { campaignAction, errorMessage, getDashboard, listCampaigns, listPayouts, setDailyCap } from "@/lib/admin-data";
import type { CampaignView, PayoutItem } from "@/lib/admin-types";
import { fmt, fmtDateTime, fmtP, fmtShort, maskEmail } from "@/lib/admin-format";
import { DEFAULT_DAILY_CAP, MAX_DAILY_CAP, isTerminal, type AdminAction, type RewardChannel } from "@/lib/reward-ledger";
import PageHeader from "@/components/admin/PageHeader";
import KpiCard from "@/components/admin/KpiCard";
import DataTable, { type Column } from "@/components/admin/DataTable";
import { CampaignStatusBadge } from "@/components/admin/StatusBadge";
import BudgetBar from "@/components/admin/BudgetBar";
import FilterChips from "@/components/admin/FilterChips";
import Drawer from "@/components/admin/Drawer";
import { ReasonModal } from "@/components/admin/Modal";
import AdminIcon from "@/components/admin/AdminIcon";
import { useToast } from "@/components/admin/Toast";

type Filter = "all" | "pending_review" | "live" | "paused" | "ended" | "rejected";
const FILTERS: Filter[] = ["all", "pending_review", "live", "paused", "ended", "rejected"];
const FILTER_LABEL: Record<Filter, string> = {
  all: "전체",
  pending_review: "승인 대기",
  live: "진행 중",
  paused: "일시정지",
  ended: "종료",
  rejected: "거절",
};
const CHANNEL: Record<RewardChannel, [string, string]> = {
  youtube: ["YT", "유튜브"],
  kakao: ["K", "카카오"],
  instagram: ["IG", "인스타그램"],
  naver: ["N", "네이버"],
  facebook: ["FB", "페이스북"],
  other: ["+", "기타"],
};

/** 캠페인 목록에서 status 필터 매칭 (approved 는 live 와 같은 칸) */
function matches(c: CampaignView, f: Filter): boolean {
  if (f === "all") return true;
  if (f === "live") return c.status === "live" || c.status === "approved";
  if (f === "pending_review") return c.status === "pending_review" || c.status === "draft";
  return c.status === f;
}

export default function AdminRewardPage() {
  return (
    <Suspense fallback={<div className="ad-muted">불러오는 중...</div>}>
      <RewardScreen />
    </Suspense>
  );
}

function RewardScreen() {
  const { refreshBadges } = useAdmin();
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const initial = params.get("status");
  const [filter, setFilter] = useState<Filter>(FILTERS.includes(initial as Filter) ? (initial as Filter) : "all");
  const [search, setSearch] = useState("");
  const [campaigns, setCampaigns] = useState<CampaignView[] | null>(null);
  const [todayPaid, setTodayPaid] = useState<{ amount: number; count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modal, setModal] = useState<{ kind: "reject" | "end"; campaign: CampaignView } | null>(null);

  const load = useCallback(
    async (silent = false) => {
      setRefreshing(true);
      setError(null);
      try {
        const [list, dash] = await Promise.all([listCampaigns("all"), getDashboard()]);
        setCampaigns(list);
        setTodayPaid({ amount: dash.todayRewardPaid, count: dash.todayRewardCount });
        refreshBadges();
        if (!silent) toast("최신 데이터로 갱신했습니다");
        return list;
      } catch (err) {
        setError(errorMessage(err, "캠페인 조회 실패"));
        console.error("[admin/reward]", err);
        return null;
      } finally {
        setRefreshing(false);
      }
    },
    [refreshBadges, toast],
  );

  useEffect(() => {
    load(true);
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, pending_review: 0, live: 0, paused: 0, ended: 0, rejected: 0 };
    for (const x of campaigns || []) for (const f of FILTERS) if (matches(x, f)) c[f] += 1;
    return c;
  }, [campaigns]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (campaigns || []).filter(
      (c) => matches(c, filter) && (!q || c.id.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.ownerUid.toLowerCase().includes(q)),
    );
  }, [campaigns, filter, search]);

  const lockedSum = useMemo(() => (campaigns || []).filter((c) => !isTerminal(c.status)).reduce((s, c) => s + c.budgetRemaining, 0), [campaigns]);
  const selected = useMemo(() => (campaigns || []).find((c) => c.id === selectedId) || null, [campaigns, selectedId]);

  const applyFilter = (f: Filter) => {
    setFilter(f);
    router.replace(f === "all" ? "/admin/reward" : `/admin/reward?status=${f}`);
  };

  /** 액션 실행 → 목록 갱신 → (승인·거절이면) 다음 대기 건 자동 열림, 아니면 드로어 닫기 */
  const run = async (c: CampaignView, action: AdminAction, reason?: string) => {
    setBusyId(c.id);
    try {
      const r = await campaignAction(c.id, action, reason);
      const msg: Record<AdminAction, string> = {
        approve: `${c.id} 승인 — 송출을 시작합니다. 광고주 예산 ${fmtP(c.budgetRemaining)} 는 그대로 잠김.`,
        reject: `${c.id} 거절 — 잠긴 예산 ${fmtP(r.refunded)} 를 광고주에게 반환했습니다.`,
        pause: `${c.id} 일시정지 — 지급이 멈춥니다. 예산은 잠긴 채 유지.`,
        resume: `${c.id} 재개 — 지급을 다시 시작합니다.`,
        end: `${c.id} 종료 — 잔여 ${fmtP(r.refunded)} 반환 완료.`,
      };
      toast(msg[action]);
      setModal(null);
      const list = await load(true);
      const gotoNext = action === "approve" || action === "reject";
      const next = gotoNext ? (list || []).find((x) => x.status === "pending_review") : null;
      setSelectedId(next ? next.id : null);
    } catch (err) {
      const msg = errorMessage(err, `${action} 실패`);
      toast(msg, true);
      console.error("[admin/reward] action failed", action, c.id, err);
    } finally {
      setBusyId(null);
    }
  };

  const actionButtons = (c: CampaignView, small = true) => {
    const s = small ? " ad-btn-sm" : "";
    const busy = busyId === c.id;
    const stop = (e: MouseEvent) => e.stopPropagation();
    switch (c.status) {
      case "pending_review":
        return (
          <>
            <button type="button" className={`ad-btn ad-btn-primary${s} ${busy ? "loading" : ""}`} disabled={busy} onClick={(e) => { stop(e); run(c, "approve"); }}>
              <AdminIcon name="check" small />승인
            </button>
            <button type="button" className={`ad-btn ad-btn-danger${s}`} disabled={busy} onClick={(e) => { stop(e); setModal({ kind: "reject", campaign: c }); }}>
              <AdminIcon name="x" small />거절
            </button>
          </>
        );
      case "approved":
      case "live":
        return (
          <>
            <button type="button" className={`ad-btn ad-btn-secondary${s} ${busy ? "loading" : ""}`} disabled={busy} onClick={(e) => { stop(e); run(c, "pause"); }}>
              <AdminIcon name="pause" small />정지
            </button>
            <button type="button" className={`ad-btn ad-btn-danger${s}`} disabled={busy} onClick={(e) => { stop(e); setModal({ kind: "end", campaign: c }); }}>
              <AdminIcon name="stop" small />종료
            </button>
          </>
        );
      case "paused":
        return (
          <>
            <button type="button" className={`ad-btn ad-btn-primary${s} ${busy ? "loading" : ""}`} disabled={busy} onClick={(e) => { stop(e); run(c, "resume"); }}>
              <AdminIcon name="play" small />재개
            </button>
            <button type="button" className={`ad-btn ad-btn-danger${s}`} disabled={busy} onClick={(e) => { stop(e); setModal({ kind: "end", campaign: c }); }}>
              <AdminIcon name="stop" small />종료
            </button>
          </>
        );
      default:
        return small ? (
          <button type="button" className={`ad-btn ad-btn-outline${s}`} onClick={(e) => { stop(e); setSelectedId(c.id); }}>
            상세<AdminIcon name="chevron" small />
          </button>
        ) : null;
    }
  };

  const columns: Column<CampaignView>[] = [
    { key: "id", header: "캠페인 ID", render: (c) => (<><strong>{c.id}</strong><span className="ad-sub">코드 {c.code}</span></>) },
    { key: "owner", header: "광고주", render: (c) => <span title={c.ownerUid}>{c.ownerUid.includes("@") ? maskEmail(c.ownerUid) : c.ownerUid.slice(0, 10)}</span> },
    { key: "kind", header: "종류", render: (c) => <span className={`ad-chip ${c.kind === "new_member" ? "purple" : "orange"}`}>{c.kind === "new_member" ? "① 신규 가입" : "② 기존 DB"}</span> },
    { key: "unit", header: "1인 금액", align: "right", render: (c) => <span className="ad-num">{fmtP(c.unitAmount)}</span> },
    { key: "head", header: "인원", align: "right", render: (c) => <span className="ad-num">{c.paidCount}/{fmt(c.headcount)}명</span> },
    { key: "budget", header: "예산 (지급 / 잠김 / 반환)", render: (c) => <BudgetBar budget={c} /> },
    { key: "ch", header: "채널", render: (c) => c.channels.map((k) => <span key={k} className={`ad-ch ${k}`} title={CHANNEL[k]?.[1] || k}>{CHANNEL[k]?.[0] || "?"}</span>) },
    { key: "status", header: "상태", render: (c) => <CampaignStatusBadge status={c.status} /> },
    { key: "date", header: "제출일", render: (c) => <span className="ad-num">{fmtShort(c.createdAt)}</span> },
    { key: "actions", header: "액션", align: "right", render: (c) => <div className="ad-row-actions">{actionButtons(c)}</div> },
  ];

  return (
    <>
      <PageHeader
        title="리워드광고 관리"
        sub="캠페인 승인 · 송출 · 지급 · 성과 — 리워드는 광고주 예산에서 회원에게 이전됩니다 (합계 변화 0)"
        search={{ value: search, onChange: setSearch, placeholder: "캠페인 ID · 코드 · 광고주 검색" }}
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
        <KpiCard icon="clock" tone="warning" label="승인 대기" value={campaigns ? counts.pending_review : null} unit="건" delta="클릭하면 대기 건만 보기" deltaTone="warn" onClick={() => applyFilter("pending_review")} />
        <KpiCard icon="play" tone="success" label="진행 중" value={campaigns ? counts.live : null} unit="건" delta={campaigns ? `일시정지 ${counts.paused}건 별도` : undefined} onClick={() => applyFilter("live")} />
        <KpiCard icon="transfer" tone="primary" label="오늘 지급" value={todayPaid ? todayPaid.amount : null} unit="P" delta={todayPaid ? `${todayPaid.count}명 · 광고주 예산에서 이전` : undefined} />
        <KpiCard icon="lock" tone="info" label="잠긴 예산 총합" value={campaigns ? lockedSum : null} unit="P" delta="에스크로 · 출금 가능 잔액에서 제외" />
      </div>

      <div className="ad-card">
        <div className="ad-card-head">
          <div className="ad-tile"><AdminIcon name="megaphone" /></div>
          <h2>캠페인</h2>
        </div>
        <FilterChips chips={FILTERS.map((f) => ({ key: f, label: FILTER_LABEL[f], count: campaigns ? counts[f] : undefined }))} active={filter} onChange={applyFilter} />
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(c) => c.id}
          loading={!campaigns}
          emptyText={search ? "검색 결과가 없습니다." : "해당 상태의 캠페인이 없습니다."}
          minWidth={1180}
          selectedKey={selectedId}
          onRowClick={(c) => setSelectedId(c.id)}
        />
        <div className="ad-card-foot">행을 누르면 우측에 상세(문구 미리보기 · 지급내역 · 성과)가 열립니다. 액션 버튼은 행 위에 마우스를 올리면 나타납니다 (터치 기기는 상시).</div>
      </div>

      <CampaignDrawer campaign={selected} busy={busyId === selected?.id} onClose={() => setSelectedId(null)} actions={selected ? actionButtons(selected, false) : null} onDailyCapSaved={() => load(true)} />

      <ReasonModal
        open={modal?.kind === "reject"}
        title={`${modal?.campaign.id} 거절`}
        message="거절 사유는 광고주에게 그대로 전달되고, 잠긴 예산은 전액 반환됩니다."
        placeholder="예: 광고 문구에 '120% 수익' 표현 — 정직 표기 기준 위반"
        confirmLabel="거절하고 예산 반환"
        busy={!!modal && busyId === modal.campaign.id}
        onSubmit={(reason) => modal && run(modal.campaign, "reject", reason)}
        onCancel={() => setModal(null)}
      />
      <ReasonModal
        open={modal?.kind === "end"}
        title={`${modal?.campaign.id} 종료`}
        message={modal ? `잔여 예산 ${fmtP(modal.campaign.budgetRemaining)} 가 광고주에게 반환됩니다. 되돌릴 수 없습니다.\n종료 사유를 남겨 주세요 (감사 로그).` : undefined}
        placeholder="예: 광고주 요청 / 문구 정책 위반 / 예산 재검토"
        confirmLabel="종료하고 잔여 반환"
        busy={!!modal && busyId === modal.campaign.id}
        onSubmit={(reason) => modal && run(modal.campaign, "end", reason)}
        onCancel={() => setModal(null)}
      />
    </>
  );
}

function CampaignDrawer({
  campaign,
  busy,
  onClose,
  actions,
  onDailyCapSaved,
}: {
  campaign: CampaignView | null;
  busy: boolean;
  onClose: () => void;
  actions: ReactNode;
  onDailyCapSaved: () => void;
}) {
  const toast = useToast();
  const [tab, setTab] = useState<"payouts" | "stats">("payouts");
  const [payouts, setPayouts] = useState<PayoutItem[] | null>(null);
  const [cap, setCap] = useState<string>("");
  const [capBusy, setCapBusy] = useState(false);
  const id = campaign?.id ?? null;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setPayouts(null);
    setTab("payouts");
    listPayouts(id)
      .then((items) => {
        if (!cancelled) setPayouts(items);
      })
      .catch((err) => {
        console.error("[admin/reward] payouts failed", id, err);
        if (!cancelled) {
          setPayouts([]);
          toast(errorMessage(err, "지급내역 조회 실패"), true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, toast]);

  useEffect(() => {
    setCap(campaign ? String(campaign.dailyCap || DEFAULT_DAILY_CAP) : "");
  }, [campaign]);

  const saveCap = async () => {
    if (!campaign) return;
    const n = Number(cap);
    if (!Number.isInteger(n) || n < 1 || n > MAX_DAILY_CAP) {
      toast(`일일 상한은 1~${fmt(MAX_DAILY_CAP)} 정수여야 합니다.`, true);
      return;
    }
    setCapBusy(true);
    try {
      await setDailyCap(campaign.id, n);
      toast(`${campaign.id} 일일 지급 상한 → ${n}명/일`);
      onDailyCapSaved();
    } catch (err) {
      toast(errorMessage(err, "상한 변경 실패"), true);
      console.error("[admin/reward] daily-cap failed", campaign.id, err);
    } finally {
      setCapBusy(false);
    }
  };

  const c = campaign;
  const ownerLabel = c ? (c.ownerUid.includes("@") ? maskEmail(c.ownerUid) : c.ownerUid.slice(0, 10)) : "";
  const progress = c && c.headcount > 0 ? Math.min(100, (c.paidCount / c.headcount) * 100) : 0;

  return (
    <Drawer open={!!c} title={c?.id ?? ""} badge={c ? <CampaignStatusBadge status={c.status} /> : null} onClose={onClose} footer={actions}>
      {c && (
        <>
          <div className="ad-preview">
            <div className="ad-eyebrow">광고주 {ownerLabel} · 코드 {c.code}</div>
            <div className="ad-headline">가입 시 {fmtP(c.unitAmount)} 지급</div>
            <div className="ad-copy">{c.copy}</div>
            <span className="ad-cta">코드 입력하고 가입하기</span>
          </div>

          <div className="ad-meta">
            <Meta k="종류" v={c.kind === "new_member" ? "① 신규 회원 가입 리워드" : "② 기존사이트 회원 DB 연동 (P2)"} />
            <Meta k="1인 금액" v={fmtP(c.unitAmount)} />
            <Meta k="모집 인원" v={`${fmt(c.headcount)}명 (지급 ${fmt(c.paidCount)}명)`} />
            <Meta k="예산 잠김" v={`${fmtP(c.budgetLocked)} (제출 시 에스크로)`} />
            <Meta k="지급 / 잔여 / 반환" v={`${fmt(c.budgetPaid)} / ${fmt(c.budgetRemaining)} / ${fmt(c.budgetRefunded)} P`} />
            <Meta k="채널" v={c.channels.map((k) => CHANNEL[k]?.[1] || k).join(" · ")} />
            <Meta k="제출일" v={fmtDateTime(c.createdAt)} />
            <Meta k="검토" v={c.reviewedAt ? `${fmtDateTime(c.reviewedAt)}${c.reviewedBy ? ` · ${c.reviewedBy.slice(0, 8)}` : ""}` : "—"} />
            <Meta k="지급 조건" v="가입 + 이메일 인증 + 1인 1회 (P0)" />
            <div>
              <span className="k">일일 지급 상한</span>
              <div className="ad-inline-form" style={{ marginTop: 4 }}>
                <input className="ad-input" type="number" min={1} max={MAX_DAILY_CAP} value={cap} onChange={(e) => setCap(e.target.value)} disabled={isTerminal(c.status) || capBusy} style={{ width: 110 }} aria-label="일일 지급 상한" />
                <span className="ad-muted">명/일</span>
                <button type="button" className={`ad-btn ad-btn-outline ad-btn-sm ${capBusy ? "loading" : ""}`} onClick={saveCap} disabled={isTerminal(c.status) || capBusy || busy}>
                  저장
                </button>
              </div>
            </div>
          </div>

          {c.status === "rejected" && <div className="ad-reason">거절 사유: {c.rejectReason || "(미기재)"} · 예산 전액 반환됨</div>}
          {c.status === "ended" && <div className="ad-reason info">종료 사유: {c.endReason === "headcount_reached" ? "모집 인원 달성 (자동 종료)" : c.endReason || "(미기재)"} · 잔여 {fmtP(c.budgetRefunded)} 반환</div>}
          {c.status === "paused" && <div className="ad-reason info">일시정지 — 지급이 멈춰 있습니다. 예산은 잠긴 채 유지.</div>}

          <div className="ad-tabs">
            <button type="button" className={tab === "payouts" ? "active" : undefined} onClick={() => setTab("payouts")}>지급내역{payouts ? ` (${payouts.length})` : ""}</button>
            <button type="button" className={tab === "stats" ? "active" : undefined} onClick={() => setTab("stats")}>성과</button>
          </div>

          {tab === "payouts" ? (
            <DataTable
              columns={[
                { key: "who", header: "회원", render: (p: PayoutItem) => <span title={p.inviteeUid}>{p.inviteeEmail ? maskEmail(p.inviteeEmail) : p.inviteeUid.slice(0, 10)}</span> },
                { key: "cond", header: "조건", render: (p: PayoutItem) => <span className="ad-chip green">{p.condition === "signup+email_verified" ? "가입+인증" : p.condition || "가입"}</span> },
                { key: "amt", header: "금액", align: "right", render: (p: PayoutItem) => <span className="ad-num">+{fmtP(p.amount)}</span> },
                { key: "at", header: "시각", render: (p: PayoutItem) => <span className="ad-num">{fmtShort(p.paidAt)}</span> },
              ]}
              rows={payouts || []}
              rowKey={(p) => p.id}
              loading={!payouts}
              emptyText="아직 지급된 건이 없습니다."
              minWidth={0}
              skeletonRows={2}
            />
          ) : (
            <>
              <div className="ad-mini-stats">
                <div className="ad-stat"><div className="ad-label">도달</div><div className="ad-value ad-num ad-muted">—</div></div>
                <div className="ad-stat"><div className="ad-label">가입</div><div className="ad-value ad-num ad-muted">—</div></div>
                <div className="ad-stat"><div className="ad-label">지급</div><div className="ad-value ad-num">{fmt(c.paidCount)}명</div></div>
                <div className="ad-stat"><div className="ad-label">전환율</div><div className="ad-value ad-num ad-muted">—</div></div>
              </div>
              <div className="ad-muted" style={{ marginBottom: 6, fontSize: "var(--ad-font-sm)" }}>모집 진행률 (지급 인원 ÷ 모집 인원) · {progress.toFixed(0)}%</div>
              <div className="ad-bar-track"><div className="ad-bar-fill" style={{ width: `${progress}%` }} /></div>
              <div className="ad-card-foot">도달·가입·전환율은 P1-5 성과 수집(공유 링크 클릭) 후 표시됩니다. 플랫폼 API 게시가 아니라 광고주가 직접 올린 링크 기준입니다 (기획서 §7.2).</div>
            </>
          )}
        </>
      )}
    </Drawer>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  );
}

