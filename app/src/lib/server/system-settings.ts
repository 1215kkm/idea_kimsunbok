import { adminDb } from "./firebase-admin";

/**
 * 시스템 설정 (settings/system 문서)
 *
 * splitMode (의뢰자 확정 — 분할모드):
 *  - "auto": 소비자단계 10억P까지 자동 분할 처리
 *  - "manual": 관리자가 수동 모드로 전환한 상태 (대량 거래 직접 관리)
 */

export type SplitMode = "auto" | "manual";

export const SPLIT_AUTO_LIMIT = 1_000_000_000; // 10억 — 자동 모드 상한

export async function getSplitMode(): Promise<SplitMode> {
  try {
    const snap = await adminDb().collection("settings").doc("system").get();
    return snap.exists && snap.data()?.splitMode === "manual" ? "manual" : "auto";
  } catch {
    return "auto"; // 설정 조회 실패 시 기본 자동 모드
  }
}
