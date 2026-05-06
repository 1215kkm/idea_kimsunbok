export const INVITE_TIERS = {
  standard: { amount: 100_000, label: "10만P", desc: "일반 회원 초대" },
  vip: { amount: 1_000_000, label: "100만P", desc: "VIP 초대" },
  premium: { amount: 10_000_000, label: "1천만P", desc: "프리미엄 초대" },
  enterprise: { amount: 100_000_000, label: "1억P", desc: "사업자 데모용" },
} as const;

export type InviteTierId = keyof typeof INVITE_TIERS;

export function isValidTier(t: unknown): t is InviteTierId {
  return typeof t === "string" && Object.prototype.hasOwnProperty.call(INVITE_TIERS, t);
}

export function listTiers() {
  return (Object.keys(INVITE_TIERS) as InviteTierId[]).map((id) => ({
    id,
    ...INVITE_TIERS[id],
  }));
}
