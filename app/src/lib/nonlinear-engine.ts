export interface EscapeModeResult {
  totalPool: number;
  loggedAmount: number;
  remainingPool: number;
  emptySlot: number;
  combinedPool: number;
  canCombine: boolean;
}

export interface FundZoneResult {
  principal: number;
  augmentRate: number;
  augmentedAmount: number;
  totalAccumulation: number;
  rate: number;
  entityType: string;
  priority: number;
  unitThreshold: number;
}

export interface DistributionChain {
  a: number; // 이탈모드 자유값 (50%)
  b: number; // A1 자유값 (8% = 0.8%×10회)
  c: number; // 소비자적립값 (12%)
  d: number; // 보정값 (5%)
  e: number; // 광고주적립값 (5%)
  f: number; // 수수료 (20%)
  valid: boolean;
}

export interface AdvertiserResult {
  spendAmount: number;
  advertiserRate: number;
  advertiserReward: number;
}

export interface NonlinearResult {
  amount: number;
  userAccumulation: number;
  memberDistribution: number;
  totalAccumulation: number;
  rate: number;
  bonus: number;
  principal: number;
  memberCount: number;
  perMemberAmount: number;
  escapeMode: EscapeModeResult;
  fundZone: FundZoneResult;
  distributionChain: DistributionChain;
  advertiser: AdvertiserResult;
  membershipAccumulation: number;
  consumerAccumulation: number;
  correctionValue: number;
  correctionPool: number;
}

const DEFAULT_CONFIG = {
  userBaseRate: 0.5,
  memberShareRate: 0.5,
  membershipMultiplier: 10,
  correctionTarget: 1.2,
  distributionRounds: 5,
  roundMultipliers: [1, 1, 2, 2, 4],
  defaultMemberCount: 10,
  advertiserRate: 0.05, // 광고주 적립 5%
};

/**
 * 다랜드 비선형공식 분배 엔진
 *
 * 공식: A1:1000xn(50%) + B1:1000xn(50%) U:C1:4000xn × 1 × 2 × 5회
 *
 * 흐름:
 *   1. 사용자가 신용카드로 결제
 *   2. 지출데이터 단말기가 영수증으로 증명
 *   3. 본인 충전데이터에서 지출금액 차감
 *   4. 비선형공식 알고리즘으로 분배 → 120% 증액 적립
 *   5. 다른 멤버십 회원들에게 지출금액 전달
 *   6. 회원들도 본인 적립금에서 차감 → 비선형공식 → 120% 적립
 */
export function calculateNonlinear(amount: number, memberCount?: number): NonlinearResult {
  const c = DEFAULT_CONFIG;
  const members = memberCount || c.defaultMemberCount;

  // A1: 사용자 본인 적립 (50%)
  const userAccumulation = amount * c.userBaseRate;
  // B1: 멤버십 회원 분배분 (50%)
  const memberDistribution = amount * c.memberShareRate;

  // 이탈모드: C1:4×거래금액(free) - a:50%(free) → 결합모드
  const c1Pool = amount * 4; // C1 = 4배 확장
  const escapeAmount = amount * 0.5; // a:500,000,000 = 50% of A1
  const escapeMode: EscapeModeResult = {
    totalPool: c1Pool,
    loggedAmount: escapeAmount,
    remainingPool: c1Pool - escapeAmount,
    emptySlot: escapeAmount,
    combinedPool: c1Pool,
    canCombine: true,
  };

  // a→f 분배 체인 (의뢰자 확정 공식: b=8%, c=12%, d=5%, e=5%, f=20%)
  const a = escapeAmount; // a:500K(free) - 이탈모드 자유값
  const b = amount * 0.08; // b:80K - A1 자유값 (0.8%×10회 = 8%)
  const cc = amount * 0.12; // c:120K - 소비자적립값
  const d = amount * 0.05; // d:50K - 보정값
  const e = amount * 0.05; // e:50K - 광고주적립값 (5%)
  const f = amount * 0.2; // f:200K - 수수료 (20%)
  // 검증: b+cc+d+e+f = 80+120+50+50+200 = 500K = a ✓ (8+12+5+5+20 = 50%)

  const distributionChain: DistributionChain = {
    a, b, c: cc, d, e, f,
    valid: Math.abs((b + cc + d + e + f) - a) < 1,
  };

  // 멤버십 적립 모드: A1 + b = 120%
  const membershipAccumulation = b; // 8% (0.8%×10회)

  // 소비자 적립
  const consumerAccumulation = cc; // 12%

  // 보정 모드: d × 10회 = 보정 풀
  const correctionValue = d;
  const correctionPool = correctionValue * 10;

  // 광고주 적립 (회원 소비지출의 5%)
  const advertiser: AdvertiserResult = {
    spendAmount: amount,
    advertiserRate: c.advertiserRate * 100,
    advertiserReward: amount * c.advertiserRate,
  };

  // 보정모드: 150% → 120%
  const correctedTotal = amount * c.correctionTarget;

  const principal = amount;
  const bonus = correctedTotal - amount;

  // 펀드존: 120%(100%:지출원금 + 20%:증액)
  const fundZone: FundZoneResult = {
    principal: amount,
    augmentRate: 20,
    augmentedAmount: bonus,
    totalAccumulation: correctedTotal,
    rate: 120,
    entityType: 'consumer',
    priority: 5,
    unitThreshold: 100_000_000,
  };

  // 각 멤버십 회원에게 전달되는 금액
  const perMemberAmount = Math.round(memberDistribution / members);

  return {
    amount,
    userAccumulation,
    memberDistribution,
    totalAccumulation: correctedTotal,
    rate: c.correctionTarget * 100,
    bonus,
    principal,
    memberCount: members,
    perMemberAmount,
    escapeMode,
    fundZone,
    distributionChain,
    advertiser,
    membershipAccumulation,
    consumerAccumulation,
    correctionValue,
    correctionPool,
  };
}

