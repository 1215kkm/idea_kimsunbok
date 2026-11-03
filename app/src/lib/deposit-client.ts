/**
 * 충전(입금) 요청 (화면 공용) — 실서버(/api/deposit) 또는 데모(localStorage)
 */
import { isConfigured, db } from "@/lib/firebase";
import { apiPost, ApiClientError } from "@/lib/api-client";
import { saveDeposit as saveDemoDeposit } from "@/lib/demo-store";
import { depositLimitError } from "@/lib/deposit-limits";
import type { MemberType } from "@/lib/business";

/** 회원에게 보여줄 문구를 담은 오류 */
export class DepositError extends Error {}

export async function registerDeposit(
  user: { email?: string | null },
  amount: number,
  memberType: MemberType,
): Promise<{ amount: number; newBalance: number }> {
  const limitError = depositLimitError(amount, memberType);
  if (limitError) throw new DepositError(limitError);
  if (!isConfigured || !db) {
    const r = saveDemoDeposit(user, amount);
    if (!r) throw new DepositError("데모 저장에 실패했습니다. 브라우저 저장소를 확인해 주세요.");
    return { amount, newBalance: r.newBalance };
  }
  try {
    const r = await apiPost<{ amount: number; newBalance: number }>("/api/deposit", { amount, method: "beta_virtual" });
    return { amount: r.amount, newBalance: r.newBalance };
  } catch (err) {
    if (err instanceof ApiClientError) throw new DepositError(err.message || "입금 처리에 실패했습니다.");
    throw new DepositError("네트워크 오류입니다.");
  }
}
