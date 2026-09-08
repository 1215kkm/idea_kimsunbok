import type { NextRequest } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { requireAdmin } from "@/lib/server/auth";
import { jsonError, jsonOk } from "@/lib/server/api-error";
import { rewardTxDeltas, REWARD_TX_TYPES, type RewardTxType } from "@/lib/reward-ledger";

export const runtime = "nodejs";

/**
 * 총량 정합 (기획서 §3.3 "총량 모니터", §8-6 "베타 조정")
 *
 * 좌변 = Σ users.totalPoints + Σ users.lockedPoints           (지금 장부에 있는 포인트)
 * 우변 = Σ transactions 가 만든 잔액 변화 + 베타 초기 지급금     (포인트가 어디서 왔는지)
 *
 * transactions.type 별 잔액 변화 규칙 (코드에서 확인한 실제 값):
 *  deposit             +amount                                  (api/deposit)
 *  spend (register)    −amount + totalAccumulation              (api/spend/register: 포인트 결제 후 120%)
 *  spend (card_codef)  +totalAccumulation                       (card-service: 카드 실지출, 차감 없음)
 *  withdrawal_request  −amount                                  (withdraw-service)
 *  withdrawal_refund   +amount
 *  reward_lock/out/in/refund  lib/reward-ledger.rewardTxDeltas
 *  invite_invitee      +amount        ┐ 무에서 생성된 구 경로 — "베타 조정" 항목으로 분리
 *  invite_advertiser   +totalAccumulation ┘ (소급 차감 없음, CEO 결정 §8-6)
 *  (type 없음)         −amount + totalAccumulation              (history/page.tsx 가 spend 로 취급)
 *  users.betaTestFunds +                                        (post-signup 초기 지급, transactions 없음)
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const db = adminDb();

    const usersSnap = await db.collection("users").select("totalPoints", "lockedPoints", "betaTestFunds").get();
    let totalPoints = 0;
    let lockedPoints = 0;
    let betaInitialFunds = 0;
    let negativeLocked = 0;
    usersSnap.forEach((d) => {
      const u = d.data();
      totalPoints += num(u.totalPoints);
      const locked = num(u.lockedPoints);
      lockedPoints += locked;
      if (locked < 0) negativeLocked += 1;
      betaInitialFunds += num(u.betaTestFunds);
    });

    const txSnap = await db
      .collection("transactions")
      .select("type", "amount", "totalAccumulation", "source", "lockedDelta")
      .get();

    const byType: Record<string, { count: number; amount: number; totalDelta: number; lockedDelta: number }> = {};
    const bump = (key: string, amount: number, totalDelta: number, lockedDelta: number) => {
      const b = (byType[key] ??= { count: 0, amount: 0, totalDelta: 0, lockedDelta: 0 });
      b.count += 1;
      b.amount += amount;
      b.totalDelta += totalDelta;
      b.lockedDelta += lockedDelta;
    };

    txSnap.forEach((d) => {
      const t = d.data();
      const type = typeof t.type === "string" ? t.type : "";
      const amount = num(t.amount);
      const acc = num(t.totalAccumulation);
      switch (type) {
        case "deposit":
          bump("deposit", amount, amount, 0);
          break;
        case "spend":
          if (t.source === "card_codef") {
            bump("spend_card", amount, acc, 0);
          } else {
            bump("spend_principal", amount, -amount, 0);
            bump("spend_bonus", acc, acc, 0);
          }
          break;
        case "withdrawal_request":
          bump("withdrawal_request", amount, -amount, 0);
          break;
        case "withdrawal_refund":
          bump("withdrawal_refund", amount, amount, 0);
          break;
        case "invite_invitee":
          bump("beta_adjust_invitee", amount, amount, 0);
          break;
        case "invite_advertiser":
          bump("beta_adjust_advertiser", amount, acc, 0);
          break;
        case "":
          bump("untyped_legacy", amount, -amount + acc, 0);
          break;
        default:
          if ((REWARD_TX_TYPES as readonly string[]).includes(type)) {
            const delta = rewardTxDeltas(type as RewardTxType, amount);
            bump(type, amount, delta.totalDelta, delta.lockedDelta);
          } else {
            bump(`unknown:${type}`, amount, 0, 0);
          }
      }
    });

    const sumTotalDelta = Object.values(byType).reduce((s, b) => s + b.totalDelta, 0);
    const sumLockedDelta = Object.values(byType).reduce((s, b) => s + b.lockedDelta, 0);
    const betaAdjustment =
      (byType.beta_adjust_invitee?.totalDelta || 0) + (byType.beta_adjust_advertiser?.totalDelta || 0);

    const left = totalPoints + lockedPoints;
    const right = sumTotalDelta + sumLockedDelta + betaInitialFunds;
    const rewardNet =
      (byType.reward_lock?.totalDelta || 0) +
      (byType.reward_lock?.lockedDelta || 0) +
      (byType.reward_out?.lockedDelta || 0) +
      (byType.reward_in?.totalDelta || 0) +
      (byType.reward_refund?.totalDelta || 0) +
      (byType.reward_refund?.lockedDelta || 0);

    return jsonOk({
      ok: true,
      generatedAt: Date.now(),
      left: { totalPoints, lockedPoints, sum: left, userCount: usersSnap.size },
      right: { transactionsTotalDelta: sumTotalDelta, transactionsLockedDelta: sumLockedDelta, betaInitialFunds, sum: right },
      diff: left - right,
      byType,
      betaAdjustment,
      rewardNet, // 제로섬이면 항상 0
      warnings: [
        ...(left !== right ? [`좌변·우변 불일치 ${left - right}`] : []),
        ...(rewardNet !== 0 ? [`리워드 원장 순변화 ${rewardNet} (0 이어야 함)`] : []),
        ...(negativeLocked > 0 ? [`lockedPoints 음수 회원 ${negativeLocked}명`] : []),
        ...(Object.keys(byType).some((k) => k.startsWith("unknown:")) ? ["집계 규칙 없는 transactions.type 존재"] : []),
        ...((byType.untyped_legacy?.count || 0) > 0
          ? [`type 없는 거래 ${byType.untyped_legacy.count}건 — spend 로 간주해 집계 (검증 필요)`]
          : []),
        ...((byType.spend_card?.totalDelta || 0) !== 0
          ? [`카드 실지출 +120% 무차감 발행 ${byType.spend_card.totalDelta} — 정책 미확정 발행`]
          : []),
      ],
      transactionCount: txSnap.size,
    });
  } catch (err) {
    return jsonError(err);
  }
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
