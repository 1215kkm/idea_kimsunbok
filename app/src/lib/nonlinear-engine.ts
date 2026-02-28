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
  membershipAccumulation: number;
  consumerAccumulation: number;
}

const DEFAULT_CONFIG = {
  userBaseRate: 0.5,
  memberShareRate: 0.5,
  membershipMultiplier: 10,
  correctionTarget: 1.2,
  distributionRounds: 5,
  roundMultipliers: [1, 1, 2, 2, 4],
  defaultMemberCount: 10,
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

  // 멤버십 풀 (10배 확장)
  const membershipPool = memberDistribution * c.membershipMultiplier;

  // 비선형 분배 (5라운드)
  let distributed = 0;
  const totalMultiplier = c.roundMultipliers.reduce((a, b) => a + b, 0);
  for (let i = 0; i < c.distributionRounds; i++) {
    distributed += (membershipPool / totalMultiplier) * c.roundMultipliers[i];
  }

  // 이탈모드: 로그기록 데이터 이탈 → 결합모드
  // C1:4,000,000,000(free) - a:500,000,000(f) = 3,500,000,000 + d1:500,000,000(빈)
  const escapeAmount = amount * 0.25;
  const escapeMode: EscapeModeResult = {
    totalPool: amount * 2,
    loggedAmount: escapeAmount,
    remainingPool: amount * 2 - escapeAmount,
    emptySlot: escapeAmount,
    combinedPool: amount * 2,
    canCombine: true,
  };

  // 멤버십 적립 모드: A1(20%) + b = 멤버십 적립 (10억 단위)
  const membershipAccumulation = amount * 0.2;

  // 소비자 적립 (1억 단위): 300,000,000(free) - 120,000,000(free)
  const consumerAccumulation = amount * 0.12;

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
    membershipAccumulation,
    consumerAccumulation,
  };
}
