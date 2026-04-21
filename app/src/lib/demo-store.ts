/**
 * 데모 모드 로컬 스토리지 기반 데이터 저장소
 *
 * Firebase 미연결 환경(베타 테스트)에서도 실사용 UX를 체험할 수 있도록
 * 회원별(이메일 키 기준) 거래내역과 잔액을 localStorage에 누적 저장한다.
 *
 * 실환경(Firebase) 전환 시 동일 스키마로 Firestore에 그대로 이관 가능.
 */

export interface DemoTransaction {
  id: string;
  consumerId: string; // 이메일 (데모 환경의 user.uid 대체)
  userName: string;
  category: string;
  categoryName: string;
  storeName?: string;
  amount: number;
  memo: string;
  totalAccumulation: number;
  nonlinearResult: {
    principal: number;
    bonus: number;
    totalAccumulation: number;
    rate: number;
    memberCount: number;
    perMemberAmount: number;
    advertiserReward: number;
  };
  createdAt: number; // Unix timestamp (ms)
}

const TX_KEY = (email: string) => `daland-demo-transactions-${email}`;
const BAL_KEY = (email: string) => `daland-demo-balance-${email}`;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function emailKey(user: { email?: string | null } | null | undefined): string | null {
  if (!user || !user.email) return null;
  return user.email.toLowerCase();
}

/** 거래 1건 추가 + 잔액 자동 증가 */
export function saveTransaction(
  user: { email?: string | null; displayName?: string | null },
  tx: Omit<DemoTransaction, "id" | "consumerId" | "userName" | "createdAt">
): DemoTransaction | null {
  if (!isBrowser()) return null;
  const key = emailKey(user);
  if (!key) return null;

  const record: DemoTransaction = {
    ...tx,
    id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    consumerId: key,
    userName: user.displayName || "사용자",
    createdAt: Date.now(),
  };

  try {
    const raw = localStorage.getItem(TX_KEY(key));
    const list: DemoTransaction[] = raw ? JSON.parse(raw) : [];
    list.unshift(record); // 최신순
    localStorage.setItem(TX_KEY(key), JSON.stringify(list));

    const bal = getBalance(user);
    localStorage.setItem(BAL_KEY(key), String(bal + record.totalAccumulation));
  } catch {
    // 저장 실패 무시 (quota 초과 등)
  }

  return record;
}

/** 회원 거래내역 전체 조회 (최신순) */
export function getTransactions(user: { email?: string | null } | null | undefined): DemoTransaction[] {
  if (!isBrowser()) return [];
  const key = emailKey(user);
  if (!key) return [];
  try {
    const raw = localStorage.getItem(TX_KEY(key));
    return raw ? (JSON.parse(raw) as DemoTransaction[]) : [];
  } catch {
    return [];
  }
}

