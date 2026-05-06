import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, jsonError, jsonOk } from "@/lib/server/api-error";
import {
  createInviteCodeForUser,
  deactivateActiveCodesFor,
  getActiveInviteForUser,
} from "@/lib/server/invite-service";
import { INVITE_TIERS, isValidTier, listTiers } from "@/lib/server/invite-tiers";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const active = await getActiveInviteForUser(user.uid);
    return jsonOk({
      ok: true,
      tiers: listTiers(),
      active: active
        ? {
            code: active.code,
            tierId: active.tierId,
            amount: active.amount,
            redeemCount: active.redeemCount,
            totalAdvertiserNetGain: active.totalAdvertiserNetGain,
          }
        : null,
    });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = (await req.json().catch(() => ({}))) as { tierId?: unknown };
    if (!isValidTier(body.tierId)) {
      throw new ApiError("INVALID_INPUT", "Invalid tierId", 400, { field: "tierId" });
    }
    await deactivateActiveCodesFor(user.uid);
    const created = await createInviteCodeForUser(user.uid, body.tierId);
    return jsonOk({
      ok: true,
      code: created.code,
      tierId: created.tierId,
      amount: created.amount,
      tierLabel: INVITE_TIERS[created.tierId].label,
    });
  } catch (err) {
    return jsonError(err);
  }
}
