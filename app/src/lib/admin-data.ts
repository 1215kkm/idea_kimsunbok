/**
 * 관리자 화면 데이터 파사드 — Firebase 연동이면 /api/admin/*, 아니면 demo-store (localStorage).
 * 화면 코드는 이 파일만 부르고 모드 분기를 모른다. 응답 형태는 실서버 API 와 동일하게 맞춘다.
 */
import { isConfigured } from "@/lib/firebase";
import { apiGet, apiPost, ApiClientError } from "@/lib/api-client";
import {
  DEFAULT_DAILY_CAP,
  isTerminal,
  remainingBudget,
  type AdminAction,
  type CampaignStatus,
} from "@/lib/reward-ledger";
import type {
  ActivityItem,
  AdminDashboard,
  AdminUser,
  AdminWithdrawal,
  CampaignView,
  LedgerBucket,
  LedgerTotals,
  PayoutItem,
} from "@/lib/admin-types";
import {
  DEMO_INITIAL_FUNDS,
  adminCampaignAction,
  getAllDemoTransactions,
  getCampaigns as getDemoCampaigns,
  getDemoPayoutsForCampaign,
  getDemoTodayPayouts,
  getDemoUsers,
  getDemoWithdrawnTotal,
  setDemoDailyCap,
  type DemoCampaign,
} from "@/lib/demo-store";

export const ADMIN_MODE: "live" | "demo" = isConfigured ? "live" : "demo";

export class AdminDataError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiClientError) return `${fallback} [${err.code}] ${err.message}`;
  if (err instanceof AdminDataError) return `${fallback} [${err.code}]`;
  if (err instanceof Error && err.message) return `${fallback}: ${err.message}`;
  return fallback;
}

const DEMO_SETTINGS_KEY = "daland-demo-admin-split-mode";

function demoCampaignToView(c: DemoCampaign): CampaignView {
  const budget = { budgetLocked: c.budgetLocked, budgetPaid: c.budgetPaid, budgetRefunded: c.budgetRefunded };
  return {
    id: c.id,
    code: c.code,
    ownerUid: c.ownerEmail,
    kind: c.kind,
    unitAmount: c.unitAmount,
    headcount: c.headcount,
    ...budget,
    budgetRemaining: remainingBudget(budget),
    paidCount: c.paidCount,
    dailyCap: c.dailyCap || DEFAULT_DAILY_CAP,
    channels: c.channels,
    copy: c.copy,
    status: c.status,
    rejectReason: c.rejectReason ?? null,
    endReason: c.endReason ?? null,
    createdAt: c.createdAt,
    reviewedAt: c.reviewedAt ?? null,
    reviewedBy: c.reviewedAt ? "demo-admin" : null,
    endedAt: c.endedAt ?? null,
  };
}

// ---------------------------------------------------------------------------
// 대시보드
// ---------------------------------------------------------------------------

export async function getDashboard(): Promise<AdminDashboard> {
  if (ADMIN_MODE === "live") return apiGet<AdminDashboard>("/api/admin/dashboard");
  const campaigns = getDemoCampaigns();
  const pending = campaigns.filter((c) => c.status === "pending_review");
  const today = getDemoTodayPayouts();
  const users = getDemoUsers();
  const nameOf = (email: string) => users.find((u) => u.email === email)?.name || "";
  const recent: ActivityItem[] = getAllDemoTransactions()
    .slice(0, 20)
    .map((t) => ({
      id: t.id,
      at: t.createdAt,
      userId: t.consumerId,
      userEmail: t.consumerId,
      userName: t.userName || nameOf(t.consumerId),
      type: "spend",
      amount: t.amount,
      totalAccumulation: t.totalAccumulation,
      campaignId: null,
      source: null,
      categoryName: t.categoryName,
    }));
  // 캠페인 제출도 활동으로 (실서버는 reward_lock transactions 가 대신한다)
  for (const c of campaigns) {
    recent.push({
      id: `campaign-${c.id}`,
      at: c.createdAt,
      userId: c.ownerEmail,
      userEmail: c.ownerEmail,
      userName: nameOf(c.ownerEmail),
      type: "reward_lock",
      amount: c.budgetLocked,
      totalAccumulation: -c.budgetLocked,
      campaignId: c.id,
      source: null,
      categoryName: null,
    });
  }
  recent.sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
  return {
    generatedAt: Date.now(),
    todaySignups: 0,
    pendingCampaigns: pending.length,
    oldestPendingAt: pending.length ? Math.min(...pending.map((c) => c.createdAt)) : null,
    todayRewardPaid: today.amount,
    todayRewardCount: today.count,
    pendingWithdrawals: 0,
    pendingWithdrawalAmount: 0,
    recent: recent.slice(0, 20),
  };
}

