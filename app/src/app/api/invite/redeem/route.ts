import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, jsonError, jsonOk } from "@/lib/server/api-error";
import { redeemInviteCode } from "@/lib/server/invite-service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = (await req.json().catch(() => ({}))) as { inviteCode?: unknown };
    if (typeof body.inviteCode !== "string") {
      throw new ApiError("INVALID_INPUT", "inviteCode is required", 400, {
        field: "inviteCode",
      });
    }
    const result = await redeemInviteCode(user.uid, body.inviteCode.trim().toUpperCase());
    return jsonOk({
      ok: true,
      distributedToNewUser: result.distributedToNewUser,
      advertiserNetGain: result.advertiserNetGain,
      tierId: result.tierId,
    });
  } catch (err) {
    return jsonError(err);
  }
}
