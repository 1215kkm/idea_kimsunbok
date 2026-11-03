/**
 * 저장모드 — 통합 이용약관 제14조②
 *
 * 1,000원 미만 지출은 바로 적립하지 않고 모아 둔다(smallSpendPending).
 * 모인 금액이 1,000원 이상이 되는 지출에서 모인 금액 전체를 한 번에 비선형공식에 넣는다.
 * 지출 금액 자체는 저장 여부와 상관없이 매번 잔액에서 차감한다.
 */
export const STORE_MODE_THRESHOLD = 1_000;

export type StoreMode = "normal" | "stored" | "released";

export interface SmallSpendPlan {
  mode: StoreMode;
  /** 이번에 비선형공식에 넣을 금액 (stored 이면 0) */
  processAmount: number;
  /** 처리 후 남는 저장 금액 */
  nextPending: number;
}

export function planSmallSpend(pending: unknown, amount: number): SmallSpendPlan {
  const p = typeof pending === "number" && Number.isFinite(pending) && pending > 0 ? Math.floor(pending) : 0;
  if (amount >= STORE_MODE_THRESHOLD) return { mode: "normal", processAmount: amount, nextPending: p };
  const total = p + amount;
  if (total < STORE_MODE_THRESHOLD) return { mode: "stored", processAmount: 0, nextPending: total };
  return { mode: "released", processAmount: total, nextPending: 0 };
}
