import { describe, expect, it } from "vitest";
import {
  ADMIN_TRANSITIONS,
  canRedeem,
  isValidChannels,
  lockAmount,
  nextStatus,
  normalizeEmail,
  remainingBudget,
  rewardTxDeltas,
  seoulDateKey,
  statusAfterPayout,
} from "../reward-ledger";

describe("reward-ledger (순수 계산, 모킹 없음)", () => {
  it("lockAmount = unitAmount × headcount, 허용 금액·인원만", () => {
    expect(lockAmount(10_000, 1)).toBe(10_000);
    expect(lockAmount(1_000_000, 10)).toBe(10_000_000);
    expect(lockAmount(10_000_000, 10_000)).toBe(100_000_000_000);
    expect(() => lockAmount(50_000, 1)).toThrow(RangeError);
    expect(() => lockAmount(10_000, 0)).toThrow(RangeError);
    expect(() => lockAmount(10_000, 1.5)).toThrow(RangeError);
    expect(() => lockAmount(10_000, 10_001)).toThrow(RangeError);
  });

  it("remainingBudget = locked − paid − refunded (누락 필드는 0)", () => {
    expect(remainingBudget({ budgetLocked: 300_000, budgetPaid: 100_000, budgetRefunded: 0 })).toBe(200_000);
    expect(remainingBudget({ budgetLocked: 300_000, budgetPaid: 200_000, budgetRefunded: 100_000 })).toBe(0);
    expect(remainingBudget({ budgetLocked: 300_000 } as never)).toBe(300_000);
  });

  it("리딤 가능 상태는 approved·live 뿐", () => {
    expect(canRedeem("approved")).toBe(true);
    expect(canRedeem("live")).toBe(true);
    for (const s of ["draft", "pending_review", "paused", "ended", "rejected"] as const) {
      expect(canRedeem(s)).toBe(false);
    }
  });

  it("상태 전이표", () => {
    expect(nextStatus("pending_review", "approve")).toBe("live");
    expect(nextStatus("pending_review", "reject")).toBe("rejected");
    expect(nextStatus("live", "pause")).toBe("paused");
    expect(nextStatus("paused", "resume")).toBe("live");
    expect(nextStatus("live", "end")).toBe("ended");
    expect(nextStatus("ended", "end")).toBeNull();
    expect(nextStatus("rejected", "approve")).toBeNull();
    expect(nextStatus("live", "approve")).toBeNull();
    // 반환이 일어나는 종착 상태로 가는 액션은 reject·end 둘 뿐
    const terminal = Object.entries(ADMIN_TRANSITIONS).filter(([, t]) => t.to === "ended" || t.to === "rejected");
    expect(terminal.map(([k]) => k).sort()).toEqual(["end", "reject"]);
  });

  it("지급 후 1인분 미만 남으면 ended", () => {
    const b = { budgetLocked: 200_000, budgetPaid: 200_000, budgetRefunded: 0 };
    expect(statusAfterPayout(b, 100_000, "live")).toBe("ended");
    expect(statusAfterPayout({ ...b, budgetPaid: 100_000 }, 100_000, "live")).toBe("live");
  });

  it("리워드 거래 4종의 잔액 변화 합은 lock→out→in 경로에서 0, lock→refund 경로에서도 0", () => {
    const sum = (types: Array<[Parameters<typeof rewardTxDeltas>[0], number]>) =>
      types.reduce(
        (acc, [t, a]) => {
          const d = rewardTxDeltas(t, a);
          return { total: acc.total + d.totalDelta, locked: acc.locked + d.lockedDelta };
        },
        { total: 0, locked: 0 },
      );
    expect(sum([["reward_lock", 100], ["reward_out", 100], ["reward_in", 100]])).toEqual({ total: 0, locked: 0 });
    expect(sum([["reward_lock", 100], ["reward_refund", 100]])).toEqual({ total: 0, locked: 0 });
  });

  it("이메일 정규화: 소문자, gmail 은 점·+태그 제거·googlemail 통일, 다른 도메인은 점 유지", () => {
    expect(normalizeEmail("  John.Doe+promo@Gmail.com ")).toBe("johndoe@gmail.com");
    expect(normalizeEmail("j.o.h.n@googlemail.com")).toBe("john@gmail.com");
    expect(normalizeEmail("First.Last+x@Example.COM")).toBe("first.last+x@example.com");
    expect(normalizeEmail("nodomain")).toBe("nodomain");
  });

  it("KST 날짜 키: UTC 15:00 = 한국 자정 경계", () => {
    expect(seoulDateKey(Date.UTC(2026, 8, 6, 14, 59, 59))).toBe("2026-09-06");
    expect(seoulDateKey(Date.UTC(2026, 8, 6, 15, 0, 0))).toBe("2026-09-07");
  });

  it("채널 검증: 비어 있거나 중복·미지원이면 거부", () => {
    expect(isValidChannels(["kakao", "naver"])).toBe(true);
    expect(isValidChannels([])).toBe(false);
    expect(isValidChannels(["kakao", "kakao"])).toBe(false);
    expect(isValidChannels(["tiktok"])).toBe(false);
    expect(isValidChannels("kakao")).toBe(false);
  });
});
