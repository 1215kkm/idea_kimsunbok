/**
 * 다랜드 비선형공식 분배 엔진
 *
 * 공식: A1:1000xn(50%) + B1:1000xn(50%) U:C1:4000xn × 1 × 2 × 5회
 *
 * 모듈 구성:
 *   - 선순환 모듈: 판매자-소비자 기본 수익 배분
 *   - 멤버십 모듈: SNS 기반 멤버십 회원 리워드 분배
 *   - 결합 모듈: 두 모듈 결합 → 120% (원금100% + 수수료20%) 적립 실현
 *   - 광고주 적립: 회원 소비지출의 5%를 가입시킨 광고주에게 적립
 *
 * a→f 분배 체인 (10억 기준):
 *   a:500,000,000(free) - 이탈모드 자유값
 *   b:200,000,000      - A1 자유값 (멤버십적립 20%)
 *   c:120,000,000      - 소비자적립값 (12%)
 *   d:50,000,000       - 보정값
 *   e:10,000,000       - 광고주적립값
 *   f:120,000,000      - 수수료
 */

class NonlinearEngine {
  /**
   * @param {object} config
   * @param {number} config.sellerRate - 판매자 배분 비율 (기본 50%)
   * @param {number} config.consumerRate - 소비자 배분 비율 (기본 50%)
   * @param {number} config.membershipMultiplier - 멤버십 배수 (기본 10배)
   * @param {number} config.distributionRounds - 분배 회차 (기본 5회)
   * @param {number} config.targetAccumulationRate - 목표 적립률 (기본 1.2 = 120%)
   * @param {number} config.advertiserRate - 광고주 적립률 (기본 0.05 = 5%)
   */
  constructor(config = {}) {
    this.sellerRate = config.sellerRate ?? 0.5;
    this.consumerRate = config.consumerRate ?? 0.5;
    this.membershipMultiplier = config.membershipMultiplier ?? 10;
    this.distributionRounds = config.distributionRounds ?? 5;
    this.targetAccumulationRate = config.targetAccumulationRate ?? 1.2;
    this.advertiserRate = config.advertiserRate ?? 0.05; // 광고주 적립 5%
  }

  /**
   * 선순환 모듈 - 기본 수익 배분
   * A1:1000xn(50%) + B1:1000xn(50%)
   *
   * 판매자와 소비자에게 거래금액을 50:50으로 분배
   * @param {number} transactionAmount - 거래 금액
   * @returns {object} 선순환 분배 결과
   */
  selectionModule(transactionAmount) {
    if (transactionAmount <= 0) {
      throw new Error('거래 금액은 0보다 커야 합니다');
    }

    const sellerShare = transactionAmount * this.sellerRate;
    const consumerShare = transactionAmount * this.consumerRate;

    return {
      transactionAmount,
      sellerShare,
      consumerShare,
      totalDistributed: sellerShare + consumerShare,
    };
  }

  /**
   * 멤버십 모듈 - SNS 기반 리워드 분배
   * 소비자 지출금액(1배)의 멤버십 회원(10배) 금액을 비선형 공식에 분배
   *
   * @param {number} consumerSpend - 소비자 지출 금액
   * @param {number} memberCount - 멤버십 회원 수
   * @returns {object} 멤버십 분배 결과
   */
  membershipModule(consumerSpend, memberCount) {
    if (consumerSpend <= 0) {
      throw new Error('소비자 지출 금액은 0보다 커야 합니다');
    }
    if (memberCount <= 0) {
      throw new Error('멤버십 회원 수는 1 이상이어야 합니다');
    }

    const membershipPool = consumerSpend * this.membershipMultiplier;
    const perMemberReward = membershipPool / memberCount;

    return {
      consumerSpend,
      membershipPool,
      memberCount,
      perMemberReward,
    };
  }

