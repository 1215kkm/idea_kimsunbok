import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeFirestore } from "./fake-firestore";

// --- firebase-admin 모킹: 실제 네트워크·서비스 계정 없이 in-memory 트랜잭션 ---
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

import { ApiError } from "../api-error";
import {
  applyAdminAction,
  cancelCampaign,
  createCampaign,
  emailPayoutKey,
  redeemCampaignCode,
  setCampaignDailyCap,
  type CreateCampaignInput,
  type Invitee,
} from "../reward-service";
import { requestWithdrawal } from "../withdraw-service";
import { rewardTxDeltas, type RewardTxType } from "@/lib/reward-ledger";

const ADV = "adv_1";
const BASE: CreateCampaignInput = {
  kind: "new_member",
  unitAmount: 100_000,
  headcount: 3,
  channels: ["kakao"],
  copy: "가입 시 10만P 지급",
};
const BANK = { bank: "kakao", accountNumber: "3333-01-1234567", holder: "홍길동" };

function who(uid: string, email = `${uid}@example.com`, emailVerified = true): Invitee {
  return { uid, email, emailVerified };
}

async function expectApiError(p: Promise<unknown>, code: string, status?: number) {
  try {
    await p;
  } catch (err) {
    expect(err).toBeInstanceOf(ApiError);
    const e = err as ApiError;
    expect(e.code).toBe(code);
    if (status !== undefined) expect(e.status).toBe(status);
    return e;
  }
  throw new Error(`expected ApiError ${code} but resolved`);
}

/** transactions 로부터 잔액 변화를 재계산 → 실제 users 값과 맞는지 (원장 ↔ 잔액 정합) */
function replayRewardTransactions() {
  const totals = new Map<string, { total: number; locked: number }>();
  for (const { data } of fake.docsIn("transactions")) {
    if (!String(data.type).startsWith("reward_")) continue;
    const uid = data.consumerId as string;
    const cur = totals.get(uid) ?? { total: 0, locked: 0 };
    const d = rewardTxDeltas(data.type as RewardTxType, data.amount as number);
    cur.total += d.totalDelta;
    cur.locked += d.lockedDelta;
    totals.set(uid, cur);
  }
  return totals;
}

/** 광고주 자격용 입금 거래 시드 (deposit API 가 남기는 형태 그대로) */
function seedDeposit(uid: string, amount: number, id = `dep_${uid}_${amount}`) {
  fake.seed(`transactions/${id}`, { consumerId: uid, type: "deposit", amount, totalAccumulation: amount, method: "beta_virtual" });
}

async function liveCampaign(input: Partial<CreateCampaignInput> = {}) {
  const created = await createCampaign(ADV, { ...BASE, ...input });
  await applyAdminAction(created.id, "approve", "admin");
  return created;
}

beforeEach(() => {
  fake.reset();
  fake.seed(`users/${ADV}`, { totalPoints: 1_000_000, lockedPoints: 0 });
  seedDeposit(ADV, 1_000_000);
  fake.seed("users/u1", { totalPoints: 0 });
  fake.seed("users/u2", { totalPoints: 50_000 });
  fake.seed("users/u3", { totalPoints: 0 });
  fake.seed("users/admin", { totalPoints: 0, role: "admin" });
});

