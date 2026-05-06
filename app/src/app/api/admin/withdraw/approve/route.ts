import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { ApiError, jsonError, jsonOk } from "@/lib/server/api-error";
import { approveWithdrawal } from "@/lib/server/withdraw-service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = (await req.json().catch(() => ({}))) as { requestId?: unknown };
    if (typeof body.requestId !== "string") {
      throw new ApiError("INVALID_INPUT", "requestId required", 400);
    }
    await approveWithdrawal(admin.uid, body.requestId);
    return jsonOk({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
