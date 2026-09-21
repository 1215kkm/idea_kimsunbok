import type { Query, QuerySnapshot } from "firebase-admin/firestore";

/**
 * Firestore 는 `where(A) + orderBy(B)` 같은 질의에 복합 인덱스를 요구하고,
 * 인덱스가 없으면 FAILED_PRECONDITION 으로 실패한다 → 화면에는 500 만 뜬다.
 *
 * 인덱스 배포는 운영 쪽 작업이라 코드 배포와 시점이 어긋날 수 있어서,
 * 인덱스가 아직 없더라도 목록 화면이 죽지 않도록 정렬 없이 한 번 더 시도한다.
 * (정렬은 호출부가 메모리에서 다시 하므로 결과 순서는 같다. 다만 limit 이
 *  걸린 상태에서는 "최신 N건"이 아니라 "임의의 N건 중 최신순"이 된다 —
 *  인덱스를 배포하면 자동으로 정확해진다. firestore.indexes.json 참고.)
 */
export function isMissingIndexError(err: unknown): boolean {
  const e = err as { code?: unknown; message?: unknown } | null;
  if (!e) return false;
  // gRPC status 9 = FAILED_PRECONDITION
  if (e.code === 9) return true;
  return typeof e.message === "string" && /requires an index/i.test(e.message);
}

export async function getOrdered(
  base: Query,
  field: string,
  direction: "asc" | "desc",
  limit: number,
): Promise<QuerySnapshot> {
  try {
    return await base.orderBy(field, direction).limit(limit).get();
  } catch (err) {
    if (!isMissingIndexError(err)) throw err;
    console.warn(
      `[firestore] 복합 인덱스 없음 (orderBy ${field}) — 정렬 없이 조회 후 메모리 정렬로 대체. ` +
        "firestore.indexes.json 을 배포하면 해소된다.",
    );
    return await base.limit(limit).get();
  }
}
