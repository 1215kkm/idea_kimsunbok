export interface NonlinearResult {
  amount: number;
  sellerAccumulation: number;
  consumerAccumulation: number;
  totalAccumulation: number;
  rate: number;
  bonus: number;
  principal: number;
}

const DEFAULT_CONFIG = {
  sellerRate: 0.5,
  consumerRate: 0.5,
  membershipMultiplier: 10,
  correctionTarget: 1.2,
  distributionRounds: 5,
  roundMultipliers: [1, 1, 2, 2, 4],
};

export function calculateNonlinear(amount: number): NonlinearResult {
  const c = DEFAULT_CONFIG;

  // A1: 판매자 적립
  const sellerAccumulation = amount * c.sellerRate;
  // B1: 소비자 적립
  const consumerAccumulation = amount * c.consumerRate;

  // 멤버십 풀
  const membershipPool = consumerAccumulation * c.membershipMultiplier;

  // 비선형 분배 (5라운드)
  let distributed = 0;
  const totalMultiplier = c.roundMultipliers.reduce((a, b) => a + b, 0);
  for (let i = 0; i < c.distributionRounds; i++) {
    distributed += (membershipPool / totalMultiplier) * c.roundMultipliers[i];
  }

  // 보정모드: 150% → 120%
  const rawRate = (sellerAccumulation + distributed) / amount;
  const correctedTotal = amount * c.correctionTarget;

  const principal = amount;
  const bonus = correctedTotal - amount;

  return {
    amount,
    sellerAccumulation,
    consumerAccumulation,
    totalAccumulation: correctedTotal,
    rate: c.correctionTarget * 100,
    bonus,
    principal,
  };
}