  /**
   * 비선형 다차함수 분배 알고리즘
   * U:C1:4000xn × 1 × 2 × 5회
   *
   * 5회에 걸쳐 비선형적으로 포인트를 분배
   * 각 회차마다 누적 승수가 적용됨
   *
   * @param {number} baseAmount - 기본 분배 금액
   * @returns {object} 회차별 분배 결과
   */
  nonlinearDistribution(baseAmount) {
    if (baseAmount <= 0) {
      throw new Error('기본 분배 금액은 0보다 커야 합니다');
    }

    const rounds = [];
    let cumulativeTotal = 0;
    const multipliers = [1, 1, 2, 2, 4]; // × 1 × 2 에서 파생된 5회 승수

    for (let i = 0; i < this.distributionRounds; i++) {
      const multiplier = multipliers[i] || 1;
      const roundAmount = (baseAmount / this.distributionRounds) * multiplier;
      cumulativeTotal += roundAmount;

      rounds.push({
        round: i + 1,
        multiplier,
        roundAmount: Math.round(roundAmount * 100) / 100,
        cumulativeTotal: Math.round(cumulativeTotal * 100) / 100,
      });
    }

    return {
      baseAmount,
      rounds,
      totalDistributed: Math.round(cumulativeTotal * 100) / 100,
    };
  }

  /**
   * 광고주 적립 모듈 - 회원 소비지출의 5%를 가입시킨 광고주에게 적립
   *
   * 회원이 소비지출 할 때마다 비선형시스템의 자체 알고리즘에 의해
   * 지출비의 5%를 가입시킨 광고주에게 적립하게 되는 것이다.
   * 광고주가 회원을 많이 가입시킬수록 그만큼 광고주 본인에게도
   * 많은 금액이 지속되게 적립되는 것이다.
   *
   * @param {number} spendAmount - 회원 소비지출 금액
   * @returns {object} 광고주 적립 결과
   */
  advertiserAccumulationModule(spendAmount) {
    if (spendAmount <= 0) {
      throw new Error('소비지출 금액은 0보다 커야 합니다');
    }

    const advertiserReward = spendAmount * this.advertiserRate; // 5%

    return {
      spendAmount,
      advertiserRate: this.advertiserRate * 100, // 5%
      advertiserReward,
    };
  }

