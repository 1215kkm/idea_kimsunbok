import type { NextRequest } from "next/server";
import { adminDb } from "@/lib/server/firebase-admin";
import { ApiError, jsonError, jsonOk } from "@/lib/server/api-error";
import { INVITE_TIERS, isValidTier, type InviteTierId } from "@/lib/server/invite-tiers";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = (url.searchParams.get("code") || "").toUpperCase();
    if (!/^[A-Z0-9]{8}$/.test(code)) {
      throw new ApiError("INVALID_INPUT", "Invalid code format", 400, { field: "code" });
    }
    const snap = await adminDb().collection("inviteCodes").doc(code).get();
    if (!snap.exists) {
      throw new ApiError("NOT_FOUND", "Invite code not found", 404);
    }
    const data = snap.data()!;
    const tierId = data.tierId as InviteTierId;
    if (!isValidTier(tierId)) {
      throw new ApiError("INTERNAL", "Stored tier invalid", 500);
    }
    if (data.active === false) {
      throw new ApiError("INACTIVE", "Invite code is no longer active", 410);
    }
    const tier = INVITE_TIERS[tierId];
    return jsonOk({
      ok: true,
      code,
      tierId,
      amount: tier.amount,
      label: tier.label,
    });
  } catch (err) {
    return jsonError(err);
  }
}
