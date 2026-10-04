import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL"
  | "SERVER_NOT_CONFIGURED"
  | "SELF_INVITE"
  | "ALREADY_REDEEMED"
  | "INSUFFICIENT_BALANCE"
  | "INACTIVE"
  | "INVITE_DEPRECATED"
  | "CAMPAIGN_NOT_ACTIVE"
  | "BUDGET_EXHAUSTED"
  | "INVALID_STATE"
  | "EMAIL_NOT_VERIFIED"
  | "DAILY_CAP_REACHED"
  | "INSUFFICIENT_QUALIFICATION";

export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;
  details?: Record<string, unknown>;

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function jsonOk<T extends object>(data: T) {
  return NextResponse.json(data, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}

export function jsonError(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: err.code, message: err.message, details: err.details },
      { status: err.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  // 여기까지 온 것은 예상 못 한 오류다. 원문(영문 스택/SDK 메시지)을 그대로 내보내면
  // 사용자 화면에 영어가 노출되므로, 로그에만 남기고 화면에는 한국어 안내만 보낸다.
  console.error("[api] unexpected error", err);
  return NextResponse.json(
    { error: "INTERNAL", message: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}
