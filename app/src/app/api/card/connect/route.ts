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
      cardType?: unknown;
      businessNumber?: unknown;
    };
    if (
      typeof body.cardOrg !== "string" ||
      typeof body.loginId !== "string" ||
      typeof body.loginPw !== "string"
    ) {
      throw new ApiError("INVALID_INPUT", "cardOrg/loginId/loginPw required", 400);
    }
    const cardType = body.cardType === "business" ? "business" : "personal";
    let businessNumber: string | undefined;
    if (cardType === "business") {
      if (typeof body.businessNumber !== "string" || !/^\d{10}$/.test(body.businessNumber)) {
        throw new ApiError("INVALID_INPUT", "businessNumber 10자리 필요", 400, {
          field: "businessNumber",
        });
      }
      businessNumber = body.businessNumber;
    }
    const result = await connectCard(
      user.uid,
      body.cardOrg,
      body.loginId,
      body.loginPw,
      { cardType, businessNumber },
    );
    return jsonOk({ ok: true, ...result });
  } catch (err) {
    return jsonError(err);
  }
}
