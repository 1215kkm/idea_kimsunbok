import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL"
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
  console.error("[api] unexpected error", err);
  return NextResponse.json(
    { error: "INTERNAL", message: "Internal server error" },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}
