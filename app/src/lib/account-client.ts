/**
 * 내 잔액 · 회원 구분 읽기 (화면 공용) — 실서버(Firestore users 문서) 또는 데모(localStorage)
 */
import { doc, getDoc } from "firebase/firestore";
import { db, isConfigured } from "@/lib/firebase";
import { getBalance as getDemoBalance, getDemoProfile } from "@/lib/demo-store";
import { toMemberType } from "@/lib/deposit-limits";
import type { MemberType } from "@/lib/business";

export interface MyAccount {
  balance: number;
  memberType: MemberType;
}

export async function loadMyAccount(user: { uid: string; email?: string | null }): Promise<MyAccount> {
  if (!isConfigured || !db) {
    return { balance: getDemoBalance(user), memberType: getDemoProfile(user.email).memberType };
  }
  const snap = await getDoc(doc(db, "users", user.uid));
  const data = snap.exists() ? snap.data() : {};
  return { balance: (data.totalPoints as number) || 0, memberType: toMemberType(data.memberType) };
}