/** 현재 잔액 조회 (포인트 P 단위) */
export function getBalance(user: { email?: string | null } | null | undefined): number {
  if (!isBrowser()) return 0;
  const key = emailKey(user);
  if (!key) return 0;
  try {
    const raw = localStorage.getItem(BAL_KEY(key));
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/** 잔액 차감 (출금 시 사용) */
export function deductBalance(user: { email?: string | null }, amount: number): number {
  if (!isBrowser()) return 0;
  const key = emailKey(user);
  if (!key) return 0;
  const next = Math.max(0, getBalance(user) - amount);
  localStorage.setItem(BAL_KEY(key), String(next));
  return next;
}

/** 회원 통계 (총 지출, 총 적립, 거래 건수) */
export function getStats(user: { email?: string | null } | null | undefined): {
  spent: number;
  earned: number;
  count: number;
} {
  const list = getTransactions(user);
  let spent = 0;
  let earned = 0;
  for (const t of list) {
    spent += t.amount;
    earned += t.totalAccumulation;
  }
  return { spent, earned, count: list.length };
}

// --- 회원 탈퇴 ---

const WITHDRAW_LOG_KEY = "daland-demo-withdrawal-log";

export interface WithdrawalLog {
  email: string;
  refundAmount: number;
  systemProfit: number;
  reason: string;
  timestamp: number;
}

/** 회원 탈퇴 처리: 거래내역·잔액 삭제 + 환불 로그 기록 */
export function withdrawUser(
  user: { email?: string | null },
  refundAmount: number,
  systemProfit: number,
  reason: string = "",
): WithdrawalLog | null {
  if (!isBrowser()) return null;
  const key = emailKey(user);
  if (!key) return null;

  const log: WithdrawalLog = {
    email: key,
    refundAmount,
    systemProfit,
    reason,
    timestamp: Date.now(),
  };

  try {
    // 환불 로그 누적
    const raw = localStorage.getItem(WITHDRAW_LOG_KEY);
    const logs: WithdrawalLog[] = raw ? JSON.parse(raw) : [];
    logs.unshift(log);
    localStorage.setItem(WITHDRAW_LOG_KEY, JSON.stringify(logs));

    // 회원 데이터 삭제
    localStorage.removeItem(TX_KEY(key));
    localStorage.removeItem(BAL_KEY(key));
  } catch {
    // 무시
  }

  return log;
}

// --- 초대 코드 ---

const INVITE_KEY = (email: string) => `daland-demo-invites-${email}`;

export interface InviteRecord {
  inviterEmail: string;
  inviteeEmail: string;
  amount: number;
  bonus: number;
  timestamp: number;
}

/** 초대 코드 생성 (이메일 기반 단순 해시) */
export function generateInviteCode(user: { email?: string | null }): string | null {
  const key = emailKey(user);
  if (!key) return null;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36).toUpperCase();
}

/** 초대 코드 → 초대자 이메일 역조회 (같은 브라우저 내에서만 동작) */
export function resolveInviteCode(code: string): string | null {
  if (!isBrowser()) return null;
  try {
    const allKeys = Object.keys(localStorage);
    for (const k of allKeys) {
      if (!k.startsWith("daland-demo-balance-")) continue;
      const email = k.replace("daland-demo-balance-", "");
      const expected = generateInviteCode({ email });
      if (expected === code) return email;
    }
  } catch {
    // 무시
  }
  return null;
}

/** 초대 리워드 기록 + 잔액 반영 (광고주: +bonus, 신규: +amount) */
export function processInviteReward(
  inviterEmail: string,
  inviteeEmail: string,
  amount: number,
  bonus: number,
): InviteRecord | null {
  if (!isBrowser()) return null;

  const record: InviteRecord = {
    inviterEmail: inviterEmail.toLowerCase(),
    inviteeEmail: inviteeEmail.toLowerCase(),
    amount,
    bonus,
    timestamp: Date.now(),
  };

  try {
    // 광고주(초대자) 잔액 +bonus
    const inviterBal = localStorage.getItem(BAL_KEY(record.inviterEmail));
    const newBal = (inviterBal ? parseInt(inviterBal, 10) : 0) + bonus;
    localStorage.setItem(BAL_KEY(record.inviterEmail), String(newBal));

    // 신규 가입자 잔액 +amount
    const inviteeBal = localStorage.getItem(BAL_KEY(record.inviteeEmail));
    const newInviteeBal = (inviteeBal ? parseInt(inviteeBal, 10) : 0) + amount;
    localStorage.setItem(BAL_KEY(record.inviteeEmail), String(newInviteeBal));

    // 초대 기록 저장
    const raw = localStorage.getItem(INVITE_KEY(record.inviterEmail));
    const list: InviteRecord[] = raw ? JSON.parse(raw) : [];
    list.unshift(record);
    localStorage.setItem(INVITE_KEY(record.inviterEmail), JSON.stringify(list));
  } catch {
    // 무시
  }

  return record;
}

/** 초대자의 초대 기록 목록 조회 */
export function getInviteRecords(user: { email?: string | null } | null | undefined): InviteRecord[] {
  if (!isBrowser()) return [];
  const key = emailKey(user);
  if (!key) return [];
  try {
    const raw = localStorage.getItem(INVITE_KEY(key));
    return raw ? (JSON.parse(raw) as InviteRecord[]) : [];
  } catch {
    return [];
  }
}

/** 잔액 직접 추가 (초대 보너스 등) */
export function addBalance(user: { email?: string | null }, amount: number): number {
  if (!isBrowser()) return 0;
  const key = emailKey(user);
  if (!key) return 0;
  const next = getBalance(user) + amount;
  localStorage.setItem(BAL_KEY(key), String(next));
  return next;
}
