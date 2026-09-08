import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { jsonError, jsonOk } from "@/lib/server/api-error";
import {
  createCampaign,
  getConfirmedDepositTotal,
  listCampaignsForOwner,
  validateCreateInput,
} from "@/lib/server/reward-service";
import {
  ADVERTISER_MIN_DEPOSIT,
  REWARD_CHANNELS,
  REWARD_KINDS,
  REWARD_UNIT_AMOUNTS,
  MAX_HEADCOUNT,
} from "@/lib/reward-ledger";

export const runtime = "nodejs";

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** 내 캠페인 목록 + 선택지 메타 + 광고주 자격·잔액 (사용자 화면 상단) */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const [items, depositTotal, userSnap] = await Promise.all([
      listCampaignsForOwner(user.uid),
      getConfirmedDepositTotal(user.uid),
      adminDb().collection("users").doc(user.uid).get(),
    ]);
    const u = userSnap.exists ? userSnap.data()! : {};
    return jsonOk({
      ok: true,
      items,
      advertiser: {
        depositTotal,
        required: ADVERTISER_MIN_DEPOSIT,
        qualified: depositTotal >= ADVERTISER_MIN_DEPOSIT,
        totalPoints: num(u.totalPoints),
        lockedPoints: num(u.lockedPoints),
        pendingRewardCode: typeof u.pendingRewardCode === "string" ? u.pendingRewardCode : null,
      },
      options: {
        unitAmounts: REWARD_UNIT_AMOUNTS,
        channels: REWARD_CHANNELS,
        kinds: REWARD_KINDS,
        maxHeadcount: MAX_HEADCOUNT,
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}

/** 캠페인 제출 = 예산(unitAmount × headcount) 즉시 잠금 → pending_review */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const raw = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const input = validateCreateInput(raw);
    const result = await createCampaign(user.uid, input);
    return jsonOk({ ok: true, ...result, status: "pending_review" });
  } catch (err) {
    return jsonError(err);
  }
}
