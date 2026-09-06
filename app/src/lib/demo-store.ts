/**
 * 데모 모드 로컬 스토리지 기반 데이터 저장소
 *
 * Firebase 미연결 환경(베타 테스트)에서도 실사용 UX를 체험할 수 있도록
 * 회원별(이메일 키 기준) 거래내역과 잔액을 localStorage에 누적 저장한다.
 *
 * 실환경(Firebase) 전환 시 동일 스키마로 Firestore에 그대로 이관 가능.
 */

import {
  canRedeem,
  lockAmount,
  nextStatus,
  remainingBudget,
  statusAfterPayout,
  type AdminAction,
  type CampaignStatus,
  type RewardChannel,
  type RewardKind,
} from "./reward-ledger";

export interface DemoTransaction {
  id: string;
  consumerId: string; // 이메일 (데모 환경의 user.uid 대체)
  userName: string;
  category: string;
  categoryName: string;
  storeName?: string;
  amount: number;
  memo: string;
  totalAccumulation: number;
  nonlinearResult: {
    principal: number;
    bonus: number;
    totalAccumulation: number;
    rate: number;
    memberCount: number;
    perMemberAmount: number;
    advertiserReward: number;
  };
  createdAt: number; // Unix timestamp (ms)
}

const TX_KEY = (email: string) => `daland-demo-transactions-${email}`;
const BAL_KEY = (email: string) => `daland-demo-balance-${email}`;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function emailKey(user: { email?: string | null } | null | undefined): string | null {
  if (!user || !user.email) return null;
  return user.email.toLowerCase();
}

/**
 * 거래 1건 추가 + 잔액 반영.
 * Model A: 지출금액 차감 후 120% 적립 → 순증 +20% (실서버 /api/spend/register 와 동일)
 */
export function saveTransaction(
  user: { email?: string | null; displayName?: string | null },
  tx: Omit<DemoTransaction, "id" | "consumerId" | "userName" | "createdAt">
): DemoTransaction | null {
  if (!isBrowser()) return null;
  const key = emailKey(user);
  if (!key) return null;

  const record: DemoTransaction = {
    ...tx,
    id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    consumerId: key,
    userName: user.displayName || "사용자",
    createdAt: Date.now(),
  };

  try {
    const raw = localStorage.getItem(TX_KEY(key));
    const list: DemoTransaction[] = raw ? JSON.parse(raw) : [];
    list.unshift(record); // 최신순
    localStorage.setItem(TX_KEY(key), JSON.stringify(list));

    const bal = getBalance(user);
    localStorage.setItem(BAL_KEY(key), String(bal - record.amount + record.totalAccumulation));
  } catch {
    // 저장 실패 무시 (quota 초과 등)
  }

  return record;
}

/** 회원 거래내역 전체 조회 (최신순) */
export function getTransactions(user: { email?: string | null } | null | undefined): DemoTransaction[] {
  if (!isBrowser()) return [];
  const key = emailKey(user);
  if (!key) return [];
  try {
    const raw = localStorage.getItem(TX_KEY(key));
    return raw ? (JSON.parse(raw) as DemoTransaction[]) : [];
  } catch {
    return [];
  }
}

/** 베타 테스터 초기 지급금 (실서버 post-signup 의 BETA_INITIAL_FUNDS 와 동일) */
export const DEMO_INITIAL_FUNDS = 1_000_000;

