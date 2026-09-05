/**
 * 리워드 원장 — 순수 계산 헬퍼 (서버·클라이언트·테스트 공용, I/O 없음)
 *
 * 원칙 (기획서 docs/admin-reward-plan.md §2, CEO 확정 2026-09-06):
 *  1. 무에서 포인트 생성 금지.
 *  2. 리워드 = 광고주 잔액 → 신규회원 잔액 100% 제로섬 이전. 에스크로(캠페인 잠금)를 거친다.
 *  3. 광고주에게 되돌아가는 포인트 없음. 광고주가 얻는 건 "회원 N명".
 *
 * 잔액 모델:
 *  - users.totalPoints  = 쓸 수 있는 잔액
 *  - users.lockedPoints = 캠페인 에스크로에 잠긴 금액 (총량 모니터 좌변 = totalPoints + lockedPoints)
 *  - 캠페인 잔여 = budgetLocked − budgetPaid − budgetRefunded
 */

export const REWARD_UNIT_AMOUNTS = [10_000, 100_000, 1_000_000, 10_000_000] as const;
export type RewardUnitAmount = (typeof REWARD_UNIT_AMOUNTS)[number];

export const REWARD_CHANNELS = ["youtube", "kakao", "instagram", "naver", "facebook", "other"] as const;
export type RewardChannel = (typeof REWARD_CHANNELS)[number];

export const REWARD_KINDS = ["new_member", "existing_db"] as const;
export type RewardKind = (typeof REWARD_KINDS)[number];

export const MIN_HEADCOUNT = 1;
export const MAX_HEADCOUNT = 10_000;
export const MAX_COPY_LENGTH = 500;

/** 캠페인당 하루 지급 상한 기본값 (어뷰징 완충, 관리자가 캠페인별로 변경 가능) */
export const DEFAULT_DAILY_CAP = 10;
export const MAX_DAILY_CAP = 10_000;

/** 광고주 자격: 확인된 입금 누적 (기획서 §1-Q2 "입금 10만원 이상 회원") */
export const ADVERTISER_MIN_DEPOSIT = 100_000;

export function isValidDailyCap(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= MAX_DAILY_CAP;
}

/**
 * 이메일 정규화 (1인 1회를 이메일 단위로도 막기 위한 키 재료).
 *  - 전체 소문자, 앞뒤 공백 제거
 *  - gmail.com / googlemail.com: 로컬파트의 '.' 제거, '+태그' 제거, 도메인 gmail.com 으로 통일
 * 해시(sha256)는 서버(reward-service)에서 붙인다. 이 함수는 순수 문자열 처리만.
 */
export function normalizeEmail(raw: string): string {
  const email = (raw || "").trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at <= 0) return email;
  let local = email.slice(0, at);
  let domain = email.slice(at + 1);
  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") {
    const plus = local.indexOf("+");
    if (plus >= 0) local = local.slice(0, plus);
    local = local.replace(/\./g, "");
  }
  return `${local}@${domain}`;
}

/** 한국 시간 기준 날짜 키 (YYYY-MM-DD) — 일일 상한 경계 */
export function seoulDateKey(now: number = Date.now()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
}

export type CampaignStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "live"
  | "paused"
  | "ended"
  | "rejected";

export type AdminAction = "approve" | "reject" | "pause" | "resume" | "end";
/** reason 이 반드시 있어야 하는 액션 (강체크 감사 #4) */
export const REASON_REQUIRED_ACTIONS: readonly AdminAction[] = ["reject", "end"];

export interface CampaignBudget {
  budgetLocked: number;
  budgetPaid: number;
  budgetRefunded: number;
}

export function isValidUnitAmount(v: unknown): v is RewardUnitAmount {
  return typeof v === "number" && (REWARD_UNIT_AMOUNTS as readonly number[]).includes(v);
}

export function isValidHeadcount(v: unknown): v is number {
  return (
    typeof v === "number" && Number.isInteger(v) && v >= MIN_HEADCOUNT && v <= MAX_HEADCOUNT
  );
}

