import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeFirestore } from "./fake-firestore";

const fake = new FakeFirestore();
let approvals: Array<Record<string, string>> = [];

vi.mock("../firebase-admin", () => ({
  adminDb: () => fake,
  adminAuth: () => {
    throw new Error("not used in tests");
  },
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: () => Date.now(),
    increment: (n: number) => ({ __increment: n }),
    delete: () => ({ __delete: true }),
  },
}));

vi.mock("../codef", () => ({
  codefEncrypt: (s: string) => s,
  codefRequest: async () => ({ result: { code: "CF-00000" }, data: { resApprovalList: approvals } }),
  isCodefSuccess: () => true,
}));

import { syncCardTransactions } from "../card-service";

const UID = "u1";
const item = (no: string, amount: number, cancel = "0") => ({
  resApprovalNo: no,
  resUsedDate: "20261101",
  resUsedAmount: String(amount),
  resCancelYN: cancel,
  resMemberStoreName: "가게",
});
const points = () => Number(fake.read(`users/${UID}`)?.totalPoints);

beforeEach(() => {
  fake.reset();
  fake.seed(`users/${UID}`, { totalPoints: 0, codefConnectedId: "cid", codefCardOrg: "shinhan" });
});

describe("카드 취소 STOP (약관 제6조②)", () => {
  it("적립된 승인이 취소되면 적립을 회수하고 한 번만 처리한다", async () => {
    approvals = [item("A1", 10_000)];
    await syncCardTransactions(UID);
    expect(points()).toBe(12_000);

    approvals = [item("A1", 10_000, "1")];
    const r = await syncCardTransactions(UID);
    expect(r.canceled).toBe(1);
    expect(points()).toBe(0);
    const cancelTx = fake.docsIn("transactions").find((t) => t.data.type === "spend_cancel");
    expect(cancelTx?.data.totalAccumulation).toBe(-12_000);

    const again = await syncCardTransactions(UID);
    expect(again.canceled).toBe(0);
    expect(points()).toBe(0);
  });

  it("같은 목록에 정상건과 취소건이 함께 오면 적립하지 않는다", async () => {
    approvals = [item("B1", 10_000, "1"), item("B1", 10_000)];
    const r = await syncCardTransactions(UID);
    expect(r.imported).toBe(0);
    expect(points()).toBe(0);
  });

  it("잔액이 모자라면 있는 만큼만 회수하고 모자란 금액을 남긴다", async () => {
    approvals = [item("C1", 10_000)];
    await syncCardTransactions(UID);
    fake.seed(`users/${UID}`, { ...fake.read(`users/${UID}`), totalPoints: 5_000 });

    approvals = [item("C1", 10_000, "1")];
    await syncCardTransactions(UID);
    expect(points()).toBe(0);
    const orig = fake.docsIn("transactions").find((t) => t.data.cardApprovalNo === "C1");
    expect(orig?.data.cancelRecovered).toBe(5_000);
    expect(orig?.data.cancelShortfall).toBe(7_000);
  });
});