/** 현재 잔액 조회 (포인트 P 단위). 최초 접근 시 베타 지급금 100만P 시드. */
export function getBalance(user: { email?: string | null } | null | undefined): number {
  if (!isBrowser()) return 0;
  const key = emailKey(user);
  if (!key) return 0;
  try {
    const raw = localStorage.getItem(BAL_KEY(key));
    if (raw === null) {
      localStorage.setItem(BAL_KEY(key), String(DEMO_INITIAL_FUNDS));
      return DEMO_INITIAL_FUNDS;
    }
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/** 잔액 차감 (출금 시 사용) */
export function deductBalance(user: { email?: string | null }, amount: number): number {
  if (!isBrowser()) return 0;
  const key = emailKey(user);
  if (!key) return 0;
  const before = getBalance(user);
  const next = Math.max(0, before - amount);
  localStorage.setItem(BAL_KEY(key), String(next));
  // 관리자 총량 모니터 우변 항목 (withdrawal_request) — 실제 차감분만 기록
  try {
    const prev = parseInt(localStorage.getItem(WITHDRAWN_KEY) || "0", 10);
    localStorage.setItem(WITHDRAWN_KEY, String((Number.isFinite(prev) ? prev : 0) + (before - next)));
  } catch {
    // 무시
  }
  return next;
}

const WITHDRAWN_KEY = "daland-demo-withdrawn-total";

/** 회원 통계 (총 지출, 총 적립, 거래 건수) */
export function getStats(user: { email?: string | null } | null | undefined): {
  spent: number;
  earned: number;
  count: number;
} {
  const list = getTransactions(user);
  let spent = 0;
  let earned = 0;
  for (const t of list) {
    spent += t.amount;
    earned += t.totalAccumulation;
  }
  return { spent, earned, count: list.length };
}

// --- 회원 탈퇴 ---

const WITHDRAW_LOG_KEY = "daland-demo-withdrawal-log";

export interface WithdrawalLog {
  email: string;
  refundAmount: number;
  systemProfit: number;
  reason: string;
  timestamp: number;
}

/** 회원 탈퇴 처리: 거래내역·잔액 삭제 + 환불 로그 기록 */
export function withdrawUser(
  user: { email?: string | null },
  refundAmount: number,
  systemProfit: number,
  reason: string = "",
): WithdrawalLog | null {
  if (!isBrowser()) return null;
  const key = emailKey(user);
  if (!key) return null;

  const log: WithdrawalLog = {
    email: key,
    refundAmount,
    systemProfit,
    reason,
    timestamp: Date.now(),
  };

  try {
    // 환불 로그 누적
    const raw = localStorage.getItem(WITHDRAW_LOG_KEY);
    const logs: WithdrawalLog[] = raw ? JSON.parse(raw) : [];
    logs.unshift(log);
    localStorage.setItem(WITHDRAW_LOG_KEY, JSON.stringify(logs));

    // 회원 데이터 삭제
    localStorage.removeItem(TX_KEY(key));
    localStorage.removeItem(BAL_KEY(key));
  } catch {
    // 무시
  }

  return log;
}

// --- 리워드 캠페인 (데모) ---
//
// 실서버는 lib/server/reward-service.ts (Firestore 트랜잭션). 데모 모드는 같은 규칙을
// localStorage 안에서 흉내 낸다: 예산 잠금(잔액 → 잠금) → 리딤(잠금 → 회원 잔액) → 종료(잔여 반환).
// Σ(잔액 + 잠금) 은 어떤 단계에서도 변하지 않는다 (기획서 §2, 2026-09-06 CEO 결정).
// 디바이스 간 초대는 데모에서 본질적으로 불가하므로, 시드 캠페인 2건을 두고 같은 브라우저 안에서만 동작.

export interface DemoCampaign {
  id: string; // = code
  code: string;
  ownerEmail: string;
  kind: RewardKind;
  unitAmount: number;
  headcount: number;
  budgetLocked: number;
  budgetPaid: number;
  budgetRefunded: number;
  paidCount: number;
  channels: RewardChannel[];
  copy: string;
  status: CampaignStatus;
  createdAt: number;
  dailyCap?: number;
  rejectReason?: string;
  endReason?: string;
  reviewedAt?: number;
  endedAt?: number;
}

const CAMPAIGNS_KEY = "daland-demo-reward-campaigns";
const PAYOUTS_KEY = "daland-demo-reward-payouts"; // { [inviteeEmail]: campaignId | DemoPayout }

export interface DemoPayout {
  campaignId: string;
  amount: number;
  paidAt: number;
}
const LOCKED_KEY = (email: string) => `daland-demo-locked-${email}`;

/** 시드 광고주 (데모 전용 계정, 잔액은 getBalance 로 100만P 자동 시드) */
export const DEMO_ADVERTISER_EMAIL = "advertiser@daland.demo";

const SEED_CAMPAIGNS: DemoCampaign[] = [
  {
    id: "DEMO2026",
    code: "DEMO2026",
    ownerEmail: DEMO_ADVERTISER_EMAIL,
    kind: "new_member",
    unitAmount: 10_000,
    headcount: 10,
    budgetLocked: 100_000,
    budgetPaid: 0,
    budgetRefunded: 0,
    paidCount: 0,
    channels: ["kakao", "instagram"],
    copy: "다랜드 가입하면 10,000P 드려요",
    status: "live",
    createdAt: 1_757_116_800_000, // 2026-09-06
  },
  {
    id: "DEMOWAIT",
    code: "DEMOWAIT",
    ownerEmail: DEMO_ADVERTISER_EMAIL,
    kind: "new_member",
    unitAmount: 100_000,
    headcount: 2,
    budgetLocked: 200_000,
    budgetPaid: 0,
    budgetRefunded: 0,
    paidCount: 0,
    channels: ["youtube"],
    copy: "승인 대기 중인 캠페인 (관리자 승인 전에는 지급 안 됨)",
    status: "pending_review",
    createdAt: 1_757_116_800_000,
  },
];

function readCampaigns(): DemoCampaign[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(CAMPAIGNS_KEY);
    if (raw) return JSON.parse(raw) as DemoCampaign[];
    // 최초 접근: 시드 + 시드 광고주 잠금액 반영 (잔액 100만 − 30만 = 70만, 잠금 30만)
    const seedLocked = SEED_CAMPAIGNS.reduce((s, c) => s + c.budgetLocked, 0);
    const advBalance = getBalance({ email: DEMO_ADVERTISER_EMAIL });
    localStorage.setItem(BAL_KEY(DEMO_ADVERTISER_EMAIL), String(advBalance - seedLocked));
    localStorage.setItem(LOCKED_KEY(DEMO_ADVERTISER_EMAIL), String(seedLocked));
    localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(SEED_CAMPAIGNS));
    seedAdvertiserTransactions();
    return SEED_CAMPAIGNS.map((c) => ({ ...c }));
  } catch {
    return [];
  }
}

