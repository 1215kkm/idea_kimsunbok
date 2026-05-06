import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { ApiError, jsonError, jsonOk } from "@/lib/server/api-error";
import { rejectWithdrawal } from "@/lib/server/withdraw-service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = (await req.json().catch(() => ({}))) as {
      requestId?: unknown;
      reason?: unknown;
    };
    if (typeof body.requestId !== "string") {
      throw new ApiError("INVALID_INPUT", "requestId required", 400);
    }
    const reason = typeof body.reason === "string" ? body.reason : "";
    const r = await rejectWithdrawal(admin.uid, body.requestId, reason);
    return jsonOk({ ok: true, ...r });
  } catch (err) {
    return jsonError(err);
  }
}
