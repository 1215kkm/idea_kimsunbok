import { FieldValue, type Transaction } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import { ApiError } from "./api-error";
import { codefEncrypt, codefRequest, isCodefSuccess, type CodefResult } from "./codef";
import { calculateNonlinear } from "@/lib/nonlinear-engine";

// CODEF 카드사 기관코드 (개인)
// 출처: CODEF 개발가이드 - 카드 > 기관코드 > 개인
export const CARD_ORGS: Record<string, string> = {
  shinhan: "0306", // 신한카드
  kb: "0301",      // KB국민카드
  samsung: "0302", // 삼성카드
  hyundai: "0303", // 현대카드
  lotte: "0304",   // 롯데카드
  hana: "0311",    // 하나카드
  bc: "0312",      // BC카드
  woori: "0309",   // 우리카드
  nh: "0307",      // NH농협카드
};

export function isValidCardOrg(id: unknown): id is keyof typeof CARD_ORGS {
  return typeof id === "string" && Object.prototype.hasOwnProperty.call(CARD_ORGS, id);
}

interface CreateAccountResp {
  connectedId?: string;
}

/**
 * 카드사 로그인 정보로 CODEF connectedId 발급 → users/{uid}에 저장.
 * 비밀번호는 RSA 암호화해서 전송. 평문은 서버 메모리에서만 잠깐 존재, 저장 X.
 */
export async function connectCard(
  uid: string,
  cardOrg: string,
  loginId: string,
  loginPw: string,
): Promise<{ connected: true }> {
  if (!isValidCardOrg(cardOrg)) {
    throw new ApiError("INVALID_INPUT", "Unsupported card company", 400, { field: "cardOrg" });
  }
  if (!loginId || !loginPw) {
    throw new ApiError("INVALID_INPUT", "Card credentials required", 400);
  }

  const body = {
    accountList: [
      {
        countryCode: "KR",
        businessType: "CD",
        clientType: "P",
        organization: CARD_ORGS[cardOrg],
        loginType: "1",
        id: loginId,
        password: codefEncrypt(loginPw),
      },
    ],
  };

  const resp = await codefRequest<CodefResult<CreateAccountResp>>(
    "/v1/account/create",
    body,
  );
  if (!isCodefSuccess(resp) || !resp.data?.connectedId) {
    throw new ApiError(
      "INVALID_INPUT",
      `카드 연동 실패: ${resp?.result?.message || "알 수 없는 오류"}`,
      400,
      { codefCode: resp?.result?.code },
    );
  }

  await adminDb()
    .collection("users")
    .doc(uid)
    .set(
      {
        codefConnectedId: resp.data.connectedId,
        codefCardOrg: cardOrg,
        cardConnectedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  return { connected: true };
}

interface ApprovalItem {
  resCardNo?: string;
  resUsedDate?: string; // YYYYMMDD
  resUsedTime?: string; // HHMMSS
  resMemberStoreName?: string;
  resUsedAmount?: string;
  resCancelYN?: string; // "1" = 취소
  resApprovalNo?: string;
}

interface ApprovalListResp {
  resApprovalList?: ApprovalItem[];
}

function ymd(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/**
 * 카드 승인내역을 가져와 새 건만 지출로 등록 (서버에서 비선형공식 실행).
 * resApprovalNo를 멱등키로 사용 → 중복 등록 방지.
 */
export async function syncCardTransactions(uid: string): Promise<{
  imported: number;
  totalAccumulation: number;
}> {
  const db = adminDb();
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new ApiError("NOT_FOUND", "User not found", 404);
  }
  const userData = userSnap.data()!;
  const connectedId = userData.codefConnectedId as string | undefined;
  const cardOrg = userData.codefCardOrg as string | undefined;
  if (!connectedId || !cardOrg || !isValidCardOrg(cardOrg)) {
    throw new ApiError("INVALID_INPUT", "카드가 연동되어 있지 않습니다.", 400);
  }

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30); // 최근 30일

  const resp = await codefRequest<CodefResult<ApprovalListResp>>(
    "/v1/kr/card/p/account/approval-list",
    {
      connectedId,
      organization: CARD_ORGS[cardOrg],
      startDate: ymd(start),
      endDate: ymd(end),
      orderBy: "0",
      inquiryType: "0",
    },
  );
  if (!isCodefSuccess(resp)) {
    throw new ApiError(
      "INTERNAL",
      `카드내역 조회 실패: ${resp?.result?.message || "오류"}`,
      502,
    );
  }

  const list = resp.data?.resApprovalList ?? [];
  let imported = 0;
  let totalAccumulation = 0;

  for (const item of list) {
    if (item.resCancelYN === "1") continue; // 취소건 제외
    const approvalNo = item.resApprovalNo;
    const usedDate = item.resUsedDate;
    if (!approvalNo || !usedDate) continue;

    const amount = parseInt((item.resUsedAmount || "0").replace(/[^0-9]/g, ""), 10);
    if (!Number.isInteger(amount) || amount <= 0) continue;

    // 멱등키: 카드사+승인번호+일자
    const dedupeId = `${cardOrg}_${approvalNo}_${usedDate}`;
    const txRef = db.collection("transactions").doc(`card_${uid}_${dedupeId}`);

    const created = await db.runTransaction(async (tx: Transaction) => {
      const existing = await tx.get(txRef);
      if (existing.exists) return null; // 이미 등록됨

      const nl = calculateNonlinear(amount);
      const uSnap = await tx.get(userRef);
      const cur = (uSnap.data()?.totalPoints || 0) as number;
      tx.update(userRef, { totalPoints: cur + nl.totalAccumulation });
      tx.set(txRef, {
        consumerId: uid,
        type: "spend",
        source: "card_codef",
        category: "card",
        categoryName: "카드결제",
        storeName: item.resMemberStoreName || "카드결제",
        amount,
        memo: `${item.resUsedDate || ""} ${item.resUsedTime || ""}`.trim(),
        cardApprovalNo: approvalNo,
        nonlinearResult: {
          principal: nl.principal,
          bonus: nl.bonus,
          totalAccumulation: nl.totalAccumulation,
          rate: nl.rate,
          memberCount: nl.memberCount,
          perMemberAmount: nl.perMemberAmount,
          advertiserReward: nl.advertiser.advertiserReward,
        },
        totalAccumulation: nl.totalAccumulation,
        createdAt: FieldValue.serverTimestamp(),
      });
      return nl.totalAccumulation;
    });

    if (created !== null) {
      imported += 1;
      totalAccumulation += created;
    }
  }

  await userRef.set({ cardLastSyncAt: FieldValue.serverTimestamp() }, { merge: true });
  return { imported, totalAccumulation };
}

export async function getCardStatus(uid: string): Promise<{
  connected: boolean;
  cardOrg: string | null;
  lastSyncAt: number | null;
}> {
  const snap = await adminDb().collection("users").doc(uid).get();
  const d = snap.exists ? snap.data()! : {};
  return {
    connected: !!d.codefConnectedId,
    cardOrg: (d.codefCardOrg as string) || null,
    lastSyncAt: d.cardLastSyncAt?.toMillis?.() ?? null,
  };
}

export async function disconnectCard(uid: string): Promise<void> {
  await adminDb()
    .collection("users")
    .doc(uid)
    .set(
      {
        codefConnectedId: FieldValue.delete(),
        codefCardOrg: FieldValue.delete(),
        cardConnectedAt: FieldValue.delete(),
      },
      { merge: true },
    );
}