// --- 회원 탈퇴 환불 ---

export interface WithdrawalRefundResult {
  balance: number;
  securedPool: number;
  refundAmount: number;
  systemProfit: number;
  rate: number;
}

/**
 * 탈퇴를 "시스템 지출"로 간주하여 비선형공식으로 120% 확보한 뒤
 * 원금(100%)만 회원에게 환불하고 20%는 시스템 수익으로 귀속시킨다.
 */
export function calculateWithdrawalRefund(balance: number): WithdrawalRefundResult {
  const rate = DEFAULT_CONFIG.correctionTarget; // 1.2
  const securedPool = Math.round(balance * rate);
  const refundAmount = balance;
  const systemProfit = securedPool - refundAmount;
  return { balance, securedPool, refundAmount, systemProfit, rate: rate * 100 };
}

// --- 단계(Tier) 시스템 ---

export interface MembershipTier {
  level: 4 | 5 | 6 | 7;
  label: string;
  a1Amount: number; // A1 기준값 (단계별)
  consumerStep: number; // 소비자 단계 (A1 / 10)
  splitCountPerMillion: number; // 1,000,000원 결제 시 분할 회수
}

export const MEMBERSHIP_TIERS: MembershipTier[] = [
  { level: 4, label: "백만 단위", a1Amount: 1_000_000, consumerStep: 100_000, splitCountPerMillion: 10 },
  { level: 5, label: "천만 단위", a1Amount: 10_000_000, consumerStep: 1_000_000, splitCountPerMillion: 1 },
  { level: 6, label: "1억 단위", a1Amount: 100_000_000, consumerStep: 10_000_000, splitCountPerMillion: 1 },
  { level: 7, label: "10억 단위", a1Amount: 1_000_000_000, consumerStep: 100_000_000, splitCountPerMillion: 1 },
];

/**
 * 회원 자금(잔액)에 따라 단계 자동 결정.
 * - 1000만 미만 → 4단계 (백만 단위)
 * - 1억 미만 → 5단계 (천만 단위)
 * - 10억 미만 → 6단계 (1억 단위)
 * - 그 이상 → 7단계 (10억 단위)
 */
export function determineTier(balance: number): MembershipTier {
  if (balance < 10_000_000) return MEMBERSHIP_TIERS[0]; // 4단계
  if (balance < 100_000_000) return MEMBERSHIP_TIERS[1]; // 5단계
  if (balance < 1_000_000_000) return MEMBERSHIP_TIERS[2]; // 6단계
  return MEMBERSHIP_TIERS[3]; // 7단계
}

/**
 * 결제금액 → 분할 회수 계산 (단계별).
 * 4단계: 100만원 결제 시 10회 분할 (10만씩)
 * 5단계 이상: 1회 처리
 */
export function calculateSplitCount(spendAmount: number, tier: MembershipTier): number {
  if (spendAmount < tier.consumerStep) return 1;
  return Math.ceil(spendAmount / tier.consumerStep);
}

// --- 리워드 광고(초대) 영업 모델 ---

export interface InviteRewardResult {
  baseAmount: number;
  distributedToNewUser: number;
  advertiserSpend: number;
  advertiserSecured: number;
  advertiserNetGain: number;
  rate: number;
}

/**
 * 광고주가 baseAmount(기본 100,000P)를 분배하면:
 *  - 신규 가입자에게 baseAmount 지급
 *  - 광고주 본인 지출로 인식 → 비선형공식 120% 적립
 *  - 순변화 = +20% (advertiserSecured - advertiserSpend)
 */
export function calculateInviteReward(baseAmount: number = 100_000): InviteRewardResult {
  const rate = DEFAULT_CONFIG.correctionTarget; // 1.2
  const advertiserSecured = Math.round(baseAmount * rate);
  const advertiserNetGain = advertiserSecured - baseAmount;
  return {
    baseAmount,
    distributedToNewUser: baseAmount,
    advertiserSpend: baseAmount,
    advertiserSecured,
    advertiserNetGain,
    rate: rate * 100,
  };
}