describe("reward-service — 제로섬 원장", () => {
  it("(a) 생성→승인→리딤→종료 전 과정에서 Σ(totalPoints + lockedPoints) 불변, 광고주 순변화 = −지급액", async () => {
    const before = fake.ledgerTotal();
    expect(before).toBe(1_050_000);

    const created = await createCampaign(ADV, BASE);
    expect(created.budgetLocked).toBe(300_000);
    expect(created.newBalance).toBe(700_000);
    expect(created.lockedPoints).toBe(300_000);
    expect(fake.ledgerTotal()).toBe(before);
    expect(fake.read(`rewardCampaigns/${created.id}`)?.status).toBe("pending_review");

    await applyAdminAction(created.id, "approve", "admin");
    expect(fake.read(`rewardCampaigns/${created.id}`)?.status).toBe("live");
    expect(fake.ledgerTotal()).toBe(before);

    const r1 = await redeemCampaignCode(who("u1"), created.code);
    expect(r1.amount).toBe(100_000);
    expect(r1.newBalance).toBe(100_000);
    expect(fake.ledgerTotal()).toBe(before);
    expect(fake.read(`users/${ADV}`)).toMatchObject({ totalPoints: 700_000, lockedPoints: 200_000 });

    const r2 = await redeemCampaignCode(who("u2"), created.code.toLowerCase()); // 소문자 입력도 허용
    expect(r2.newBalance).toBe(150_000);
    expect(fake.ledgerTotal()).toBe(before);

    // 잔여 1인분 남기고 종료 → 100,000 반환
    const ended = await applyAdminAction(created.id, "end", "admin", "모집 마감");
    expect(ended).toMatchObject({ from: "live", to: "ended", refunded: 100_000 });
    expect(fake.read(`users/${ADV}`)).toMatchObject({ totalPoints: 800_000, lockedPoints: 0 });
    expect(fake.read(`rewardCampaigns/${created.id}`)).toMatchObject({
      status: "ended",
      endReason: "모집 마감",
      budgetLocked: 300_000,
      budgetPaid: 200_000,
      budgetRefunded: 100_000,
      paidCount: 2,
    });
    expect(fake.ledgerTotal()).toBe(before);

    // 광고주에게 되돌아온 포인트 없음: 시작 1,000,000 → 800,000 (= 회원 2명 × 100,000 이전)
    expect(fake.read(`users/${ADV}`)?.totalPoints).toBe(1_000_000 - 200_000);

    // transactions 로 재생한 잔액 변화 == 실제 users 변화
    const replay = replayRewardTransactions();
    expect(replay.get(ADV)).toEqual({ total: -200_000, locked: 0 });
    expect(replay.get("u1")).toEqual({ total: 100_000, locked: 0 });
    expect(replay.get("u2")).toEqual({ total: 100_000, locked: 0 });
    const types = fake
      .docsIn("transactions")
      .map((t) => t.data.type)
      .filter((t) => String(t).startsWith("reward_"))
      .sort();
    expect(types).toEqual(["reward_in", "reward_in", "reward_lock", "reward_out", "reward_out", "reward_refund"]);

    // 감사 로그 2건 (approve, end) — before/after 상태 기록
    const logs = fake.docsIn("adminAuditLogs").map((l) => l.data);
    expect(logs.map((l) => l.action).sort()).toEqual(["reward_campaign.approve", "reward_campaign.end"]);
    const endLog = logs.find((l) => l.action === "reward_campaign.end")!;
    expect(endLog).toMatchObject({
      adminUid: "admin",
      target: `rewardCampaigns/${created.id}`,
      reason: "모집 마감",
      before: { status: "live", budgetPaid: 200_000 },
      after: { status: "ended", refund: 100_000 },
    });
    // 지급 기록 2건, 문서 ID = inviteeUid / 이메일 해시 키 2건
    expect(fake.docsIn("rewardPayouts").map((p) => p.id).sort()).toEqual(["u1", "u2"]);
    expect(fake.docsIn("rewardPayoutKeys")).toHaveLength(2);
  });

  it("(b) 잔액 부족 시 생성 거부 (409 INSUFFICIENT_BALANCE), 아무것도 안 바뀜", async () => {
    const before = fake.ledgerTotal();
    const e = await expectApiError(
      createCampaign(ADV, { ...BASE, unitAmount: 1_000_000, headcount: 2 }),
      "INSUFFICIENT_BALANCE",
      409,
    );
    expect(e.details).toMatchObject({ required: 2_000_000, current: 1_000_000 });
    expect(fake.read(`users/${ADV}`)).toMatchObject({ totalPoints: 1_000_000, lockedPoints: 0 });
    expect(fake.docsIn("rewardCampaigns")).toHaveLength(0);
    expect(fake.docsIn("transactions").filter((t) => t.data.type !== "deposit")).toHaveLength(0);
    expect(fake.ledgerTotal()).toBe(before);
  });

  it("(c) 1인 1회 멱등 — 2회째 409 ALREADY_REDEEMED, 구 inviteRedemptions 있어도 거부, 이메일 변형도 거부", async () => {
    const created = await liveCampaign();
    const before = fake.ledgerTotal();

    await redeemCampaignCode(who("u1", "John.Doe+promo@gmail.com"), created.code);
    await expectApiError(redeemCampaignCode(who("u1", "John.Doe+promo@gmail.com"), created.code), "ALREADY_REDEEMED", 409);
    expect(fake.read("users/u1")?.totalPoints).toBe(100_000);

    // 다른 캠페인 코드로도 재수령 불가
    const second = await liveCampaign({ headcount: 1 });
    await expectApiError(redeemCampaignCode(who("u1", "John.Doe+promo@gmail.com"), second.code), "ALREADY_REDEEMED", 409);

    // 다른 uid 지만 같은 사람의 gmail 변형 (점·+태그 제거 후 동일) → 이메일 해시 키로 차단
    fake.seed("users/u9", { totalPoints: 0 });
    await expectApiError(redeemCampaignCode(who("u9", "johndoe@googlemail.com"), created.code), "ALREADY_REDEEMED", 409);
    await expectApiError(redeemCampaignCode(who("u9", "JOHNDOE+x@gmail.com"), created.code), "ALREADY_REDEEMED", 409);
    expect(fake.read("users/u9")?.totalPoints).toBe(0);
    expect(emailPayoutKey("John.Doe+promo@gmail.com")).toBe(emailPayoutKey("johndoe@googlemail.com"));
    // gmail 이 아닌 도메인은 점을 살린다 (다른 사람)
    expect(emailPayoutKey("a.b@example.com")).not.toBe(emailPayoutKey("ab@example.com"));

    // 베타 시절 구 초대로 받은 회원
    fake.seed("inviteRedemptions/u3", { inviteeUid: "u3", code: "OLDCODE1" });
    await expectApiError(redeemCampaignCode(who("u3"), created.code), "ALREADY_REDEEMED", 409);
    expect(fake.read("users/u3")?.totalPoints).toBe(0);

    expect(fake.read(`rewardCampaigns/${created.id}`)?.paidCount).toBe(1);
    expect(fake.ledgerTotal()).toBe(before);
  });

  it("(d) 자기 코드 거부 (400 SELF_INVITE)", async () => {
    const created = await liveCampaign();
    await expectApiError(redeemCampaignCode(who(ADV), created.code), "SELF_INVITE", 400);
    expect(fake.read(`users/${ADV}`)).toMatchObject({ totalPoints: 700_000, lockedPoints: 300_000 });
    expect(fake.docsIn("rewardPayouts")).toHaveLength(0);
  });

  it("(e) 승인 전(pending_review)·일시정지·거절 상태에서는 리딤 거부 (409 CAMPAIGN_NOT_ACTIVE)", async () => {
    const created = await createCampaign(ADV, BASE);
    await expectApiError(redeemCampaignCode(who("u1"), created.code), "CAMPAIGN_NOT_ACTIVE", 409);

    await applyAdminAction(created.id, "approve", "admin");
    await applyAdminAction(created.id, "pause", "admin");
    await expectApiError(redeemCampaignCode(who("u1"), created.code), "CAMPAIGN_NOT_ACTIVE", 409);

    await applyAdminAction(created.id, "resume", "admin");
    await redeemCampaignCode(who("u1"), created.code); // 재개 후에는 됨
    expect(fake.read("users/u1")?.totalPoints).toBe(100_000);

    // 없는 코드 / 형식 오류
    await expectApiError(redeemCampaignCode(who("u2"), "ZZZZZZZZ"), "NOT_FOUND", 404);
    await expectApiError(redeemCampaignCode(who("u2"), "short"), "INVALID_INPUT", 400);
  });

  it("(f) 거절 시 전액 반환 + 감사 로그 + reward_refund 거래, reason 없으면 400", async () => {
    const before = fake.ledgerTotal();
    const created = await createCampaign(ADV, BASE);

    await expectApiError(applyAdminAction(created.id, "reject", "admin"), "INVALID_INPUT", 400);
    await expectApiError(applyAdminAction(created.id, "reject", "admin", "   "), "INVALID_INPUT", 400);
    expect(fake.read(`rewardCampaigns/${created.id}`)?.status).toBe("pending_review");

    const res = await applyAdminAction(created.id, "reject", "admin", "문구 부적절");
    expect(res).toMatchObject({ from: "pending_review", to: "rejected", refunded: 300_000 });
    expect(fake.read(`users/${ADV}`)).toMatchObject({ totalPoints: 1_000_000, lockedPoints: 0 });
    expect(fake.read(`rewardCampaigns/${created.id}`)).toMatchObject({
      status: "rejected",
      rejectReason: "문구 부적절",
      budgetRefunded: 300_000,
    });
    const refunds = fake.docsIn("transactions").filter((t) => t.data.type === "reward_refund");
    expect(refunds).toHaveLength(1);
    expect(refunds[0].data).toMatchObject({ consumerId: ADV, amount: 300_000, totalAccumulation: 300_000, reason: "admin_reject" });
    const logs = fake.docsIn("adminAuditLogs");
    expect(logs).toHaveLength(1);
    expect(logs[0].data).toMatchObject({ adminUid: "admin", action: "reward_campaign.reject", reason: "문구 부적절" });
    expect(fake.ledgerTotal()).toBe(before);

    // 거절된 건은 다시 승인·거절 불가
    await expectApiError(applyAdminAction(created.id, "approve", "admin"), "INVALID_STATE", 409);
    await expectApiError(applyAdminAction(created.id, "reject", "admin", "x"), "INVALID_STATE", 409);
    // 리딤도 불가
    await expectApiError(redeemCampaignCode(who("u1"), created.code), "CAMPAIGN_NOT_ACTIVE", 409);
  });

  it("(g) 예산 소진 시 status ended, 이후 리딤은 CAMPAIGN_NOT_ACTIVE, 종료 시 반환액 0", async () => {
    const before = fake.ledgerTotal();
    const created = await liveCampaign({ headcount: 2 });

    const r1 = await redeemCampaignCode(who("u1"), created.code);
    expect(r1.campaignStatus).toBe("live");
    const r2 = await redeemCampaignCode(who("u2"), created.code);
    expect(r2.campaignStatus).toBe("ended");
    expect(fake.read(`rewardCampaigns/${created.id}`)).toMatchObject({
      status: "ended",
      endReason: "headcount_reached",
      budgetPaid: 200_000,
      paidCount: 2,
    });
    expect(fake.read(`users/${ADV}`)).toMatchObject({ totalPoints: 800_000, lockedPoints: 0 });

    await expectApiError(redeemCampaignCode(who("u3"), created.code), "CAMPAIGN_NOT_ACTIVE", 409);
    // 이미 ended 라 관리자 end 도 상태 오류 (이중 반환 방지)
    await expectApiError(applyAdminAction(created.id, "end", "admin", "x"), "INVALID_STATE", 409);
    expect(fake.docsIn("transactions").filter((t) => t.data.type === "reward_refund")).toHaveLength(0);
    expect(fake.ledgerTotal()).toBe(before);
  });
});

