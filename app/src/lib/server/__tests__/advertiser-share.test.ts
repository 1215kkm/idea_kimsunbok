import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeFirestore } from "./fake-firestore";

const fake = new FakeFirestore();

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

import type { Firestore, Transaction } from "firebase-admin/firestore";
import { applyAdminAction, createCampaign, redeemCampaignCode } from "../reward-service";
import { readAdvertiserShare, writeAdvertiserShare } from "../advertiser-share";

const ADV = "adv_1";
const db = fake as unknown as Firestore;

/** 지출 API 와 같은 순서: 읽기(광고주 찾기) → 쓰기(광고주 적립) */
async function spend(uid: string, amount: number) {
  return fake.runTransaction(async (ftx) => {
    const tx = ftx as unknown as Transaction;
    const share = await readAdvertiserShare(tx, db, uid, amount * 0.05);
    if (share) writeAdvertiserShare(tx, db, share, { consumerUid: uid, spendAmount: amount, spendTxId: "spend_1" });
    return share;
  });
}

beforeEach(async () => {
  fake.reset();
  fake.seed(`users/${ADV}`, { totalPoints: 1_000_000, lockedPoints: 0 });
  fake.seed(`transactions/dep_${ADV}`, { consumerId: ADV, type: "deposit", amount: 1_000_000, totalAccumulation: 1_000_000 });
  fake.seed("users/u1", { totalPoints: 0 });
  fake.seed("users/u2", { totalPoints: 0 });
  fake.seed("users/admin", { totalPoints: 0, role: "admin" });
  const c = await createCampaign(ADV, { kind: "new_member", unitAmount: 100_000, headcount: 3, channels: ["kakao"], copy: "가입 시 10만P" });
  await applyAdminAction(c.id, "approve", "admin");
  await redeemCampaignCode({ uid: "u1", email: "u1@example.com", emailVerified: true }, c.code);
});

describe("유치회원 지출 5% 광고주 적립", () => {
  it("캠페인 코드로 가입한 회원이 10만P 지출하면 광고주에게 5,000P 적립 + 내역 1건", async () => {
    const before = fake.read(`users/${ADV}`)!.totalPoints as number;
    const share = await spend("u1", 100_000);
    expect(share?.ownerUid).toBe(ADV);
    expect(fake.read(`users/${ADV}`)!.totalPoints).toBe(before + 5_000);
    const rows = fake.docsIn("transactions").filter((t) => t.data.type === "advertiser_share");
    expect(rows).toHaveLength(1);
    expect(rows[0].data).toMatchObject({ consumerId: ADV, amount: 5_000, totalAccumulation: 5_000, fromUid: "u1", spendAmount: 100_000 });
  });

  it("지출할 때마다 계속 쌓인다", async () => {
    const before = fake.read(`users/${ADV}`)!.totalPoints as number;
    await spend("u1", 100_000);
    await spend("u1", 30_000);
    expect(fake.read(`users/${ADV}`)!.totalPoints).toBe(before + 5_000 + 1_500);
  });

  it("유치 광고주가 없는 회원은 아무것도 적립하지 않는다", async () => {
    const before = fake.read(`users/${ADV}`)!.totalPoints as number;
    expect(await spend("u2", 100_000)).toBeNull();
    expect(fake.read(`users/${ADV}`)!.totalPoints).toBe(before);
    expect(fake.docsIn("transactions").some((t) => t.data.type === "advertiser_share")).toBe(false);
  });

  it("1P 미만은 버린다 (10P 지출 → 0P, 기록 없음)", async () => {
    expect(await spend("u1", 10)).toBeNull();
  });
});