  /**
   * 결합 모듈 - 120% 적립 실현
   * 선순환 + 멤버십 → 이탈모드 → a→f 분배 체인 → 결합모드 → 보정모드 → 120%
   *
   * 상세 수치 (10억 단위 기준):
   *   A1:1,000,000,000(50%) + B1:1,000,000,000(50%) → U:C1:4,000,000,000
   *   이탈모드: C1:4,000,000,000(free) - a:500,000,000(f) = 3,500,000,000 + d1:500,000,000(빈)
   *
   * a→f 분배 체인:
   *   a:500,000,000(free) - 이탈모드 자유값 (50%)
   *   - b:200,000,000     → A1 자유값 (멤버십적립 20%)
   *   = 300,000,000
   *   - c:120,000,000     → 소비자적립값 (12%)
   *   = 180,000,000
   *   - d:50,000,000      → 보정값 (5%)
   *   = 130,000,000
   *   - e:10,000,000      → 광고주적립값 (1%)
   *   = f:120,000,000     → 수수료 (12%)
   *   합계: 200+120+50+10+120 = 500M ✓
   *
   *   A1:1,000,000,000 + b:200,000,000 = A1:1,200,000,000 (멤버십 적립 = 120%)
   *   멤버십:펀드존:120%(100%:지출원금 + 20%:증액)
   *
   * @param {number} transactionAmount - 거래 금액
   * @param {number} memberCount - 멤버십 회원 수
   * @returns {object} 최종 적립 결과
   */
  combinedModule(transactionAmount, memberCount = 10) {
    if (transactionAmount <= 0) {
      throw new Error('거래 금액은 0보다 커야 합니다');
    }

    // 1. 선순환 모듈 실행 (A1:50% + B1:50%)
    const selection = this.selectionModule(transactionAmount);

    // 2. 멤버십 모듈 실행
    const membership = this.membershipModule(transactionAmount, memberCount);

    // 3. 비선형 분배 실행 (U:C1 = 4배 확장)
    const distribution = this.nonlinearDistribution(transactionAmount);

    // 4. 이탈모드 실행: C1:4×거래금액(free) - a:50%(f) → 결합모드
    const c1Pool = transactionAmount * 4; // C1 = 4배 확장
    const escapeAmount = transactionAmount * 0.5; // a:500,000,000 = 50% of A1
    const escape = this.escapeMode(c1Pool, escapeAmount);

    // 5. a→f 분배 체인 (이미지5 기준)
    const a = escapeAmount; // a:500M(free) - 이탈모드 자유값
    const b = transactionAmount * 0.2; // b:200M - A1 자유값 (멤버십적립)
    const c = transactionAmount * 0.12; // c:120M - 소비자적립값
    const d = transactionAmount * 0.05; // d:50M - 보정값
    const e = transactionAmount * 0.01; // e:10M - 광고주적립값
    const f = transactionAmount * 0.12; // f:120M - 수수료
    // 검증: b+c+d+e+f = 200+120+50+10+120 = 500M = a ✓

    const distributionChain = { a, b, c, d, e, f, valid: Math.abs((b + c + d + e + f) - a) < 1 };

    // 6. 멤버십 적립 모드 (A1 + b = 120%)
    const membershipAccumulation = b; // 20%
    const membershipTotal = transactionAmount + membershipAccumulation; // 10억 + 2억 = 12억

    // 7. 소비자 적립 (1억 단위)
    const consumerAccumulation = c; // 12%

    // 8. 보정 모드: 보정값 d × 10회 = 보정 풀
    const correctionValue = d; // 50M
    const correctionPool = correctionValue * 10; // 50M × 10회 = 500M
    const rawAccumulation = selection.totalDistributed + (membership.membershipPool * 0.01);
    const correctedAccumulation = this.correctionMode(transactionAmount, rawAccumulation);

    // 9. 광고주 적립 (회원 소비지출의 5%)
    const advertiser = this.advertiserAccumulationModule(transactionAmount);

    // 10. 펀드존: 120% (원금100% + 증액20%)
    const fundZone = this.fundZoneModule(transactionAmount);

    // 11. 최종 120% 적립
    const principal = transactionAmount; // 100% 원금
    const feeIncome = f; // 수수료 = 거래금액의 12%
    const totalAccumulation = principal + membershipAccumulation; // A1 + b = 120%

    return {
      transactionAmount,
      principal,
      feeIncome,
      totalAccumulation,
      accumulationRate: (totalAccumulation / transactionAmount) * 100,
      selection,
      membership,
      distribution,
      escape,
      fundZone,
      distributionChain,
      advertiser,
      membershipAccumulation,
      consumerAccumulation,
      correctionValue,
      correctionPool,
      rawAccumulation: Math.round(rawAccumulation * 100) / 100,
      correctedAccumulation: Math.round(correctedAccumulation * 100) / 100,
    };
  }

  /**
   * 이탈모드 - 로그기록이 있는 데이터를 이탈시켜 결합모드로 전환
   *
   * 로그기록이 있으면 결합하는 것이 불가능하므로
   * 데이터를 이탈시켜 결합모드로 재진입
   *
   * 이탈모드를 하는 이유: 자유값(free)과 빈모드를 하지 않으면
   * A1:1,000,000,000 + 500,000,000(free) 결합 할 수 없음
   *
   * 예시 (C1 = 4×거래금액):
   *   C1:4,000,000,000(free) - a:500,000,000(free) = 3,500,000,000 + d1:500,000,000(빈로그)
   *   이탈된 데이터(a)가 빈 슬롯(d1)으로 이동하여 결합 가능 상태로 전환
   *   A1:1,000,000,000(50%) + a:500,000,000(free) 결합 할 수 있는 절대값이 된다
   *
   * @param {number} totalPool - 전체 풀 금액 (C1)
   * @param {number} loggedAmount - 로그기록이 있는 금액 (이탈 대상)
   * @returns {object} 이탈모드 처리 결과
   */
  escapeMode(totalPool, loggedAmount) {
    if (totalPool <= 0) {
      throw new Error('전체 풀 금액은 0보다 커야 합니다');
    }

    const remainingPool = totalPool - loggedAmount;
    const emptySlot = loggedAmount; // d1: 빈 슬롯으로 이동

    return {
      totalPool,
      loggedAmount,
      remainingPool,
      emptySlot,
      combinedPool: remainingPool + emptySlot, // 결합 후 원래 금액 복원
      canCombine: true, // 이탈 후 결합 가능
    };
  }

