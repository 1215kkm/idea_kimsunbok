import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { jsonError, jsonOk } from "@/lib/server/api-error";
import { getCardStatus, disconnectCard } from "@/lib/server/card-service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const status = await getCardStatus(user.uid);
    return jsonOk({ ok: true, ...status });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await disconnectCard(user.uid);
    return jsonOk({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
