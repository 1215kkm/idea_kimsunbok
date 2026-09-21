import { describe, expect, it, vi } from "vitest";
import type { Query, QuerySnapshot } from "firebase-admin/firestore";
import { getOrdered, isMissingIndexError } from "../firestore-query";

/** orderBy 를 붙이면 실패하고, 안 붙이면 성공하는 가짜 Query. */
function fakeQuery(orderByError: unknown | null) {
  const calls = { ordered: 0, plain: 0 };
  const snap = { docs: [] } as unknown as QuerySnapshot;

  const plain = {
    limit: () => ({
      get: async () => {
        calls.plain += 1;
        return snap;
      },
    }),
  };

  const base = {
    ...plain,
    orderBy: () => ({
      limit: () => ({
        get: async () => {
          calls.ordered += 1;
          if (orderByError) throw orderByError;
          return snap;
        },
      }),
    }),
  } as unknown as Query;

  return { base, calls, snap };
}

describe("isMissingIndexError", () => {
  it("gRPC FAILED_PRECONDITION(9) 을 인덱스 누락으로 본다", () => {
    expect(isMissingIndexError({ code: 9, message: "The query requires an index." })).toBe(true);
  });

  it("메시지만으로도 판별한다", () => {
    expect(isMissingIndexError(new Error("9 FAILED_PRECONDITION: The query requires an index"))).toBe(true);
  });

  it("다른 오류는 인덱스 문제가 아니다", () => {
    expect(isMissingIndexError({ code: 7, message: "PERMISSION_DENIED" })).toBe(false);
    expect(isMissingIndexError(new Error("boom"))).toBe(false);
    expect(isMissingIndexError(null)).toBe(false);
  });
});

describe("getOrdered", () => {
  it("인덱스가 있으면 정렬 질의를 그대로 쓴다", async () => {
    const { base, calls } = fakeQuery(null);
    await getOrdered(base, "createdAt", "desc", 100);
    expect(calls).toEqual({ ordered: 1, plain: 0 });
  });

  it("인덱스가 없으면 정렬 없이 다시 조회한다 (500 대신 목록을 돌려준다)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { base, calls } = fakeQuery({ code: 9, message: "The query requires an index." });
    await expect(getOrdered(base, "createdAt", "desc", 100)).resolves.toBeDefined();
    expect(calls).toEqual({ ordered: 1, plain: 1 });
    warn.mockRestore();
  });

  it("인덱스와 무관한 오류는 그대로 던진다", async () => {
    const { base, calls } = fakeQuery({ code: 7, message: "PERMISSION_DENIED" });
    await expect(getOrdered(base, "createdAt", "desc", 100)).rejects.toMatchObject({ code: 7 });
    expect(calls).toEqual({ ordered: 1, plain: 0 });
  });
});