function writeCampaigns(list: DemoCampaign[]) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(list));
  } catch {
    // quota 초과 등 무시
  }
}

function readPayouts(): Record<string, DemoPayout> {
  if (!isBrowser()) return {};
  try {
    const raw = localStorage.getItem(PAYOUTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string | DemoPayout>;
    const out: Record<string, DemoPayout> = {};
    for (const [email, v] of Object.entries(parsed)) {
      // 구 형식(문자열 campaignId)은 금액·시각을 모른다 → 0 / 0 으로 읽고 새 저장 때 객체로 승격
      out[email] = typeof v === "string" ? { campaignId: v, amount: 0, paidAt: 0 } : v;
    }
    return out;
  } catch {
    return {};
  }
}

/** 잠금(에스크로) 잔액 */
export function getLockedBalance(user: { email?: string | null } | null | undefined): number {
  if (!isBrowser()) return 0;
  const key = emailKey(user);
  if (!key) return 0;
  readCampaigns(); // 시드 보장
  const n = parseInt(localStorage.getItem(LOCKED_KEY(key)) || "0", 10);
  return Number.isFinite(n) ? n : 0;
}

function setLocked(email: string, value: number) {
  localStorage.setItem(LOCKED_KEY(email), String(value));
}

/** 전체 캠페인 (관리자 데모용) / 내 캠페인 */
export function getCampaigns(user?: { email?: string | null } | null): DemoCampaign[] {
  const all = readCampaigns();
  const key = emailKey(user);
  return key ? all.filter((c) => c.ownerEmail === key) : all;
}

function makeDemoCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export type DemoRewardError =
  | "INSUFFICIENT_BALANCE"
  | "NOT_FOUND"
  | "ALREADY_REDEEMED"
  | "SELF_INVITE"
  | "CAMPAIGN_NOT_ACTIVE"
  | "BUDGET_EXHAUSTED"
  | "INVALID_STATE";

/** 캠페인 제출 = 예산 잠금 (잔액 → 잠금). 실서버 createCampaign 과 동일 규칙. */
export function createCampaign(
  user: { email?: string | null },
  input: { kind: RewardKind; unitAmount: number; headcount: number; channels: RewardChannel[]; copy: string },
): { ok: true; campaign: DemoCampaign } | { ok: false; error: DemoRewardError } {
  if (!isBrowser()) return { ok: false, error: "INVALID_STATE" };
  const key = emailKey(user);
  if (!key) return { ok: false, error: "INVALID_STATE" };
  const budget = lockAmount(input.unitAmount, input.headcount);
  const balance = getBalance(user);
  if (balance < budget) return { ok: false, error: "INSUFFICIENT_BALANCE" };

  const list = readCampaigns();
  let code = makeDemoCode();
  while (list.some((c) => c.id === code)) code = makeDemoCode();
  const campaign: DemoCampaign = {
    id: code,
    code,
    ownerEmail: key,
    kind: input.kind,
    unitAmount: input.unitAmount,
    headcount: input.headcount,
    budgetLocked: budget,
    budgetPaid: 0,
    budgetRefunded: 0,
    paidCount: 0,
    channels: input.channels,
    copy: input.copy,
    status: "pending_review",
    createdAt: Date.now(),
  };
  localStorage.setItem(BAL_KEY(key), String(balance - budget));
  setLocked(key, getLockedBalance(user) + budget);
  list.unshift(campaign);
  writeCampaigns(list);
  return { ok: true, campaign };
}

/** 리딤 = 광고주 잠금 → 회원 잔액. 1인 1회, 자기 코드 거부, live/approved 만. */
export function redeemCampaign(
  user: { email?: string | null },
  codeInput: string,
): { ok: true; amount: number; newBalance: number } | { ok: false; error: DemoRewardError } {
  if (!isBrowser()) return { ok: false, error: "INVALID_STATE" };
  const key = emailKey(user);
  if (!key) return { ok: false, error: "INVALID_STATE" };
  const code = (codeInput || "").trim().toUpperCase();
  const payouts = readPayouts();
  if (payouts[key]) return { ok: false, error: "ALREADY_REDEEMED" };
  const list = readCampaigns();
  const c = list.find((x) => x.id === code);
  if (!c) return { ok: false, error: "NOT_FOUND" };
  if (c.ownerEmail === key) return { ok: false, error: "SELF_INVITE" };
  if (!canRedeem(c.status)) return { ok: false, error: "CAMPAIGN_NOT_ACTIVE" };
  if (remainingBudget(c) < c.unitAmount) return { ok: false, error: "BUDGET_EXHAUSTED" };
  const ownerLocked = getLockedBalance({ email: c.ownerEmail });
  if (ownerLocked < c.unitAmount) return { ok: false, error: "INVALID_STATE" };

  setLocked(c.ownerEmail, ownerLocked - c.unitAmount);
  const newBalance = getBalance(user) + c.unitAmount;
  localStorage.setItem(BAL_KEY(key), String(newBalance));
  c.budgetPaid += c.unitAmount;
  c.paidCount += 1;
  c.status = statusAfterPayout(c, c.unitAmount, c.status);
  writeCampaigns(list);
  payouts[key] = { campaignId: c.id, amount: c.unitAmount, paidAt: Date.now() };
  localStorage.setItem(PAYOUTS_KEY, JSON.stringify(payouts));
  return { ok: true, amount: c.unitAmount, newBalance };
}

/** 종료·거절 = 잔여 예산을 광고주 잔액으로 반환. 승인·정지·재개는 상태만. */
export function setCampaignStatus(
  campaignId: string,
  next: CampaignStatus,
): { ok: true; refunded: number } | { ok: false; error: DemoRewardError } {
  if (!isBrowser()) return { ok: false, error: "INVALID_STATE" };
  const list = readCampaigns();
  const c = list.find((x) => x.id === campaignId);
  if (!c) return { ok: false, error: "NOT_FOUND" };
  if (c.status === "ended" || c.status === "rejected") return { ok: false, error: "INVALID_STATE" };
  let refunded = 0;
  if (next === "ended" || next === "rejected") {
    refunded = remainingBudget(c);
    if (refunded > 0) {
      const ownerLocked = getLockedBalance({ email: c.ownerEmail });
      if (ownerLocked < refunded) return { ok: false, error: "INVALID_STATE" };
      setLocked(c.ownerEmail, ownerLocked - refunded);
      localStorage.setItem(BAL_KEY(c.ownerEmail), String(getBalance({ email: c.ownerEmail }) + refunded));
      c.budgetRefunded += refunded;
    }
  }
  c.status = next;
  writeCampaigns(list);
  return { ok: true, refunded };
}


// --- 관리자 데모 (admin/* 화면이 Firebase 없이도 동작하도록) ---

/** 시드 광고주 지출 2건 — 잔액 규칙(−amount +120%)을 그대로 태워 총량 정합이 맞게 한다 */
function seedAdvertiserTransactions() {
  const adv = { email: DEMO_ADVERTISER_EMAIL, displayName: "데모 광고주" };
  if (getTransactions(adv).length > 0) return;
  const base = 1_757_116_800_000; // 2026-09-06
  const seeds: Array<{ category: string; categoryName: string; amount: number; memo: string; at: number }> = [
    { category: "rent", categoryName: "임대료", amount: 50_000, memo: "9월 임대료 (데모)", at: base - 3 * 3_600_000 },
    { category: "utilities", categoryName: "공과금", amount: 30_000, memo: "전기요금 (데모)", at: base - 3_600_000 },
  ];
  for (const sd of seeds) {
    const bonus = Math.round(sd.amount * 0.2);
    const rec = saveTransaction(adv, {
      category: sd.category,
      categoryName: sd.categoryName,
      storeName: sd.memo,
      amount: sd.amount,
      memo: sd.memo,
      totalAccumulation: sd.amount + bonus,
      nonlinearResult: {
        principal: sd.amount,
        bonus,
        totalAccumulation: sd.amount + bonus,
        rate: 1.2,
        memberCount: 1,
        perMemberAmount: sd.amount + bonus,
        advertiserReward: 0,
      },
    });
    if (rec) {
      // 시각을 시드 기준으로 되돌린다 (saveTransaction 은 Date.now 를 쓴다)
      try {
        const raw = localStorage.getItem(TX_KEY(DEMO_ADVERTISER_EMAIL));
        const list: DemoTransaction[] = raw ? JSON.parse(raw) : [];
        const found = list.find((t) => t.id === rec.id);
        if (found) found.createdAt = sd.at;
        localStorage.setItem(TX_KEY(DEMO_ADVERTISER_EMAIL), JSON.stringify(list));
      } catch {
        // 무시
      }
    }
  }
}

export interface DemoUserRow {
  email: string;
  name: string;
  balance: number;
  locked: number;
  txCount: number;
  isAdvertiser: boolean;
}

/** 브라우저에 잔액 키가 있는 모든 데모 회원 */
export function getDemoUsers(): DemoUserRow[] {
  if (!isBrowser()) return [];
  const campaigns = readCampaigns(); // 시드 보장
  const rows: DemoUserRow[] = [];
  let currentName = "";
  let currentEmail = "";
  try {
    const saved = localStorage.getItem("daland-demo-user");
    if (saved) {
      const parsed = JSON.parse(saved) as { displayName?: string; email?: string };
      currentName = parsed.displayName || "";
      currentEmail = (parsed.email || "").toLowerCase();
    }
  } catch {
    // 무시
  }
  const owners = new Set(campaigns.map((c) => c.ownerEmail));
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith("daland-demo-balance-")) continue;
    const email = k.slice("daland-demo-balance-".length);
    const u = { email };
    rows.push({
      email,
      name: email === DEMO_ADVERTISER_EMAIL ? "데모 광고주" : email === currentEmail ? currentName : "",
      balance: getBalance(u),
      locked: getLockedBalance(u),
      txCount: getTransactions(u).length,
      isAdvertiser: owners.has(email),
    });
  }
  return rows.sort((a, b) => a.email.localeCompare(b.email));
}