// ---------------------------------------------------------------------------
// 리워드 캠페인
// ---------------------------------------------------------------------------

export async function listCampaigns(status: CampaignStatus | "all" = "all"): Promise<CampaignView[]> {
  if (ADMIN_MODE === "live") {
    const r = await apiGet<{ items: CampaignView[] }>(`/api/admin/reward/campaigns?status=${status}`);
    return r.items || [];
  }
  return getDemoCampaigns()
    .filter((c) => status === "all" || c.status === status)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(demoCampaignToView);
}

export async function campaignAction(
  id: string,
  action: AdminAction,
  reason?: string,
): Promise<{ from: CampaignStatus; to: CampaignStatus; refunded: number }> {
  if (ADMIN_MODE === "live") {
    return apiPost<{ from: CampaignStatus; to: CampaignStatus; refunded: number }>(
      `/api/admin/reward/campaigns/${id}/${action}`,
      reason !== undefined ? { reason } : undefined,
    );
  }
  const r = adminCampaignAction(id, action, reason);
  if (!r.ok) throw new AdminDataError(r.error, `demo ${action} failed`);
  return { from: r.from, to: r.to, refunded: r.refunded };
}

export async function setDailyCap(id: string, dailyCap: number): Promise<void> {
  if (ADMIN_MODE === "live") {
    await apiPost(`/api/admin/reward/campaigns/${id}/daily-cap`, { dailyCap });
    return;
  }
  if (!setDemoDailyCap(id, dailyCap)) throw new AdminDataError("NOT_FOUND", "campaign not found");
}

export async function listPayouts(campaignId: string): Promise<PayoutItem[]> {
  if (ADMIN_MODE === "live") {
    const r = await apiGet<{ items: PayoutItem[] }>(`/api/admin/reward/campaigns/${campaignId}/payouts`);
    return r.items || [];
  }
  return getDemoPayoutsForCampaign(campaignId).map((p) => ({
    id: p.email,
    inviteeUid: p.email,
    inviteeEmail: p.email,
    amount: p.amount,
    condition: "signup",
    status: "paid",
    paidAt: p.paidAt || null,
  }));
}

// ---------------------------------------------------------------------------
// 총량 모니터
// ---------------------------------------------------------------------------

