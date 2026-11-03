/**
 * 출금 받을 내 은행 계좌 (이 기기에만 저장) — 기존 출금 화면과 간단 화면(v2)이 같은 목록을 쓴다.
 * 서버에는 출금 요청 때만 보내고, 서버는 암호화해 보관한다 (withdraw-service).
 */
export const BANKS = [
  { id: "shinhan", name: "신한은행", icon: "🏦", color: "#0046ff" },
  { id: "kb", name: "국민은행", icon: "🏦", color: "#f5a623" },
  { id: "woori", name: "우리은행", icon: "🏦", color: "#0066b3" },
  { id: "hana", name: "하나은행", icon: "🏦", color: "#009490" },
  { id: "nh", name: "농협은행", icon: "🏦", color: "#00703c" },
  { id: "kakao", name: "카카오뱅크", icon: "🏦", color: "#fee500" },
  { id: "toss", name: "토스뱅크", icon: "🏦", color: "#0064ff" },
];

export type Bank = (typeof BANKS)[number];

export interface SavedAccount {
  id: string; // local-generated
  bankId: string;
  account: string;
  holder: string;
}

const BANKS_KEY = (uid: string) => `daland-banks-${uid}`;
export const SELECTED_KEY = (uid: string) => `daland-bank-selected-${uid}`;
const LEGACY_KEY = (uid: string) => `daland-bank-${uid}`;

export function loadAccounts(uid: string): SavedAccount[] {
  try {
    const raw = localStorage.getItem(BANKS_KEY(uid));
    if (raw) return JSON.parse(raw) as SavedAccount[];
    // 1회성 마이그레이션: 단일 계좌 → 배열
    const legacy = localStorage.getItem(LEGACY_KEY(uid));
    if (legacy) {
      const parsed = JSON.parse(legacy);
      if (parsed?.bankId && parsed?.account) {
        const migrated: SavedAccount[] = [
          {
            id: `acc-${Date.now()}`,
            bankId: parsed.bankId,
            account: parsed.account,
            holder: parsed.holder || "",
          },
        ];
        localStorage.setItem(BANKS_KEY(uid), JSON.stringify(migrated));
        return migrated;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveAccounts(uid: string, list: SavedAccount[]) {
  try {
    localStorage.setItem(BANKS_KEY(uid), JSON.stringify(list));
  } catch {
    // ignore
  }
}

/** 마지막으로 고른 계좌 (없으면 첫 계좌) */
export function loadSelectedAccount(uid: string): SavedAccount | null {
  const list = loadAccounts(uid);
  try {
    const sel = localStorage.getItem(SELECTED_KEY(uid));
    const found = sel ? list.find((a) => a.id === sel) : undefined;
    if (found) return found;
  } catch {
    // ignore
  }
  return list[0] ?? null;
}

export function selectAccount(uid: string, id: string) {
  try {
    localStorage.setItem(SELECTED_KEY(uid), id);
  } catch {
    // ignore
  }
}
