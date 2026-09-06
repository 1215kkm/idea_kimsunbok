/**
 * 데모 모드 관리자 경로 — localStorage 시드 → 승인/거절/종료 → 총량 정합(좌변 = 우변) 유지.
 * admin-data.getTotals 는 실서버 ledger/totals 와 같은 byType 규칙으로 데모 데이터를 집계한다.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

class MemoryStorage implements Storage {
  private m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  clear() {
    this.m.clear();
  }
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  key(i: number) {
    return Array.from(this.m.keys())[i] ?? null;
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
}

vi.stubGlobal("window", {});
vi.stubGlobal("localStorage", new MemoryStorage());

const demo = await import("@/lib/demo-store");
const data = await import("@/lib/admin-data");

const ADV = { email: demo.DEMO_ADVERTISER_EMAIL };

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("daland-demo-user", JSON.stringify({ displayName: "체험 사용자", email: "demo@dataland.kr" }));
  demo.getBalance({ email: "demo@dataland.kr" }); // 현재 사용자 잔액 시드
});

describe("demo admin: seed", () => {
  it("시드 캠페인 2건 + 광고주 지출 2건이 있고 좌변 = 우변", async () => {
    expect(data.ADMIN_MODE).toBe("demo");
    const campaigns = await data.listCampaigns("all");
    expect(campaigns.map((c) => c.status).sort()).toEqual(["live", "pending_review"]);
    expect(demo.getTransactions(ADV)).toHaveLength(2);
    // 광고주: 100만 − 잠금 30만 + (−5만 +6만) + (−3만 +3.6만) = 716,000
    expect(demo.getBalance(ADV)).toBe(716_000);
    expect(demo.getLockedBalance(ADV)).toBe(300_000);
    const t = await data.getTotals();
    expect(t.diff).toBe(0);
    expect(t.rewardNet).toBe(0);
    expect(t.left.userCount).toBe(2);
    expect(t.warnings.filter((w) => w.includes("불일치"))).toHaveLength(0);
  });

  it("대시보드: 승인 대기 1건, 최근 활동에 캠페인 제출 + 지출이 섞여 최신순", async () => {
    const d = await data.getDashboard();
    expect(d.pendingCampaigns).toBe(1);
    expect(d.recent.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < d.recent.length; i++) expect(d.recent[i - 1].at! >= d.recent[i].at!).toBe(true);
    expect(d.recent.some((r) => r.type === "reward_lock")).toBe(true);
    expect(d.recent.some((r) => r.type === "spend")).toBe(true);
  });
});

describe("demo admin: actions keep the ledger balanced", () => {
  it("approve → live, 잔액·잠금 변화 없음", async () => {
    const r = await data.campaignAction("DEMOWAIT", "approve");
    expect(r).toMatchObject({ from: "pending_review", to: "live", refunded: 0 });
    expect(demo.getLockedBalance(ADV)).toBe(300_000);
    expect((await data.getTotals()).diff).toBe(0);
  });

  it("reject(사유) → rejected, 잠금 20만 → 광고주 잔액 반환, 사유 저장", async () => {
    const r = await data.campaignAction("DEMOWAIT", "reject", "문구 위반");
    expect(r).toMatchObject({ to: "rejected", refunded: 200_000 });
    expect(demo.getBalance(ADV)).toBe(916_000);
    expect(demo.getLockedBalance(ADV)).toBe(100_000);
    const c = (await data.listCampaigns("all")).find((x) => x.id === "DEMOWAIT")!;
    expect(c.rejectReason).toBe("문구 위반");
    expect(c.budgetRefunded).toBe(200_000);
    expect((await data.getTotals()).diff).toBe(0);
  });

  it("리딤 1건 후 end → 잔여만 반환, 지급내역 1건, 정합 유지", async () => {
    const red = demo.redeemCampaign({ email: "demo@dataland.kr" }, "DEMO2026");
    expect(red.ok).toBe(true);
    const payouts = await data.listPayouts("DEMO2026");
    expect(payouts).toHaveLength(1);
    expect(payouts[0]).toMatchObject({ inviteeEmail: "demo@dataland.kr", amount: 10_000 });
    const r = await data.campaignAction("DEMO2026", "end", "광고주 요청");
    expect(r).toMatchObject({ to: "ended", refunded: 90_000 });
    expect(demo.getLockedBalance(ADV)).toBe(200_000); // DEMOWAIT 잠금만 남음
    const t = await data.getTotals();
    expect(t.diff).toBe(0);
    expect(t.byType.reward_in.amount).toBe(10_000);
    expect(t.byType.reward_refund.amount).toBe(90_000);
  });

  it("잘못된 전이(ended 캠페인 pause)는 INVALID_STATE 로 거부", async () => {
    await data.campaignAction("DEMOWAIT", "reject", "x");
    await expect(data.campaignAction("DEMOWAIT", "pause")).rejects.toMatchObject({ code: "INVALID_STATE" });
  });

  it("일일 상한 변경이 목록에 반영", async () => {
    await data.setDailyCap("DEMO2026", 3);
    const c = (await data.listCampaigns("all")).find((x) => x.id === "DEMO2026")!;
    expect(c.dailyCap).toBe(3);
  });

  it("출금(deductBalance) 도 우변에 기록되어 정합 유지", async () => {
    demo.deductBalance({ email: "demo@dataland.kr" }, 50_000);
    const t = await data.getTotals();
    expect(t.byType.withdrawal_request.amount).toBe(50_000);
    expect(t.diff).toBe(0);
  });
});