export async function getTotals(): Promise<LedgerTotals> {
  if (ADMIN_MODE === "live") return apiGet<LedgerTotals>("/api/admin/ledger/totals");

  // 데모: 실서버 ledger/totals 와 같은 byType 규칙으로 localStorage 를 집계한다
  const users = getDemoUsers();
  const byType: Record<string, LedgerBucket> = {};
  const bump = (key: string, amount: number, totalDelta: number, lockedDelta: number) => {
    const b = (byType[key] ??= { count: 0, amount: 0, totalDelta: 0, lockedDelta: 0 });
    b.count += 1;
    b.amount += amount;
    b.totalDelta += totalDelta;
    b.lockedDelta += lockedDelta;
  };
  const txs = getAllDemoTransactions();
  for (const t of txs) {
    bump("spend_principal", t.amount, -t.amount, 0);
    bump("spend_bonus", t.totalAccumulation, t.totalAccumulation, 0);
  }
  for (const c of getDemoCampaigns()) {
    bump("reward_lock", c.budgetLocked, -c.budgetLocked, c.budgetLocked);
    if (c.budgetPaid > 0) {
      bump("reward_out", c.budgetPaid, 0, -c.budgetPaid);
      bump("reward_in", c.budgetPaid, c.budgetPaid, 0);
    }
    if (c.budgetRefunded > 0) bump("reward_refund", c.budgetRefunded, c.budgetRefunded, -c.budgetRefunded);
  }
  const withdrawn = getDemoWithdrawnTotal();
  if (withdrawn > 0) bump("withdrawal_request", withdrawn, -withdrawn, 0);

  const totalPoints = users.reduce((s, u) => s + u.balance, 0);
  const lockedPoints = users.reduce((s, u) => s + u.locked, 0);
  const betaInitialFunds = users.length * DEMO_INITIAL_FUNDS;
  const sumTotalDelta = Object.values(byType).reduce((s, b) => s + b.totalDelta, 0);
  const sumLockedDelta = Object.values(byType).reduce((s, b) => s + b.lockedDelta, 0);
  const left = totalPoints + lockedPoints;
  const right = sumTotalDelta + sumLockedDelta + betaInitialFunds;
  const rewardNet = ["reward_lock", "reward_out", "reward_in", "reward_refund"].reduce(
    (s, k) => s + (byType[k]?.totalDelta || 0) + (byType[k]?.lockedDelta || 0),
    0,
  );
  const activeLocked = getDemoCampaigns()
    .filter((c) => !isTerminal(c.status))
    .reduce((s, c) => s + remainingBudget(c), 0);
  return {
    generatedAt: Date.now(),
    left: { totalPoints, lockedPoints, sum: left, userCount: users.length },
    right: { transactionsTotalDelta: sumTotalDelta, transactionsLockedDelta: sumLockedDelta, betaInitialFunds, sum: right },
    diff: left - right,
    byType,
    betaAdjustment: 0,
    rewardNet,
    warnings: [
      ...(left !== right ? [`좌변·우변 불일치 ${left - right}`] : []),
      ...(rewardNet !== 0 ? [`리워드 원장 순변화 ${rewardNet} (0 이어야 함)`] : []),
      ...(activeLocked !== lockedPoints ? [`Σ lockedPoints(${lockedPoints}) ≠ 진행 캠페인 잔여(${activeLocked})`] : []),
      "데모 모드 — localStorage 집계 (회원 탈퇴 시 좌·우변이 함께 줄어듭니다)",
    ],
    transactionCount: txs.length,
  };
}

// ---------------------------------------------------------------------------
// 회원 · 출금 · 설정 (기존 3탭 이관)
// ---------------------------------------------------------------------------

export async function listUsers(): Promise<AdminUser[]> {
  if (ADMIN_MODE === "live") {
    const r = await apiGet<{ items: AdminUser[] }>("/api/admin/users");
    return r.items || [];
  }
  return getDemoUsers().map((u) => ({
    id: u.email,
    name: u.name,
    email: u.email,
    role: "consumer",
    memberType: "personal",
    totalPoints: u.balance,
    lockedPoints: u.locked,
    depositTotal: u.isAdvertiser ? 100_000 : 0,
    isAdvertiser: u.isAdvertiser,
    membershipLevel: 1,
    createdAt: null,
  }));
}

export async function listWithdrawals(status: "pending" | "completed" | "rejected" | "all"): Promise<AdminWithdrawal[]> {
  if (ADMIN_MODE === "live") {
    const r = await apiGet<{ items: AdminWithdrawal[] }>(`/api/admin/withdraw/list?status=${status}`);
    return r.items || [];
  }
  return []; // 데모 출금은 즉시 차감(deductBalance) — 승인 대기열이 없다
}

export async function approveWithdrawal(requestId: string): Promise<void> {
  if (ADMIN_MODE !== "live") throw new AdminDataError("DEMO", "not available in demo");
  await apiPost("/api/admin/withdraw/approve", { requestId });
}

export async function rejectWithdrawal(requestId: string, reason: string): Promise<void> {
  if (ADMIN_MODE !== "live") throw new AdminDataError("DEMO", "not available in demo");
  await apiPost("/api/admin/withdraw/reject", { requestId, reason });
}

export type SplitMode = "auto" | "manual";

export async function getSettings(): Promise<{ splitMode: SplitMode; splitAutoLimit: number; updatedAt: number | null }> {
  if (ADMIN_MODE === "live") {
    return apiGet<{ splitMode: SplitMode; splitAutoLimit: number; updatedAt: number | null }>("/api/admin/settings");
  }
  const saved = typeof localStorage !== "undefined" ? localStorage.getItem(DEMO_SETTINGS_KEY) : null;
  return { splitMode: saved === "manual" ? "manual" : "auto", splitAutoLimit: 1_000_000_000, updatedAt: null };
}

export async function setSplitMode(mode: SplitMode): Promise<void> {
  if (ADMIN_MODE === "live") {
    await apiPost("/api/admin/settings", { splitMode: mode });
    return;
  }
  localStorage.setItem(DEMO_SETTINGS_KEY, mode);
}
