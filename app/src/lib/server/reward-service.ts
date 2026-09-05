/**
 * 리워드 캠페인 원장 서비스 (invite-service 대체, 기획서 §2·§4.2·§4.3, 강체크 사전 감사 2026-09-06 반영)
 *
 * 흐름:
 *  createCampaign   광고주 totalPoints −budget, lockedPoints +budget, 캠페인 pending_review  [reward_lock]
 *  redeemCampaign   광고주 lockedPoints −unit, 회원 totalPoints +unit                       [reward_out / reward_in]
 *  end/reject/cancel 광고주 lockedPoints −잔여, totalPoints +잔여                           [reward_refund]
 *
 * 모든 단계에서 Σ(totalPoints + lockedPoints) 는 변하지 않는다 (제로섬).
 * 모든 함수는 db.runTransaction 안에서 "읽기 전부 → 쓰기 전부" 순서를 지킨다 (Firestore 제약).
 *
 * 어뷰징 게이트 (redeem):
 *  - Firebase Auth email_verified === true (EMAIL_NOT_VERIFIED 403)
 *  - rewardPayouts/{uid} + inviteRedemptions/{uid} + rewardPayoutKeys/{sha256(정규화 이메일)} 셋 다 없어야 함 (ALREADY_REDEEMED 409)
 *  - 캠페인당 일일 지급 상한 dailyCap (DAILY_CAP_REACHED 429)
 *
 * 캠페인 문서 ID = 8자 코드 (조회·유일성 보장을 한 번에). `code` 필드도 같은 값으로 중복 저장.
 */
