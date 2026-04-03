const NonlinearEngine = require('../core/nonlinear-engine');

describe('비선형공식 분배 엔진', () => {
  let engine;

  beforeEach(() => {
    engine = new NonlinearEngine();
  });

  // ============================================
  // 선순환 모듈 테스트
  // ============================================
  describe('선순환 모듈 (Selection Module)', () => {
    test('1000원 거래 → 판매자 500원 + 소비자 500원 (50:50)', () => {
      const result = engine.selectionModule(1000);
      expect(result.sellerShare).toBe(500);
      expect(result.consumerShare).toBe(500);
      expect(result.totalDistributed).toBe(1000);
    });

    test('10000원 거래 → 판매자 5000원 + 소비자 5000원', () => {
      const result = engine.selectionModule(10000);
      expect(result.sellerShare).toBe(5000);
      expect(result.consumerShare).toBe(5000);
    });

    test('다양한 금액에서 분배 합계 = 거래금액', () => {
      const amounts = [100, 1000, 5000, 10000, 50000, 100000];
      for (const amount of amounts) {
        const result = engine.selectionModule(amount);
        expect(result.totalDistributed).toBe(amount);
      }
    });

    test('0원 이하 거래 시 에러', () => {
      expect(() => engine.selectionModule(0)).toThrow('거래 금액은 0보다 커야 합니다');
      expect(() => engine.selectionModule(-1000)).toThrow('거래 금액은 0보다 커야 합니다');
    });
  });

  // ============================================
  // 멤버십 모듈 테스트
  // ============================================
  describe('멤버십 모듈 (Membership Module)', () => {
    test('1000원 지출 → 멤버십 풀 10000원 (10배)', () => {
      const result = engine.membershipModule(1000, 10);
      expect(result.membershipPool).toBe(10000);
      expect(result.perMemberReward).toBe(1000);
    });

    test('멤버십 회원 수에 따른 1인당 리워드 계산', () => {
      const result1 = engine.membershipModule(1000, 5);
      expect(result1.perMemberReward).toBe(2000);

      const result2 = engine.membershipModule(1000, 100);
      expect(result2.perMemberReward).toBe(100);
    });

    test('0원 지출 시 에러', () => {
      expect(() => engine.membershipModule(0, 10)).toThrow('소비자 지출 금액은 0보다 커야 합니다');
    });

    test('회원 수 0명 시 에러', () => {
      expect(() => engine.membershipModule(1000, 0)).toThrow('멤버십 회원 수는 1 이상이어야 합니다');
    });
  });

  // ============================================
  // 비선형 분배 테스트
  // ============================================
  describe('비선형 다차함수 분배', () => {
    test('5회에 걸쳐 분배가 이루어짐', () => {
      const result = engine.nonlinearDistribution(10000);
      expect(result.rounds).toHaveLength(5);
    });

    test('각 회차마다 승수가 적용됨', () => {
      const result = engine.nonlinearDistribution(10000);
      expect(result.rounds[0].multiplier).toBe(1);
      expect(result.rounds[1].multiplier).toBe(1);
      expect(result.rounds[2].multiplier).toBe(2);
      expect(result.rounds[3].multiplier).toBe(2);
      expect(result.rounds[4].multiplier).toBe(4);
    });

    test('누적 합계가 증가함', () => {
      const result = engine.nonlinearDistribution(10000);
      for (let i = 1; i < result.rounds.length; i++) {
        expect(result.rounds[i].cumulativeTotal)
          .toBeGreaterThan(result.rounds[i - 1].cumulativeTotal);
      }
    });

    test('0원 이하 금액 시 에러', () => {
      expect(() => engine.nonlinearDistribution(0)).toThrow('기본 분배 금액은 0보다 커야 합니다');
    });
  });

  // ============================================
  // 결합 모듈 테스트 (핵심: 120% 적립)
  // ============================================
  describe('결합 모듈 - 120% 적립 (Combined Module)', () => {
    test('1000원 거래 → 1200원 적립 (120%)', () => {
      const result = engine.combinedModule(1000);
      expect(result.totalAccumulation).toBe(1200);
      expect(result.accumulationRate).toBe(120);
    });

    test('10000원 거래 → 12000원 적립 (120%)', () => {
      const result = engine.combinedModule(10000);
      expect(result.totalAccumulation).toBe(12000);
      expect(result.accumulationRate).toBe(120);
    });

    test('50000원 거래 → 60000원 적립 (120%)', () => {
      const result = engine.combinedModule(50000);
      expect(result.totalAccumulation).toBe(60000);
      expect(result.accumulationRate).toBe(120);
    });

    test('원금 100% + 수수료 12% (f값) 분리 확인', () => {
      const result = engine.combinedModule(10000);
      expect(result.principal).toBe(10000);    // 100% 원금
      expect(result.feeIncome).toBe(1200);      // 12% 수수료 (f값)
      expect(result.totalAccumulation).toBe(12000); // 120% 합계
    });

    test('모든 금액에서 정확히 120% 적립', () => {
      const amounts = [100, 500, 1000, 3000, 5000, 10000, 50000, 100000, 1000000];
      for (const amount of amounts) {
        const result = engine.combinedModule(amount);
        expect(result.accumulationRate).toBe(120);
        expect(result.totalAccumulation).toBe(amount * 1.2);
      }
    });

    test('결합 모듈 결과에 모든 하위 모듈 결과 포함', () => {
      const result = engine.combinedModule(10000);
      expect(result.selection).toBeDefined();
      expect(result.membership).toBeDefined();
      expect(result.distribution).toBeDefined();
    });
  });

  // ============================================
  // 보정 모드 테스트
  // ============================================
  describe('보정 모드 (150% → 120%)', () => {
    test('150%를 120%로 보정', () => {
      const corrected = engine.correctionMode(1000, 1500);
      expect(corrected).toBe(1200); // 120% = 1200원
    });

    test('120% 이하는 보정하지 않음', () => {
      const corrected = engine.correctionMode(1000, 1100);
      expect(corrected).toBe(1100); // 그대로 유지
    });

    test('정확히 120%인 경우 그대로 유지', () => {
      const corrected = engine.correctionMode(1000, 1200);
      expect(corrected).toBe(1200);
    });
  });

  // ============================================
  // 화폐승수 시뮬레이션 테스트
  // ============================================
  describe('화폐승수 시뮬레이션', () => {
    test('화폐 총량 보존 (항아리 속의 물 총량은 같다)', () => {
      const result = engine.moneyMultiplierSimulation(1000000, [1000, 5000, 10000]);
      expect(result.moneyConserved).toBe(true);
      expect(result.finalSystemPool).toBe(result.initialMoney);
    });

    test('여러 거래 후에도 시스템 풀 유지', () => {
      const transactions = [1000, 2000, 3000, 5000, 10000, 50000];
      const result = engine.moneyMultiplierSimulation(10000000, transactions);
      expect(result.transactionResults).toHaveLength(6);
      expect(result.moneyConserved).toBe(true);
    });

    test('각 거래마다 120% 적립 확인', () => {
      const transactions = [1000, 5000, 10000];
      const result = engine.moneyMultiplierSimulation(1000000, transactions);
      for (const txResult of result.transactionResults) {
        expect(txResult.accumulated).toBe(txResult.transaction * 1.2);
      }
    });
  });

  // ============================================
  // 커스텀 설정 테스트
  // ============================================
  describe('커스텀 설정', () => {
    test('판매자:소비자 비율 변경 (60:40)', () => {
      const customEngine = new NonlinearEngine({
        sellerRate: 0.6,
        consumerRate: 0.4,
      });
      const result = customEngine.selectionModule(10000);
      expect(result.sellerShare).toBe(6000);
      expect(result.consumerShare).toBe(4000);
    });

    test('멤버십 배수 변경 (20배)', () => {
      const customEngine = new NonlinearEngine({
        membershipMultiplier: 20,
      });
      const result = customEngine.membershipModule(1000, 10);
      expect(result.membershipPool).toBe(20000);
    });

    test('기본 설정값 확인', () => {
      expect(engine.sellerRate).toBe(0.5);
      expect(engine.consumerRate).toBe(0.5);
      expect(engine.membershipMultiplier).toBe(10);
      expect(engine.distributionRounds).toBe(5);
      expect(engine.targetAccumulationRate).toBe(1.2);
    });
  });

  // ============================================
  // 엣지 케이스 테스트
  // ============================================
  describe('엣지 케이스', () => {
    test('소수점 금액 처리', () => {
      const result = engine.combinedModule(999.99);
      expect(result.accumulationRate).toBe(120);
    });

    test('매우 큰 금액 처리 (1억원)', () => {
      const result = engine.combinedModule(100000000);
      expect(result.totalAccumulation).toBe(120000000);
      expect(result.accumulationRate).toBe(120);
    });

    test('매우 작은 금액 처리 (1원)', () => {
      const result = engine.combinedModule(1);
      expect(result.totalAccumulation).toBe(1.2);
      expect(result.accumulationRate).toBe(120);
    });
  });

  // ============================================
  // 광고주 적립 모듈 테스트 (NEW)
  // ============================================
  describe('광고주 적립 모듈 (5%)', () => {
    test('10000원 지출 → 광고주 적립 500원 (5%)', () => {
      const result = engine.advertiserAccumulationModule(10000);
      expect(result.advertiserReward).toBe(500);
      expect(result.advertiserRate).toBe(5);
    });

    test('10억원 지출 → 광고주 적립 5천만 (5%)', () => {
      const result = engine.advertiserAccumulationModule(1000000000);
      expect(result.advertiserReward).toBe(50000000);
    });

    test('0원 이하 지출 시 에러', () => {
      expect(() => engine.advertiserAccumulationModule(0)).toThrow('소비지출 금액은 0보다 커야 합니다');
      expect(() => engine.advertiserAccumulationModule(-100)).toThrow('소비지출 금액은 0보다 커야 합니다');
    });
  });

  // ============================================
  // a→f 분배 체인 테스트 (NEW)
  // ============================================
  describe('a→f 분배 체인', () => {
    test('10억원 → a:5억, b:2억, c:1.2억, d:5천만, e:1천만, f:1.2억', () => {
      const result = engine.combinedModule(1000000000);
      const chain = result.distributionChain;
      expect(chain.a).toBe(500000000);
      expect(chain.b).toBe(200000000);
      expect(chain.c).toBe(120000000);
      expect(chain.d).toBe(50000000);
      expect(chain.e).toBe(10000000);
      expect(chain.f).toBe(120000000);
    });

    test('b+c+d+e+f = a 검증 (모든 금액)', () => {
      const amounts = [1000, 10000, 100000, 1000000, 1000000000];
      for (const amount of amounts) {
        const result = engine.combinedModule(amount);
        expect(result.distributionChain.valid).toBe(true);
        const chain = result.distributionChain;
        expect(chain.b + chain.c + chain.d + chain.e + chain.f).toBeCloseTo(chain.a, 0);
      }
    });

    test('비율 검증: b=20%, c=12%, d=5%, e=1%, f=12%', () => {
      const amount = 100000;
      const result = engine.combinedModule(amount);
      const chain = result.distributionChain;
      expect(chain.b / amount).toBeCloseTo(0.2, 5);
      expect(chain.c / amount).toBeCloseTo(0.12, 5);
      expect(chain.d / amount).toBeCloseTo(0.05, 5);
      expect(chain.e / amount).toBeCloseTo(0.01, 5);
      expect(chain.f / amount).toBeCloseTo(0.12, 5);
    });
  });

  // ============================================
  // 이탈모드 수치 테스트 (NEW)
  // ============================================
  describe('이탈모드 수치 보정', () => {
    test('C1 = 4×거래금액', () => {
      const result = engine.combinedModule(1000000000);
      expect(result.escape.totalPool).toBe(4000000000);
    });

    test('이탈액 = 50% (= a값)', () => {
      const result = engine.combinedModule(1000000000);
      expect(result.escape.loggedAmount).toBe(500000000);
      expect(result.distributionChain.a).toBe(500000000);
    });

    test('이탈 후 결합 가능', () => {
      const result = engine.escapeMode(4000000000, 500000000);
      expect(result.canCombine).toBe(true);
      expect(result.combinedPool).toBe(4000000000);
      expect(result.remainingPool).toBe(3500000000);
      expect(result.emptySlot).toBe(500000000);
    });
  });

  // ============================================
  // 보정모드 + 펀드존 테스트 (NEW)
  // ============================================
  describe('보정모드 + 펀드존', () => {
    test('보정값 d × 10회 = 보정풀', () => {
      const result = engine.combinedModule(1000000000);
      expect(result.correctionValue).toBe(50000000);
      expect(result.correctionPool).toBe(500000000);
    });

    test('펀드존: 120% = 원금100% + 증액20%', () => {
      const result = engine.fundZoneModule(1000000000);
      expect(result.principal).toBe(1000000000);
      expect(result.augmentRate).toBe(20);
      expect(result.augmentedAmount).toBe(200000000);
      expect(result.totalAccumulation).toBe(1200000000);
      expect(result.rate).toBe(120);
    });

    test('펀드존 우선순위: bank > insurance > creditcard > business > consumer', () => {
      expect(engine.fundZoneModule(1000, 'bank').priority).toBe(1);
      expect(engine.fundZoneModule(1000, 'insurance').priority).toBe(2);
      expect(engine.fundZoneModule(1000, 'creditcard').priority).toBe(3);
      expect(engine.fundZoneModule(1000, 'business').priority).toBe(4);
      expect(engine.fundZoneModule(1000, 'consumer').priority).toBe(5);
    });
  });
});
