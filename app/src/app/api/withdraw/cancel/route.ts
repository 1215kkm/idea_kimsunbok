import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, jsonError, jsonOk } from "@/lib/server/api-error";
import { cancelWithdrawal } from "@/lib/server/withdraw-service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = (await req.json().catch(() => ({}))) as { requestId?: unknown };
    if (typeof body.requestId !== "string") {
      throw new ApiError("INVALID_INPUT", "requestId required", 400);
    }
    const result = await cancelWithdrawal(user.uid, body.requestId);
    return jsonOk({ ok: true, ...result });
  } catch (err) {
    return jsonError(err);
  }
}