/** 모든 데모 회원의 거래 (최신순) */
export function getAllDemoTransactions(): DemoTransaction[] {
  const all: DemoTransaction[] = [];
  for (const u of getDemoUsers()) all.push(...getTransactions({ email: u.email }));
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

/** 캠페인별 지급내역 (관리자 드로어) */
export function getDemoPayoutsForCampaign(campaignId: string): Array<{ email: string; amount: number; paidAt: number }> {
  const payouts = readPayouts();
  const c = readCampaigns().find((x) => x.id === campaignId);
  return Object.entries(payouts)
    .filter(([, p]) => p.campaignId === campaignId)
    .map(([email, p]) => ({ email, amount: p.amount || c?.unitAmount || 0, paidAt: p.paidAt }))
    .sort((a, b) => b.paidAt - a.paidAt);
}

/** 오늘(로컬 자정 이후) 지급 합계·건수 */
export function getDemoTodayPayouts(): { amount: number; count: number } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  let amount = 0;
  let count = 0;
  for (const p of Object.values(readPayouts())) {
    if (p.paidAt >= start.getTime()) {
      amount += p.amount;
      count += 1;
    }
  }
  return { amount, count };
}

/** 데모 출금 누적 (deductBalance 기록) */
export function getDemoWithdrawnTotal(): number {
  if (!isBrowser()) return 0;
  const n = parseInt(localStorage.getItem(WITHDRAWN_KEY) || "0", 10);
  return Number.isFinite(n) ? n : 0;
}

