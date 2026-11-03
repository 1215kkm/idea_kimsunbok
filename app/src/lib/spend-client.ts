/**
 * 지출 등록 (화면 공용) — 실서버(/api/spend/register) 또는 데모(localStorage)
 *
 * 기존 화면(/stores)과 간단 화면(/v2/spend)이 같은 규칙으로 등록하도록 한 곳에 둔다.
 * 데모 계산은 실서버와 같다: 잔액 − 지출 + 120% 적립, 1,000원 미만은 저장모드.
 */
import { isConfigured } from "@/lib/firebase";
import { apiPost, ApiClientError } from "@/lib/api-client";
import { calculateNonlinear, calculateSplitCount, determineTier } from "@/lib/nonlinear-engine";
import {
  getBalance as getDemoBalance,
  getDemoSmallPending,
  saveTransaction as saveDemoTx,
  setDemoSmallPending,
} from "@/lib/demo-store";
import { planSmallSpend, type StoreMode } from "@/lib/small-spend";

export interface SpendInput {
  categoryId: string;
  categoryName: string;
  amount: number;
  memo?: string;
  /** 데모 기록에 메모가 없을 때 쓸 설명 */
  fallbackMemo?: string;
}

export interface SpendOutcome {
  earned: number;
  bonus: number;
  memberCount: number;
  perMemberAmount: number;
  advertiserReward: number;
  tierLevel: number;
  tierLabel: string;
  splitCount: number;
  storeMode: StoreMode;
  /** 아직 적립 전인 저장 금액 */
  smallSpendPending: number;
  newBalance: number | null;
}

/** 회원에게 보여줄 문구를 담은 오류 */
export class SpendError extends Error {}

interface ApiSpendResponse {
  totalAccumulation: number;
  bonus: number;
  memberCount: number;
  perMemberAmount: number;
  advertiserReward: number;
  tier?: { level: number; label: string };
  splitCount?: number;
  storeMode?: StoreMode;
  smallSpendPending?: number;
  newBalance?: number;
}

export async function registerSpend(user: { email?: string | null; displayName?: string | null }, input: SpendInput): Promise<SpendOutcome> {
  const memo = input.memo?.trim() || "";
  if (isConfigured) {
    try {
      const r = await apiPost<ApiSpendResponse>("/api/spend/register", {
        categoryId: input.categoryId,
        spendAmount: input.amount,
        memo,
      });
      return {
        earned: r.totalAccumulation,
        bonus: r.bonus,
        memberCount: r.memberCount,
        perMemberAmount: r.perMemberAmount,
        advertiserReward: r.advertiserReward,
        tierLevel: r.tier?.level ?? 4,
        tierLabel: r.tier?.label ?? "백만 단위",
        splitCount: r.splitCount || 1,
        storeMode: r.storeMode ?? "normal",
        smallSpendPending: r.smallSpendPending ?? 0,
        newBalance: typeof r.newBalance === "number" ? r.newBalance : null,
      };
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === "INSUFFICIENT_BALANCE") throw new SpendError("잔액이 부족합니다. 입금 후 다시 시도해 주세요.");
        if (err.code === "INVALID_INPUT") throw new SpendError("입력값이 올바르지 않습니다.");
        if (err.code === "UNAUTHENTICATED") throw new SpendError("다시 로그인해 주세요.");
        throw new SpendError("처리 중 오류가 발생했습니다.");
      }
      throw new SpendError("네트워크 오류입니다.");
    }
  }

  // 데모 모드: 클라이언트 계산 + localStorage 저장 (실서비스 영향 없음)
  const demoBalance = getDemoBalance(user);
  if (demoBalance < input.amount) {
    throw new SpendError(`잔액이 부족합니다. 데모 모드는 잔액(${demoBalance.toLocaleString()}P) 내에서 체험해 주세요.`);
  }
  const plan = planSmallSpend(getDemoSmallPending(user), input.amount);
  const nl = plan.processAmount > 0 ? calculateNonlinear(plan.processAmount) : null;
  const earned = nl?.totalAccumulation ?? 0;
  const saved = saveDemoTx(user, {
    category: input.categoryId,
    categoryName: input.categoryName,
    storeName: memo || input.categoryName,
    storeMode: plan.mode,
    amount: input.amount,
    memo: memo || input.fallbackMemo || "",
    totalAccumulation: earned,
    nonlinearResult: {
      principal: nl?.principal ?? 0,
      bonus: nl?.bonus ?? 0,
      totalAccumulation: earned,
      rate: nl?.rate ?? 0,
      memberCount: nl?.memberCount ?? 0,
      perMemberAmount: nl?.perMemberAmount ?? 0,
      advertiserReward: nl?.advertiser.advertiserReward ?? 0,
    },
  });
  if (!saved) throw new SpendError("데모 저장에 실패했습니다. 브라우저 저장소를 확인해 주세요.");
  setDemoSmallPending(user, plan.nextPending);
  const tier = determineTier(demoBalance); // 지출 전 잔액 기준 (실서버와 동일)
  return {
    earned,
    bonus: nl?.bonus ?? 0,
    memberCount: nl?.memberCount ?? 0,
    perMemberAmount: nl?.perMemberAmount ?? 0,
    advertiserReward: nl?.advertiser.advertiserReward ?? 0,
    tierLevel: tier.level,
    tierLabel: tier.label,
    splitCount: calculateSplitCount(input.amount, tier),
    storeMode: plan.mode,
    smallSpendPending: plan.nextPending,
    newBalance: getDemoBalance(user),
  };
}