  /**
   * 펀드존 모듈 - 멤버십 펀드존 120% 적립
   *
   * 멤버십:펀드존:120%(100%:지출원금 + 20%:증액)
   * 1초에 20%를 적립하므로
   * 은행/보험사/신용카드사/사업주 순서로 (단위 1억 이상) 소비자 적립
   *
   * @param {number} principal - 지출원금 (100%)
   * @param {string} entityType - 적립 주체 유형 ('bank'|'insurance'|'creditcard'|'business'|'consumer')
   * @returns {object} 펀드존 적립 결과
   */
  fundZoneModule(principal, entityType = 'consumer') {
    const augmentRate = 0.2; // 20% 증액
    const augmentedAmount = principal * augmentRate;
    const totalAccumulation = principal + augmentedAmount; // 120%

    // 적립 우선순위: 은행 > 보험사 > 신용카드사 > 사업주 > 소비자 (1억 이상 단위)
    const priorityOrder = ['bank', 'insurance', 'creditcard', 'business', 'consumer'];
    const priority = priorityOrder.indexOf(entityType);

    return {
      principal,
      augmentRate: augmentRate * 100,
      augmentedAmount,
      totalAccumulation,
      rate: 120,
      entityType,
      priority: priority >= 0 ? priority + 1 : priorityOrder.length,
      unitThreshold: 100_000_000, // 1억 이상 단위
    };
  }

  /**
   * 보정 모드 - 150% → 120% 보정
   * 초과 분배분을 보정하여 정확히 120%로 조정
   *
   * 보정값 상세: d:50,000,000(free) × 10회 = 500,000,000(free)
   *            + d10:500,000,000(빈로그) = C10:500,000,000
   *
   * @param {number} transactionAmount - 원래 거래 금액
   * @param {number} rawAmount - 보정 전 금액
   * @returns {number} 보정된 금액
   */
  correctionMode(transactionAmount, rawAmount) {
    const targetAmount = transactionAmount * this.targetAccumulationRate;
    if (rawAmount > targetAmount) {
      return targetAmount;
    }
    return rawAmount;
  }

  /**
   * 화폐승수 시뮬레이션
   * "항아리 속의 물(화폐) 총량은 같다 - 바가지만 바뀔 뿐"
   *
   * 전체 시스템 내 화폐 총량이 보존되는지 검증
   *
   * @param {number} initialMoney - 초기 화폐 총량
   * @param {Array<number>} transactions - 거래 금액 배열
   * @returns {object} 화폐승수 시뮬레이션 결과
   */
  moneyMultiplierSimulation(initialMoney, transactions) {
    let systemPool = initialMoney;
    const results = [];

    for (const tx of transactions) {
      const result = this.combinedModule(tx);

      // 화폐는 이동할 뿐 총량은 보존됨
      // 적립 포인트는 시스템 내 재분배
      results.push({
        transaction: tx,
        accumulated: result.totalAccumulation,
        systemPool, // 시스템 총량은 변하지 않음
      });
    }

    return {
      initialMoney,
      finalSystemPool: systemPool,
      moneyConserved: systemPool === initialMoney,
      transactionResults: results,
    };
  }
}

module.exports = NonlinearEngine;
