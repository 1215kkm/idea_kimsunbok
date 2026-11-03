/**
 * 출금 요청 (간단 화면 v2) — 실서버(/api/withdraw/request, 관리자 승인 대기) 또는 데모(바로 차감)
 */
import { isConfigured } from "@/lib/firebase";
import { apiPost, ApiClientError } from "@/lib/api-client";
import { deductBalance as deductDemoBalance } from "@/lib/demo-store";
import type { SavedAccount } from "@/lib/saved-accounts";

export const MIN_WITHDRAW_CLIENT = 1_000; // 서버 MIN_WITHDRAW 와 같다

/** 회원에게 보여줄 문구를 담은 오류 */
export class WithdrawError extends Error {}

export async function requestWithdraw(
  user: { email?: string | null },
  amount: number,
  account: SavedAccount,
): Promise<{ amount: number; newBalance: number; pending: boolean }> {
  if (!Number.isInteger(amount) || amount < MIN_WITHDRAW_CLIENT) {
    throw new WithdrawError(`${MIN_WITHDRAW_CLIENT.toLocaleString()}원부터 찾을 수 있어요.`);
  }
  if (!isConfigured) {
    const newBalance = deductDemoBalance(user, amount);
    return { amount, newBalance, pending: false };
  }
  try {
    const r = await apiPost<{ newBalance: number; amount: number }>("/api/withdraw/request", {
      amount,
      bankInfo: { bank: account.bankId, accountNumber: account.account, holder: account.holder },
    });
    return { amount: r.amount, newBalance: r.newBalance, pending: true };
  } catch (err) {
    if (err instanceof ApiClientError) {
      if (err.code === "INSUFFICIENT_BALANCE") throw new WithdrawError("잔액이 모자라요.");
      if (err.code === "INVALID_INPUT") throw new WithdrawError("계좌와 금액을 확인해 주세요.");
      if (err.code === "UNAUTHENTICATED") throw new WithdrawError("다시 로그인해 주세요.");
      throw new WithdrawError("출금 요청에 실패했어요.");
    }
    throw new WithdrawError("인터넷 연결을 확인해 주세요.");
  }
}