import { createHash, randomBytes } from "crypto";
import { FieldValue, type Transaction, type DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import { ApiError } from "./api-error";
import {
  ADMIN_TRANSITIONS,
  ADVERTISER_MIN_DEPOSIT,
  DEFAULT_DAILY_CAP,
  MAX_COPY_LENGTH,
  REASON_REQUIRED_ACTIONS,
  canRedeem,
  isValidChannels,
  isValidDailyCap,
  isValidHeadcount,
  isValidKind,
  isValidUnitAmount,
  lockAmount,
  nextStatus,
  normalizeEmail,
  remainingBudget,
  seoulDateKey,
  statusAfterPayout,
  type AdminAction,
  type CampaignStatus,
  type RewardChannel,
  type RewardKind,
} from "@/lib/reward-ledger";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // I, O, 0, 1 제외
const CODE_LENGTH = 8;
const CODE_RE = /^[A-Z0-9]{8}$/;
// 제어문자 제거 (개행·탭은 광고 문구에 허용)
const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function makeCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

export function emailPayoutKey(email: string): string {
  return createHash("sha256").update(normalizeEmail(email)).digest("hex");
}

export interface CreateCampaignInput {
  kind: RewardKind;
  unitAmount: number;
  headcount: number;
  channels: RewardChannel[];
  copy: string;
}

/** 리딤 요청자 — requireAuth 결과를 그대로 넘긴다 (email_verified 는 ID 토큰 클레임) */
export interface Invitee {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

export interface CampaignDoc {
  ownerUid: string;
  kind: RewardKind;
  unitAmount: number;
  headcount: number;
  budgetLocked: number;
  budgetPaid: number;
  budgetRefunded: number;
  paidCount: number;
  dailyCap: number;
  dailyPaid: { date: string; count: number };
  channels: RewardChannel[];
  copy: string;
  status: CampaignStatus;
  code: string;
  rejectReason?: string;
  endReason?: string;
  createdAt: unknown;
  submittedAt: unknown;
  reviewedAt?: unknown;
  reviewedBy?: string;
  endedAt?: unknown;
}

export interface CampaignView {
  id: string;
  code: string;
  ownerUid: string;
  kind: RewardKind;
  unitAmount: number;
  headcount: number;
  budgetLocked: number;
  budgetPaid: number;
  budgetRefunded: number;
  budgetRemaining: number;
  paidCount: number;
  dailyCap: number;
  channels: RewardChannel[];
  copy: string;
  status: CampaignStatus;
  rejectReason: string | null;
  endReason: string | null;
  createdAt: number | null;
  reviewedAt: number | null;
  reviewedBy: string | null;
  endedAt: number | null;
}

function millis(v: unknown): number | null {
  if (!v) return null;
  if (typeof v === "number") return v;
  const t = v as { toMillis?: () => number };
  return typeof t.toMillis === "function" ? t.toMillis() : null;
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function toCampaignView(id: string, d: Partial<CampaignDoc>): CampaignView {
  const budget = {
    budgetLocked: num(d.budgetLocked),
    budgetPaid: num(d.budgetPaid),
    budgetRefunded: num(d.budgetRefunded),
  };
  return {
    id,
    code: d.code || id,
    ownerUid: d.ownerUid || "",
    kind: d.kind || "new_member",
    unitAmount: num(d.unitAmount),
    headcount: num(d.headcount),
    ...budget,
    budgetRemaining: remainingBudget(budget),
    paidCount: num(d.paidCount),
    dailyCap: num(d.dailyCap) || DEFAULT_DAILY_CAP,
    channels: d.channels || [],
    copy: d.copy || "",
    status: d.status || "draft",
    rejectReason: d.rejectReason ?? null,
    endReason: d.endReason ?? null,
    createdAt: millis(d.createdAt),
    reviewedAt: millis(d.reviewedAt),
    reviewedBy: d.reviewedBy ?? null,
    endedAt: millis(d.endedAt),
  };
}

function sanitizeCopy(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.replace(CONTROL_CHARS_RE, "").trim().slice(0, MAX_COPY_LENGTH);
}

export function validateCreateInput(raw: Record<string, unknown>): CreateCampaignInput {
  if (!isValidKind(raw.kind)) {
    throw new ApiError("INVALID_INPUT", "kind must be new_member | existing_db", 400, { field: "kind" });
  }
  if (!isValidUnitAmount(raw.unitAmount)) {
    throw new ApiError("INVALID_INPUT", "unitAmount must be 10,000 / 100,000 / 1,000,000 / 10,000,000", 400, {
      field: "unitAmount",
    });
  }
  if (!isValidHeadcount(raw.headcount)) {
    throw new ApiError("INVALID_INPUT", "headcount out of range", 400, { field: "headcount" });
  }
  if (!isValidChannels(raw.channels)) {
    throw new ApiError("INVALID_INPUT", "channels must be a non-empty unique list", 400, { field: "channels" });
  }
  const copy = sanitizeCopy(raw.copy);
  if (copy.length === 0) {
    throw new ApiError("INVALID_INPUT", "copy is required", 400, { field: "copy" });
  }
  return { kind: raw.kind, unitAmount: raw.unitAmount, headcount: raw.headcount, channels: raw.channels, copy };
}

function budgetOf(c: Partial<CampaignDoc>) {
  return { budgetLocked: num(c.budgetLocked), budgetPaid: num(c.budgetPaid), budgetRefunded: num(c.budgetRefunded) };
}

// ---------------------------------------------------------------------------
// 광고주 자격 — 확인된 입금 누적 ≥ 100,000P
// 현재 /api/deposit 은 transactions {type:"deposit", amount} 를 남기고 즉시 잔액 반영(beta_virtual)한다.
// "확인됨" 상태 필드가 아직 없으므로 deposit 거래 전부를 확인된 입금으로 본다 (P1 입금확인 도입 시 status 필터 추가).
// 베타 초기 지급금(users.betaTestFunds)은 입금이 아니므로 자격에 포함하지 않는다.
// ---------------------------------------------------------------------------

export async function getConfirmedDepositTotal(uid: string): Promise<number> {
  const snap = await adminDb()
    .collection("transactions")
    .where("consumerId", "==", uid)
    .where("type", "==", "deposit")
    .select("amount")
    .get();
  let sum = 0;
  snap.forEach((d) => {
    sum += num(d.data().amount);
  });
  return sum;
}

// ---------------------------------------------------------------------------
// 생성 (예산 잠금)
// ---------------------------------------------------------------------------

export async function createCampaign(
  ownerUid: string,
  input: CreateCampaignInput,
): Promise<{ id: string; code: string; budgetLocked: number; newBalance: number; lockedPoints: number }> {
  const budget = lockAmount(input.unitAmount, input.headcount);
  const db = adminDb();
  const ownerRef = db.collection("users").doc(ownerUid);

  // 자격 검사는 트랜잭션 밖 (입금 합계는 줄어들지 않으므로 사전 검사로 충분)
  const depositTotal = await getConfirmedDepositTotal(ownerUid);
  if (depositTotal < ADVERTISER_MIN_DEPOSIT) {
    throw new ApiError(
      "INSUFFICIENT_QUALIFICATION",
      `광고주 자격은 확인된 입금 누적 ${ADVERTISER_MIN_DEPOSIT.toLocaleString()}P 이상입니다.`,
      403,
      { required: ADVERTISER_MIN_DEPOSIT, depositTotal },
    );
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode();
    const campaignRef = db.collection("rewardCampaigns").doc(code);
    try {
      return await db.runTransaction(async (tx: Transaction) => {
        // --- 읽기 ---
        const [campaignSnap, ownerSnap] = await Promise.all([tx.get(campaignRef), tx.get(ownerRef)]);
        if (campaignSnap.exists) throw new ApiError("CONFLICT", "Code collision", 409);
        if (!ownerSnap.exists) throw new ApiError("NOT_FOUND", "User not found", 404);
        const owner = ownerSnap.data()!;
        const totalPoints = num(owner.totalPoints);
        const lockedPoints = num(owner.lockedPoints);
        if (totalPoints < budget) {
          throw new ApiError("INSUFFICIENT_BALANCE", "잔액이 부족합니다. 예산만큼 입금 후 다시 제출해 주세요.", 409, {
            required: budget,
            current: totalPoints,
          });
        }
        // --- 쓰기 ---
        const nextTotal = totalPoints - budget;
        const nextLocked = lockedPoints + budget;
        tx.update(ownerRef, { totalPoints: nextTotal, lockedPoints: nextLocked });
        const doc: CampaignDoc = {
          ownerUid,
          kind: input.kind,
          unitAmount: input.unitAmount,
          headcount: input.headcount,
          budgetLocked: budget,
          budgetPaid: 0,
          budgetRefunded: 0,
          paidCount: 0,
          dailyCap: DEFAULT_DAILY_CAP,
          dailyPaid: { date: "", count: 0 },
          channels: input.channels,
          copy: input.copy,
          status: "pending_review",
          code,
          createdAt: FieldValue.serverTimestamp(),
          submittedAt: FieldValue.serverTimestamp(),
        };
        tx.create(campaignRef, doc);
        tx.create(db.collection("transactions").doc(), {
          consumerId: ownerUid,
          type: "reward_lock",
          amount: budget,
          totalAccumulation: -budget,
          lockedDelta: budget,
          campaignId: code,
          createdAt: FieldValue.serverTimestamp(),
        });
        return { id: code, code, budgetLocked: budget, newBalance: nextTotal, lockedPoints: nextLocked };
      });
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFLICT") continue;
      throw err;
    }
  }
  throw new ApiError("INTERNAL", "Failed to generate unique campaign code", 500);
}

// ---------------------------------------------------------------------------
// 리딤 (지급)
// ---------------------------------------------------------------------------

export async function redeemCampaignCode(
  invitee: Invitee,
  codeInput: string,
  now: number = Date.now(),
): Promise<{ campaignId: string; ownerUid: string; amount: number; newBalance: number; campaignStatus: CampaignStatus }> {
  const code = typeof codeInput === "string" ? codeInput.trim().toUpperCase() : "";
  if (!CODE_RE.test(code)) {
    throw new ApiError("INVALID_INPUT", "Invalid campaign code format", 400, { field: "code" });
  }
  if (!invitee.emailVerified || !invitee.email) {
    throw new ApiError("EMAIL_NOT_VERIFIED", "이메일 인증을 완료해야 가입 리워드를 받을 수 있습니다.", 403);
  }
  const inviteeUid = invitee.uid;
  const emailKey = emailPayoutKey(invitee.email);
  const today = seoulDateKey(now);

  const db = adminDb();
  const campaignRef = db.collection("rewardCampaigns").doc(code);
  const payoutRef = db.collection("rewardPayouts").doc(inviteeUid);
  const legacyRef = db.collection("inviteRedemptions").doc(inviteeUid);
  const emailKeyRef = db.collection("rewardPayoutKeys").doc(emailKey);
  const inviteeRef = db.collection("users").doc(inviteeUid);

  return await db.runTransaction(async (tx: Transaction) => {
    // --- 읽기 (전부) ---
    const [campaignSnap, payoutSnap, legacySnap, emailKeySnap, inviteeSnap] = await Promise.all([
      tx.get(campaignRef),
      tx.get(payoutRef),
      tx.get(legacyRef),
      tx.get(emailKeyRef),
      tx.get(inviteeRef),
    ]);
    if (payoutSnap.exists || legacySnap.exists || emailKeySnap.exists) {
      throw new ApiError("ALREADY_REDEEMED", "가입 리워드는 1인 1회만 받을 수 있습니다.", 409);
    }
    if (!campaignSnap.exists) throw new ApiError("NOT_FOUND", "Campaign code not found", 404);
    const c = campaignSnap.data() as CampaignDoc;
    if (c.ownerUid === inviteeUid) {
      throw new ApiError("SELF_INVITE", "본인 캠페인 코드는 사용할 수 없습니다.", 400);
    }
    if (!canRedeem(c.status)) {
      throw new ApiError("CAMPAIGN_NOT_ACTIVE", `캠페인이 지급 가능 상태가 아닙니다 (${c.status}).`, 409, {
        status: c.status,
      });
    }
    const unit = num(c.unitAmount);
    const budget = budgetOf(c);
    if (unit <= 0 || remainingBudget(budget) < unit) {
      throw new ApiError("BUDGET_EXHAUSTED", "캠페인 예산이 소진되었습니다.", 409);
    }
    const dailyCap = num(c.dailyCap) || DEFAULT_DAILY_CAP;
    const dailyCount = c.dailyPaid && c.dailyPaid.date === today ? num(c.dailyPaid.count) : 0;
    if (dailyCount >= dailyCap) {
      throw new ApiError("DAILY_CAP_REACHED", "오늘 이 캠페인의 지급 한도에 도달했습니다. 내일 다시 시도해 주세요.", 429, {
        dailyCap,
        date: today,
      });
    }
    const ownerRef = db.collection("users").doc(c.ownerUid) as DocumentReference;
    const ownerSnap = await tx.get(ownerRef);
    if (!ownerSnap.exists) throw new ApiError("INTERNAL", "Campaign owner missing", 500);
    const ownerLocked = num(ownerSnap.data()!.lockedPoints);
    if (ownerLocked < unit) {
      // 원장이 어긋난 상태 — 지급하면 무에서 생성이 된다. 멈추고 기록.
      throw new ApiError("INVALID_STATE", "광고주 잠금 잔액이 캠페인 예산과 일치하지 않습니다.", 500, {
        ownerLocked,
        unit,
        campaignId: code,
      });
    }
    const inviteeTotal = inviteeSnap.exists ? num(inviteeSnap.data()!.totalPoints) : 0;

    // --- 쓰기 (전부) ---
    const paidBudget = { ...budget, budgetPaid: budget.budgetPaid + unit };
    const nextStatusValue = statusAfterPayout(paidBudget, unit, c.status);
    const nextInviteeTotal = inviteeTotal + unit;

    tx.update(ownerRef, { lockedPoints: ownerLocked - unit });
    if (inviteeSnap.exists) {
      tx.update(inviteeRef, { totalPoints: nextInviteeTotal });
    } else {
      tx.set(
        inviteeRef,
        { totalPoints: nextInviteeTotal, lockedPoints: 0, createdAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
    }
    const campaignUpdate: Record<string, unknown> = {
      budgetPaid: paidBudget.budgetPaid,
      paidCount: num(c.paidCount) + 1,
      dailyPaid: { date: today, count: dailyCount + 1 },
      status: nextStatusValue,
    };
    if (nextStatusValue === "ended") {
      campaignUpdate.endedAt = FieldValue.serverTimestamp();
      campaignUpdate.endReason = "headcount_reached";
    }
    tx.update(campaignRef, campaignUpdate);

    const txOutRef = db.collection("transactions").doc();
    const txInRef = db.collection("transactions").doc();
    tx.create(txOutRef, {
      consumerId: c.ownerUid,
      type: "reward_out",
      amount: unit,
      totalAccumulation: 0,
      lockedDelta: -unit,
      campaignId: code,
      inviteeUid,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.create(txInRef, {
      consumerId: inviteeUid,
      type: "reward_in",
      amount: unit,
      totalAccumulation: unit,
      campaignId: code,
      ownerUid: c.ownerUid,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.create(payoutRef, {
      campaignId: code,
      ownerUid: c.ownerUid,
      inviteeUid,
      amount: unit,
      condition: "signup+email_verified",
      status: "paid",
      paidAt: FieldValue.serverTimestamp(),
      txInRef: txInRef.id,
      txOutRef: txOutRef.id,
    });
    // 이메일 단위 1인 1회 키 — create 라서 동시 요청이 겹쳐도 하나만 성공
    tx.create(emailKeyRef, { inviteeUid, campaignId: code, paidAt: FieldValue.serverTimestamp() });

    return { campaignId: code, ownerUid: c.ownerUid, amount: unit, newBalance: nextInviteeTotal, campaignStatus: nextStatusValue };
  });
}

// ---------------------------------------------------------------------------
// 잔여 예산 반환 (end / reject / cancel 공통) — 트랜잭션 안에서 호출
// ---------------------------------------------------------------------------

interface RefundPlan {
  refund: number;
  ownerRef: DocumentReference | null;
  ownerTotal: number;
  ownerLocked: number;
}

async function readRefundPlan(
  db: FirebaseFirestore.Firestore,
  tx: Transaction,
  campaignId: string,
  c: CampaignDoc,
): Promise<RefundPlan> {
  const refund = remainingBudget(budgetOf(c));
  if (refund < 0) {
    throw new ApiError("INVALID_STATE", "Campaign budget is negative — ledger corrupted", 500, {
      campaignId,
      ...budgetOf(c),
    });
  }
  if (refund === 0) return { refund: 0, ownerRef: null, ownerTotal: 0, ownerLocked: 0 };
  const ownerRef = db.collection("users").doc(c.ownerUid);
  const ownerSnap = await tx.get(ownerRef);
  if (!ownerSnap.exists) throw new ApiError("INTERNAL", "Campaign owner missing", 500);
  const ownerTotal = num(ownerSnap.data()!.totalPoints);
  const ownerLocked = num(ownerSnap.data()!.lockedPoints);
  if (ownerLocked < refund) {
    throw new ApiError("INVALID_STATE", "광고주 잠금 잔액이 반환액보다 작습니다.", 500, { ownerLocked, refund, campaignId });
  }
  return { refund, ownerRef, ownerTotal, ownerLocked };
}

function writeRefund(
  db: FirebaseFirestore.Firestore,
  tx: Transaction,
  campaignId: string,
  ownerUid: string,
  plan: RefundPlan,
  reason: string,
) {
  if (plan.refund <= 0 || !plan.ownerRef) return;
  tx.update(plan.ownerRef, { totalPoints: plan.ownerTotal + plan.refund, lockedPoints: plan.ownerLocked - plan.refund });
  tx.create(db.collection("transactions").doc(), {
    consumerId: ownerUid,
    type: "reward_refund",
    amount: plan.refund,
    totalAccumulation: plan.refund,
    lockedDelta: -plan.refund,
    campaignId,
    reason,
    createdAt: FieldValue.serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// 관리자 감사 래퍼 — 모든 관리자 액션은 이 안에서 (강체크 감사 #4)
// fn 은 트랜잭션 안에서 읽기→쓰기를 수행하고 { before, after, result } 를 돌려준다.
// 래퍼가 같은 트랜잭션에 adminAuditLogs 1건을 마지막 쓰기로 넣는다.
// ---------------------------------------------------------------------------

export async function withAdminAudit<T>(
  adminUid: string,
  action: string,
  target: string,
  fn: (tx: Transaction, db: FirebaseFirestore.Firestore) => Promise<{ before: unknown; after: unknown; result: T }>,
  reason?: string,
): Promise<T> {
  const db = adminDb();
  return await db.runTransaction(async (tx: Transaction) => {
    const { before, after, result } = await fn(tx, db);
    tx.create(db.collection("adminAuditLogs").doc(), {
      adminUid,
      action,
      target,
      before,
      after,
      reason: reason ?? null,
      at: FieldValue.serverTimestamp(),
    });
    return result;
  });
}

export interface AdminActionResult {
  id: string;
  from: CampaignStatus;
  to: CampaignStatus;
  refunded: number;
}

function assertCampaignId(campaignId: string) {
  if (typeof campaignId !== "string" || !CODE_RE.test(campaignId)) {
    throw new ApiError("INVALID_INPUT", "Invalid campaignId", 400, { field: "campaignId" });
  }
}

export async function applyAdminAction(
  campaignId: string,
  action: AdminAction,
  adminUid: string,
  reason?: string,
): Promise<AdminActionResult> {
  assertCampaignId(campaignId);
  const trimmedReason = typeof reason === "string" ? reason.trim().slice(0, 200) : "";
  if (REASON_REQUIRED_ACTIONS.includes(action) && trimmedReason.length === 0) {
    throw new ApiError("INVALID_INPUT", `${action} requires a reason`, 400, { field: "reason" });
  }

  return await withAdminAudit<AdminActionResult>(
    adminUid,
    `reward_campaign.${action}`,
    `rewardCampaigns/${campaignId}`,
    async (tx, db) => {
      const campaignRef = db.collection("rewardCampaigns").doc(campaignId);
      // --- 읽기 ---
      const campaignSnap = await tx.get(campaignRef);
      if (!campaignSnap.exists) throw new ApiError("NOT_FOUND", "Campaign not found", 404);
      const c = campaignSnap.data() as CampaignDoc;
      const from = c.status;
      const to = nextStatus(from, action);
      if (!to) {
        throw new ApiError("INVALID_STATE", `Cannot ${action} a campaign in status ${from}`, 409, {
          status: from,
          allowed: ADMIN_TRANSITIONS[action].from,
        });
      }
      const terminal = to === "ended" || to === "rejected";
      const plan: RefundPlan = terminal
        ? await readRefundPlan(db, tx, campaignId, c)
        : { refund: 0, ownerRef: null, ownerTotal: 0, ownerLocked: 0 };

      // --- 쓰기 ---
      const update: Record<string, unknown> = {
        status: to,
        reviewedAt: FieldValue.serverTimestamp(),
        reviewedBy: adminUid,
      };
      if (to === "rejected") update.rejectReason = trimmedReason;
      if (to === "ended") update.endReason = trimmedReason;
      if (terminal) {
        update.endedAt = FieldValue.serverTimestamp();
        update.budgetRefunded = num(c.budgetRefunded) + plan.refund;
      }
      tx.update(campaignRef, update);
      writeRefund(db, tx, campaignId, c.ownerUid, plan, `admin_${action}`);

      const before = { status: from, ...budgetOf(c) };
      const after = { status: to, budgetRefunded: num(c.budgetRefunded) + plan.refund, refund: plan.refund };
      return { before, after, result: { id: campaignId, from, to, refunded: plan.refund } };
    },
    trimmedReason || undefined,
  );
}

export const approveCampaign = (id: string, adminUid: string) => applyAdminAction(id, "approve", adminUid);
export const rejectCampaign = (id: string, adminUid: string, reason: string) => applyAdminAction(id, "reject", adminUid, reason);
export const pauseCampaign = (id: string, adminUid: string) => applyAdminAction(id, "pause", adminUid);
export const resumeCampaign = (id: string, adminUid: string) => applyAdminAction(id, "resume", adminUid);
export const endCampaign = (id: string, adminUid: string, reason: string) => applyAdminAction(id, "end", adminUid, reason);

/** 캠페인별 일일 지급 상한 변경 (관리자) */
export async function setCampaignDailyCap(
  campaignId: string,
  adminUid: string,
  dailyCap: unknown,
): Promise<{ id: string; dailyCap: number }> {
  assertCampaignId(campaignId);
  if (!isValidDailyCap(dailyCap)) {
    throw new ApiError("INVALID_INPUT", "dailyCap must be an integer 1..10000", 400, { field: "dailyCap" });
  }
  return await withAdminAudit(adminUid, "reward_campaign.set_daily_cap", `rewardCampaigns/${campaignId}`, async (tx, db) => {
    const ref = db.collection("rewardCampaigns").doc(campaignId);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new ApiError("NOT_FOUND", "Campaign not found", 404);
    const c = snap.data() as CampaignDoc;
    tx.update(ref, { dailyCap });
    return {
      before: { dailyCap: num(c.dailyCap) || DEFAULT_DAILY_CAP },
      after: { dailyCap },
      result: { id: campaignId, dailyCap },
    };
  });
}

// ---------------------------------------------------------------------------
// 광고주 본인 취소 — 승인 전(pending_review | draft)만, 전액 반환
// ---------------------------------------------------------------------------

export async function cancelCampaign(
  ownerUid: string,
  campaignId: string,
): Promise<{ id: string; refunded: number; newBalance: number }> {
  assertCampaignId(campaignId);
  const db = adminDb();
  const campaignRef = db.collection("rewardCampaigns").doc(campaignId);

  return await db.runTransaction(async (tx: Transaction) => {
    // --- 읽기 ---
    const snap = await tx.get(campaignRef);
    if (!snap.exists) throw new ApiError("NOT_FOUND", "Campaign not found", 404);
    const c = snap.data() as CampaignDoc;
    if (c.ownerUid !== ownerUid) throw new ApiError("FORBIDDEN", "Not your campaign", 403);
    if (c.status !== "pending_review" && c.status !== "draft") {
      throw new ApiError("INVALID_STATE", `승인 전 캠페인만 취소할 수 있습니다 (현재 ${c.status}).`, 409, {
        status: c.status,
      });
    }
    const plan = await readRefundPlan(db, tx, campaignId, c);
    if (plan.refund !== num(c.budgetLocked)) {
      // 승인 전인데 지급이 있었다면 원장이 깨진 것
      throw new ApiError("INVALID_STATE", "승인 전 캠페인에 지급 기록이 있습니다.", 500, { campaignId, ...budgetOf(c) });
    }
    // --- 쓰기 ---
    tx.update(campaignRef, {
      status: "rejected",
      rejectReason: "owner_cancelled",
      endedAt: FieldValue.serverTimestamp(),
      budgetRefunded: num(c.budgetRefunded) + plan.refund,
    });
    writeRefund(db, tx, campaignId, ownerUid, plan, "owner_cancel");
    return { id: campaignId, refunded: plan.refund, newBalance: plan.ownerTotal + plan.refund };
  });
}

// ---------------------------------------------------------------------------
// 조회
// ---------------------------------------------------------------------------

export async function listCampaignsForOwner(ownerUid: string): Promise<CampaignView[]> {
  const snap = await adminDb()
    .collection("rewardCampaigns")
    .where("ownerUid", "==", ownerUid)
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  return snap.docs.map((d) => toCampaignView(d.id, d.data() as Partial<CampaignDoc>));
}

const ALL_STATUSES: CampaignStatus[] = ["draft", "pending_review", "approved", "live", "paused", "ended", "rejected"];

export async function listCampaignsForAdmin(status: string | null): Promise<CampaignView[]> {
  const db = adminDb();
  let q: FirebaseFirestore.Query = db.collection("rewardCampaigns");
  if (status && status !== "all") {
    if (!(ALL_STATUSES as string[]).includes(status)) return [];
    q = q.where("status", "==", status);
  }
  const snap = await q.orderBy("createdAt", "desc").limit(200).get();
  return snap.docs.map((d) => toCampaignView(d.id, d.data() as Partial<CampaignDoc>));
}

/** 가입 화면 배너용 — 코드가 지급 가능한지, 얼마인지 (금액은 서버가 말한다) */
export async function getCampaignPublicInfo(
  codeInput: string,
): Promise<{ code: string; amount: number; status: CampaignStatus; redeemable: boolean }> {
  const code = (codeInput || "").trim().toUpperCase();
  if (!CODE_RE.test(code)) throw new ApiError("INVALID_INPUT", "Invalid code format", 400, { field: "code" });
  const snap = await adminDb().collection("rewardCampaigns").doc(code).get();
  if (!snap.exists) throw new ApiError("NOT_FOUND", "Campaign code not found", 404);
  const c = snap.data() as CampaignDoc;
  const redeemable = canRedeem(c.status) && remainingBudget(budgetOf(c)) >= num(c.unitAmount);
  return { code, amount: num(c.unitAmount), status: c.status, redeemable };
}
