import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { jsonError, jsonOk } from "@/lib/server/api-error";
import { requestWithdrawal } from "@/lib/server/withdraw-service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = (await req.json().catch(() => ({}))) as {
      amount?: unknown;
      bankInfo?: unknown;
    };
    const result = await requestWithdrawal(user.uid, body.amount, body.bankInfo);
    return jsonOk({ ok: true, ...result });
  } catch (err) {
    return jsonError(err);
  }
}
