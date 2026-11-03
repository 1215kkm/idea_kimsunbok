import { describe, expect, it } from "vitest";
import { planSmallSpend } from "../small-spend";
import { depositLimitError, depositLimitFor } from "../deposit-limits";
import { calculateNonlinear } from "../nonlinear-engine";

describe("저장모드 (약관 제14조②)", () => {
  it("1,000원 이상은 바로 적립, 모아 둔 금액은 그대로", () => {
    expect(planSmallSpend(300, 5_000)).toEqual({ mode: "normal", processAmount: 5_000, nextPending: 300 });
  });

  it("1,000원 미만은 모아 두고 적립하지 않는다", () => {
    expect(planSmallSpend(0, 300)).toEqual({ mode: "stored", processAmount: 0, nextPending: 300 });
    expect(planSmallSpend(300, 400)).toEqual({ mode: "stored", processAmount: 0, nextPending: 700 });
  });

  it("모인 금액이 1,000원이 되면 전체를 한 번에 적립", () => {
    expect(planSmallSpend(700, 500)).toEqual({ mode: "released", processAmount: 1_200, nextPending: 0 });
    expect(planSmallSpend(999, 1)).toEqual({ mode: "released", processAmount: 1_000, nextPending: 0 });
  });

  it("300 + 400 + 500원 → 마지막에 1,200원의 120% = 1,440P", () => {
    let pending = 0;
    let earned = 0;
    for (const a of [300, 400, 500]) {
      const p = planSmallSpend(pending, a);
      pending = p.nextPending;
      if (p.processAmount > 0) earned += calculateNonlinear(p.processAmount).totalAccumulation;
    }
    expect(earned).toBe(1_440);
    expect(pending).toBe(0);
  });

  it("이상한 저장값은 0으로 본다", () => {
    expect(planSmallSpend(undefined, 100).nextPending).toBe(100);
    expect(planSmallSpend(-5, 100).nextPending).toBe(100);
  });
});

describe("충전 한도 (약관 제3조)", () => {
  it("일반회원: 1만 ~ 1억", () => {
    expect(depositLimitFor("personal")).toEqual({ min: 10_000, max: 100_000_000 });
    expect(depositLimitError(9_999, "personal")).toContain("10,000");
    expect(depositLimitError(10_000, "personal")).toBeNull();
    expect(depositLimitError(100_000_000, "personal")).toBeNull();
    expect(depositLimitError(100_000_001, "personal")).toContain("100,000,000");
  });

  it("기업회원: 10만부터", () => {
    expect(depositLimitError(50_000, "business")).toContain("기업회원");
    expect(depositLimitError(100_000, "business")).toBeNull();
    expect(depositLimitError(5_000_000_000, "business")).toBeNull();
  });

  it("구분이 없는 회원은 일반회원 한도", () => {
    expect(depositLimitFor(undefined).max).toBe(100_000_000);
  });
});
