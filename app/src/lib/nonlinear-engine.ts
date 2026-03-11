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
  b: number; // A1 자유값 - 멤버십적립 (20%)
  c: number; // 소비자적립값 (12%)
  d: number; // 보정값 (5%)
  e: number; // 광고주적립값 (1%)
  f: number; // 수수료 (12%)
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

  // 멤버십 풀 (10배 확장)
  const membershipPool = memberDistribution * c.membershipMultiplier;

  // 비선형 분배 (5라운드)
  let distributed = 0;
  const totalMultiplier = c.roundMultipliers.reduce((x, y) => x + y, 0);
  for (let i = 0; i < c.distributionRounds; i++) {
    distributed += (membershipPool / totalMultiplier) * c.roundMultipliers[i];
  }

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

  // a→f 분배 체인
  const a = escapeAmount; // a:500M(free) - 이탈모드 자유값
  const b = amount * 0.2; // b:200M - A1 자유값 (멤버십적립)
  const cc = amount * 0.12; // c:120M - 소비자적립값
  const d = amount * 0.05; // d:50M - 보정값
  const e = amount * 0.01; // e:10M - 광고주적립값
  const f = amount * 0.12; // f:120M - 수수료
  // 검증: b+cc+d+e+f = 200+120+50+10+120 = 500M = a ✓

  const distributionChain: DistributionChain = {
    a, b, c: cc, d, e, f,
    valid: Math.abs((b + cc + d + e + f) - a) < 1,
  };

  // 멤버십 적립 모드: A1 + b = 120%
  const membershipAccumulation = b; // 20%

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
