import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * 410 Gone — 구 초대 코드 지급 경로 (2026-09-06 CEO 결정, 기획서 §4.3).
 * 광고주 잔액 차감 없이 포인트를 생성하던 경로라 영구 폐쇄. 대체: POST /api/reward/redeem
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "INVITE_DEPRECATED",
      message: "구 초대 코드 지급은 중단되었습니다. 리워드 캠페인 코드(/api/reward/redeem)를 사용해 주세요.",
      replacement: "/api/reward/redeem",
    },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
