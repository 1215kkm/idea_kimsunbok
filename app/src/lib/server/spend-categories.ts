export const SPEND_CATEGORIES = {
  "food-material": { name: "식자재", icon: "🥬" },
  labor: { name: "인건비", icon: "👷" },
  rent: { name: "임대료", icon: "🏢" },
  utility: { name: "공과금", icon: "💡" },
  tax: { name: "세금", icon: "🏛️" },
  loan: { name: "대출상환금", icon: "🏦" },
  invest: { name: "투자금", icon: "📈" },
  living: { name: "의.식.주.생활비", icon: "🏠" },
} as const;

export type SpendCategoryId = keyof typeof SPEND_CATEGORIES;

export function isValidCategory(id: unknown): id is SpendCategoryId {
  return typeof id === "string" && Object.prototype.hasOwnProperty.call(SPEND_CATEGORIES, id);
}

export const MAX_SPEND_PER_TX = 1_000_000_000;
export const MIN_SPEND_PER_TX = 1;
export const MIN_WITHDRAW = 1_000;
