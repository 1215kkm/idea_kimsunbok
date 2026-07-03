import type { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebase-admin";
import { requireAdmin } from "@/lib/server/auth";
import { ApiError, jsonError, jsonOk } from "@/lib/server/api-error";
import { SPLIT_AUTO_LIMIT, type SplitMode } from "@/lib/server/system-settings";

export const runtime = "nodejs";

const settingsRef = () => adminDb().collection("settings").doc("system");

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const snap = await settingsRef().get();
    const data = snap.exists ? snap.data() : {};
    return jsonOk({
      ok: true,
      splitMode: (data?.splitMode === "manual" ? "manual" : "auto") as SplitMode,
      splitAutoLimit: SPLIT_AUTO_LIMIT,
      updatedAt: data?.updatedAt?.toMillis?.() ?? null,
    });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = (await req.json().catch(() => ({}))) as { splitMode?: unknown };
    if (body.splitMode !== "auto" && body.splitMode !== "manual") {
      throw new ApiError("INVALID_INPUT", "splitMode는 auto 또는 manual 이어야 합니다.", 400, {
        field: "splitMode",
      });
    }
    await settingsRef().set(
      {
        splitMode: body.splitMode,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: admin.uid,
      },
      { merge: true },
    );
    return jsonOk({ ok: true, splitMode: body.splitMode, splitAutoLimit: SPLIT_AUTO_LIMIT });
  } catch (err) {
    return jsonError(err);
  }
}