describe("reward-service — 강체크 감사 게이트", () => {
  it("#2 이메일 미인증이면 403 EMAIL_NOT_VERIFIED, 아무것도 안 바뀜", async () => {
    const created = await liveCampaign();
    const before = fake.ledgerTotal();
    await expectApiError(redeemCampaignCode(who("u1", "u1@example.com", false), created.code), "EMAIL_NOT_VERIFIED", 403);
    await expectApiError(redeemCampaignCode({ uid: "u1", email: null, emailVerified: true }, created.code), "EMAIL_NOT_VERIFIED", 403);
    expect(fake.read("users/u1")?.totalPoints).toBe(0);
    expect(fake.docsIn("rewardPayouts")).toHaveLength(0);
    expect(fake.ledgerTotal()).toBe(before);
  });

  it("#2 캠페인당 일일 지급 상한 — 기본 10, 초과 시 429, 날짜 바뀌면 리셋, 관리자가 상한 변경 가능", async () => {
    const created = await liveCampaign({ unitAmount: 10_000, headcount: 100 });
    const day1 = Date.UTC(2026, 8, 6, 3, 0, 0); // 2026-09-06 12:00 KST
    for (let i = 0; i < 10; i++) {
      fake.seed(`users/d${i}`, { totalPoints: 0 });
      await redeemCampaignCode(who(`d${i}`), created.code, day1);
    }
    fake.seed("users/d10", { totalPoints: 0 });
    const e = await expectApiError(redeemCampaignCode(who("d10"), created.code, day1), "DAILY_CAP_REACHED", 429);
    expect(e.details).toMatchObject({ dailyCap: 10, date: "2026-09-06" });
    expect(fake.read(`rewardCampaigns/${created.id}`)).toMatchObject({ paidCount: 10, dailyPaid: { date: "2026-09-06", count: 10 } });

    // KST 자정 넘김 (UTC 15:00 = KST 00:00 다음날)
    const day2 = Date.UTC(2026, 8, 6, 15, 0, 1);
    await redeemCampaignCode(who("d10"), created.code, day2);
    expect(fake.read(`rewardCampaigns/${created.id}`)).toMatchObject({ paidCount: 11, dailyPaid: { date: "2026-09-07", count: 1 } });

    // 관리자가 상한 1 로 낮추면 같은 날 추가 지급 불가, 감사 로그 남음
    await setCampaignDailyCap(created.id, "admin", 1);
    fake.seed("users/d11", { totalPoints: 0 });
    await expectApiError(redeemCampaignCode(who("d11"), created.code, day2), "DAILY_CAP_REACHED", 429);
    await expectApiError(setCampaignDailyCap(created.id, "admin", 0), "INVALID_INPUT", 400);
    const capLog = fake.docsIn("adminAuditLogs").find((l) => l.data.action === "reward_campaign.set_daily_cap")!;
    expect(capLog.data).toMatchObject({ before: { dailyCap: 10 }, after: { dailyCap: 1 } });
  });

  it("#5 광고주 자격 — 확인된 입금 누적 < 100,000P 면 403 INSUFFICIENT_QUALIFICATION (베타 초기 지급금은 자격 아님)", async () => {
    fake.seed("users/newbie", { totalPoints: 1_000_000, lockedPoints: 0, betaTestFunds: 1_000_000 });
    const e = await expectApiError(createCampaign("newbie", { ...BASE, unitAmount: 10_000, headcount: 1 }), "INSUFFICIENT_QUALIFICATION", 403);
    expect(e.details).toMatchObject({ required: 100_000, depositTotal: 0 });

    seedDeposit("newbie", 60_000, "dep_n_1");
    await expectApiError(createCampaign("newbie", { ...BASE, unitAmount: 10_000, headcount: 1 }), "INSUFFICIENT_QUALIFICATION", 403);
    seedDeposit("newbie", 40_000, "dep_n_2"); // 누적 100,000
    const created = await createCampaign("newbie", { ...BASE, unitAmount: 10_000, headcount: 1 });
    expect(created.budgetLocked).toBe(10_000);
    expect(fake.read("users/newbie")).toMatchObject({ totalPoints: 990_000, lockedPoints: 10_000 });
  });

  it("#6 광고주 본인 취소 — 승인 전만, 전액 반환, 남의 것·승인 후는 거부", async () => {
    const before = fake.ledgerTotal();
    const created = await createCampaign(ADV, BASE);
    await expectApiError(cancelCampaign("u1", created.id), "FORBIDDEN", 403);

    const res = await cancelCampaign(ADV, created.id);
    expect(res).toMatchObject({ refunded: 300_000, newBalance: 1_000_000 });
    expect(fake.read(`users/${ADV}`)).toMatchObject({ totalPoints: 1_000_000, lockedPoints: 0 });
    expect(fake.read(`rewardCampaigns/${created.id}`)).toMatchObject({ status: "rejected", rejectReason: "owner_cancelled", budgetRefunded: 300_000 });
    const refund = fake.docsIn("transactions").find((t) => t.data.type === "reward_refund")!;
    expect(refund.data).toMatchObject({ consumerId: ADV, amount: 300_000, reason: "owner_cancel" });
    expect(fake.ledgerTotal()).toBe(before);
    // 두 번 취소 불가
    await expectApiError(cancelCampaign(ADV, created.id), "INVALID_STATE", 409);

    // 승인(live) 후에는 본인 취소 불가 — 관리자 end 경로만
    const live = await liveCampaign({ headcount: 1 });
    await expectApiError(cancelCampaign(ADV, live.id), "INVALID_STATE", 409);
    expect(fake.read(`users/${ADV}`)).toMatchObject({ totalPoints: 900_000, lockedPoints: 100_000 });
  });

  it("#7 잠긴 금액은 출금할 수 없다 — withdraw-service 는 totalPoints 만 보므로 실차감 설계에서 그대로 성립", async () => {
    await createCampaign(ADV, BASE); // totalPoints 700,000 / locked 300,000
    await expectApiError(requestWithdrawal(ADV, 800_000, BANK), "INSUFFICIENT_BALANCE", 400);
    await expectApiError(requestWithdrawal(ADV, 700_001, BANK), "INSUFFICIENT_BALANCE", 400);
    expect(fake.read(`users/${ADV}`)).toMatchObject({ totalPoints: 700_000, lockedPoints: 300_000 });

    const ok = await requestWithdrawal(ADV, 700_000, BANK);
    expect(ok.newBalance).toBe(0);
    expect(fake.read(`users/${ADV}`)).toMatchObject({ totalPoints: 0, lockedPoints: 300_000 });
    // 잠금분은 그대로 남아 캠페인 지급에 쓰인다
    expect(fake.ledgerTotal()).toBe(300_000 + 50_000);
  });

  it("#8 동시 리딤 — 잔여 1건에 2명 동시 요청 → 정확히 1명 성공, 원장 불변", async () => {
    const created = await liveCampaign({ headcount: 1 });
    const before = fake.ledgerTotal();

    const results = await Promise.allSettled([
      redeemCampaignCode(who("u1"), created.code),
      redeemCampaignCode(who("u2"), created.code),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0].reason).toBeInstanceOf(ApiError);
    expect(["BUDGET_EXHAUSTED", "CAMPAIGN_NOT_ACTIVE"]).toContain((failed[0].reason as ApiError).code);
    expect(fake.contentionRetries).toBeGreaterThan(0); // 실제로 경합이 있었고 재시도로 걸러졌다

    expect(fake.read(`rewardCampaigns/${created.id}`)).toMatchObject({ status: "ended", paidCount: 1, budgetPaid: 100_000 });
    expect(fake.read(`users/${ADV}`)).toMatchObject({ totalPoints: 900_000, lockedPoints: 0 });
    const u1 = fake.read("users/u1")!.totalPoints as number;
    const u2 = fake.read("users/u2")!.totalPoints as number;
    expect(u1 + u2).toBe(0 + 50_000 + 100_000);
    expect(fake.docsIn("rewardPayouts")).toHaveLength(1);
    expect(fake.ledgerTotal()).toBe(before);
  });

  it("원장 불일치(광고주 lockedPoints < unit)면 지급을 멈춘다 — 무에서 생성 차단", async () => {
    const created = await liveCampaign();
    // 누군가 lockedPoints 를 손댄 상황
    fake.seed(`users/${ADV}`, { totalPoints: 700_000, lockedPoints: 0 });
    await expectApiError(redeemCampaignCode(who("u1"), created.code), "INVALID_STATE", 500);
    expect(fake.read("users/u1")?.totalPoints).toBe(0);
  });

  it("입력 검증: unitAmount·headcount 범위 밖은 lockAmount 단계에서 거부", async () => {
    await expect(createCampaign(ADV, { ...BASE, unitAmount: 12_345 })).rejects.toThrow(RangeError);
    await expect(createCampaign(ADV, { ...BASE, headcount: 0 })).rejects.toThrow(RangeError);
    expect(fake.docsIn("rewardCampaigns")).toHaveLength(0);
  });
});
