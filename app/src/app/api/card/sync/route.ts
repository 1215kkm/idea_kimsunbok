import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { jsonError, jsonOk } from "@/lib/server/api-error";
import { syncCardTransactions } from "@/lib/server/card-service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const result = await syncCardTransactions(user.uid);
    return jsonOk({ ok: true, ...result });
  } catch (err) {
    return jsonError(err);
  }
}
