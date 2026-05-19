import type { NextRequest } from "next/server";
import { requireAuth } from "@/lib/server/auth";
import { ApiError, jsonError, jsonOk } from "@/lib/server/api-error";
import { connectCard } from "@/lib/server/card-service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = (await req.json().catch(() => ({}))) as {
      cardOrg?: unknown;
      loginId?: unknown;
      loginPw?: unknown;
    };
    if (
      typeof body.cardOrg !== "string" ||
      typeof body.loginId !== "string" ||
      typeof body.loginPw !== "string"
    ) {
      throw new ApiError("INVALID_INPUT", "cardOrg/loginId/loginPw required", 400);
    }
    const result = await connectCard(
      user.uid,
      body.cardOrg,
      body.loginId,
      body.loginPw,
    );
    return jsonOk({ ok: true, ...result });
  } catch (err) {
    return jsonError(err);
  }
}