/** 관리자 액션 (승인·거절·정지·재개·종료) — 실서버 applyAdminAction 과 같은 전이표·반환 규칙 */
export function adminCampaignAction(
  campaignId: string,
  action: AdminAction,
  reason?: string,
): { ok: true; from: CampaignStatus; to: CampaignStatus; refunded: number } | { ok: false; error: DemoRewardError } {
  const list = readCampaigns();
  const c = list.find((x) => x.id === campaignId);
  if (!c) return { ok: false, error: "NOT_FOUND" };
  const from = c.status;
  const to = nextStatus(from, action);
  if (!to) return { ok: false, error: "INVALID_STATE" };
  const r = setCampaignStatus(campaignId, to);
  if (!r.ok) return r;
  // setCampaignStatus 가 저장한 목록을 다시 읽어 사유·시각을 덧붙인다
  const after = readCampaigns();
  const saved = after.find((x) => x.id === campaignId);
  if (saved) {
    saved.reviewedAt = Date.now();
    if (to === "rejected") saved.rejectReason = reason || "";
    if (to === "ended") {
      saved.endReason = reason || "";
      saved.endedAt = Date.now();
    }
    writeCampaigns(after);
  }
  return { ok: true, from, to, refunded: r.refunded };
}

/** 캠페인 일일 지급 상한 (데모는 저장만, 리딤 게이트는 실서버에만 있음) */
export function setDemoDailyCap(campaignId: string, dailyCap: number): boolean {
  const list = readCampaigns();
  const c = list.find((x) => x.id === campaignId);
  if (!c) return false;
  c.dailyCap = dailyCap;
  writeCampaigns(list);
  return true;
}