export function isValidKind(v: unknown): v is RewardKind {
  return typeof v === "string" && (REWARD_KINDS as readonly string[]).includes(v);
}

export function isValidChannels(v: unknown): v is RewardChannel[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.length <= REWARD_CHANNELS.length &&
    v.every((c) => typeof c === "string" && (REWARD_CHANNELS as readonly string[]).includes(c)) &&
    new Set(v).size === v.length
  );
}

export function isAdminAction(v: unknown): v is AdminAction {
  return v === "approve" || v === "reject" || v === "pause" || v === "resume" || v === "end";
}

/** 제출 시 광고주 잔액에서 잠그는 금액 = 1인당 × 모집 인원 */
export function lockAmount(unitAmount: number, headcount: number): number {
  if (!isValidUnitAmount(unitAmount)) {
    throw new RangeError(`unitAmount must be one of ${REWARD_UNIT_AMOUNTS.join(",")}`);
  }
  if (!isValidHeadcount(headcount)) {
    throw new RangeError(`headcount must be an integer in [${MIN_HEADCOUNT}, ${MAX_HEADCOUNT}]`);
  }
  return unitAmount * headcount;
}

/** 캠페인 잔여 예산. 음수가 나오면 원장이 깨진 것 — 호출부에서 반드시 검사. */
export function remainingBudget(b: CampaignBudget): number {
  return (b.budgetLocked || 0) - (b.budgetPaid || 0) - (b.budgetRefunded || 0);
}

/** 지급(리딤)이 허용되는 상태 */
export function canRedeem(status: CampaignStatus): boolean {
  return status === "approved" || status === "live";
}

/** 잔여 예산이 광고주에게 반환되어야 하는(더 이상 지급이 없는) 종료 상태 */
export function isTerminal(status: CampaignStatus): boolean {
  return status === "ended" || status === "rejected";
}

/**
 * 관리자 액션 상태 전이표.
 * P0에는 별도 "송출 시작" 단계가 없으므로 approve = live (즉시 지급 가능).
 * `approved` 는 스키마 호환용으로 남기고 canRedeem 에서 live 와 동일 취급.
 */
export const ADMIN_TRANSITIONS: Record<AdminAction, { from: CampaignStatus[]; to: CampaignStatus }> = {
  approve: { from: ["pending_review"], to: "live" },
  reject: { from: ["pending_review"], to: "rejected" },
  pause: { from: ["approved", "live"], to: "paused" },
  resume: { from: ["paused"], to: "live" },
  end: { from: ["approved", "live", "paused"], to: "ended" },
};

export function nextStatus(current: CampaignStatus, action: AdminAction): CampaignStatus | null {
  const t = ADMIN_TRANSITIONS[action];
  return t.from.includes(current) ? t.to : null;
}

/** 지급 후 예산이 1인분도 안 남으면 자동 종료 */
export function statusAfterPayout(b: CampaignBudget, unitAmount: number, current: CampaignStatus): CampaignStatus {
  return remainingBudget(b) < unitAmount ? "ended" : current;
}

/**
 * transactions.type 별 잔액 반영 규칙 (총량 정합 API 와 테스트가 같은 표를 본다)
 *  - totalDelta : users.totalPoints 변화
 *  - lockedDelta: users.lockedPoints 변화
 */
export const REWARD_TX_TYPES = ["reward_lock", "reward_out", "reward_in", "reward_refund"] as const;
export type RewardTxType = (typeof REWARD_TX_TYPES)[number];

export function rewardTxDeltas(type: RewardTxType, amount: number): { totalDelta: number; lockedDelta: number } {
  switch (type) {
    case "reward_lock":
      return { totalDelta: -amount, lockedDelta: +amount };
    case "reward_out":
      return { totalDelta: 0, lockedDelta: -amount };
    case "reward_in":
      return { totalDelta: +amount, lockedDelta: 0 };
    case "reward_refund":
      return { totalDelta: +amount, lockedDelta: -amount };
  }
}
