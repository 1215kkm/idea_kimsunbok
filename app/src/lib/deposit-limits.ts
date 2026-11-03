/**
 * 충전(입금) 한도 — 통합 이용약관 제3조 (서버 · 화면 · 데모 공용)
 *
 *  일반회원: 최소 10,000원 · 1회 최대 100,000,000원
 *  기업회원: 최소 100,000원 · 1회 최대 10,000,000,000원 (약관은 "법령·협력 금융기관 조건에 따름" — 기존 100억 유지)
 */
import type { MemberType } from "./business";

export interface DepositLimit {
  min: number;
  max: number;
}

export const DEPOSIT_LIMITS: Record<MemberType, DepositLimit> = {
  personal: { min: 10_000, max: 100_000_000 },
  business: { min: 100_000, max: 10_000_000_000 },
};

export function toMemberType(v: unknown): MemberType {
  return v === "business" ? "business" : "personal";
}

export function depositLimitFor(memberType: unknown): DepositLimit {
  return DEPOSIT_LIMITS[toMemberType(memberType)];
}

/** 한도 밖이면 회원에게 보여줄 안내 문구, 괜찮으면 null */
export function depositLimitError(amount: number, memberType: unknown): string | null {
  const kind = toMemberType(memberType);
  const { min, max } = DEPOSIT_LIMITS[kind];
  const who = kind === "business" ? "기업회원" : "일반회원";
  if (!Number.isInteger(amount) || amount < min) return `${who} 최소 충전 금액은 ${min.toLocaleString()}원입니다.`;
  if (amount > max) return `${who} 1회 최대 충전 금액은 ${max.toLocaleString()}원입니다.`;
  return null;
}
