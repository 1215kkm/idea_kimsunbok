/**
 * [폐기 예정 — 읽기 전용] 구 초대 코드 시스템 (inviteCodes / inviteRedemptions)
 *
 * 2026-09-06 CEO 결정 (기획서 docs/admin-reward-plan.md §2, §4.3, §8-1·§8-6):
 *  - 구 redeemInviteCode 는 광고주 잔액 차감 없이 신규회원 +100%, 광고주 +20% 를 "무에서 생성"했다.
 *  - 리워드는 100% 제로섬 이전이어야 하므로 신규 지급 경로는 lib/server/reward-service.ts 로 교체.
 *  - 기존 inviteCodes / inviteRedemptions 문서는 소급 차감 없이 보존하고,
 *    총량 정합 API(/api/admin/ledger/totals)에서 "베타 조정" 항목으로 분리 집계한다.
 *  - 이 파일의 redeemInviteCode 는 즉시 410(INVITE_DEPRECATED) 를 던진다. 코드 발급 함수는
 *    구 화면 호환(읽기)을 위해 남겨 두지만 POST 라우트는 410 을 반환한다.
 */
import { randomBytes } from "crypto";
import { adminDb } from "./firebase-admin";
import { ApiError } from "./api-error";
import { INVITE_TIERS, isValidTier, type InviteTierId } from "./invite-tiers";
import { FieldValue, type Transaction } from "firebase-admin/firestore";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // exclude I, O, 0, 1
const CODE_LENGTH = 8;

function makeCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

export async function createInviteCodeForUser(
  ownerUid: string,
  tierId: InviteTierId,
): Promise<{ code: string; tierId: InviteTierId; amount: number }> {
  if (!isValidTier(tierId)) {
    throw new ApiError("INVALID_INPUT", "Invalid tierId", 400, { field: "tierId" });
  }
  const tier = INVITE_TIERS[tierId];
  const db = adminDb();

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode();
    const ref = db.collection("inviteCodes").doc(code);
    try {
      await db.runTransaction(async (tx: Transaction) => {
        const snap = await tx.get(ref);
        if (snap.exists) {
          throw new ApiError("CONFLICT", "Code collision", 409);
        }
        tx.create(ref, {
          code,
          ownerUid,
          tierId,
          amount: tier.amount,
          active: true,
          createdAt: FieldValue.serverTimestamp(),
          redeemCount: 0,
          totalAdvertiserNetGain: 0,
        });
      });
      return { code, tierId, amount: tier.amount };
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFLICT") continue;
      throw err;
    }
  }
  throw new ApiError("INTERNAL", "Failed to generate unique invite code", 500);
}

export async function deactivateActiveCodesFor(ownerUid: string): Promise<void> {
  const db = adminDb();
  const snap = await db
    .collection("inviteCodes")
    .where("ownerUid", "==", ownerUid)
    .where("active", "==", true)
    .get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.update(d.ref, { active: false }));
  await batch.commit();
}

export async function getActiveInviteForUser(ownerUid: string) {
  const db = adminDb();
  const snap = await db
    .collection("inviteCodes")
    .where("ownerUid", "==", ownerUid)
    .where("active", "==", true)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const data = doc.data();
  return {
    code: data.code as string,
    tierId: data.tierId as InviteTierId,
    amount: data.amount as number,
    redeemCount: (data.redeemCount as number) || 0,
    totalAdvertiserNetGain: (data.totalAdvertiserNetGain as number) || 0,
  };
}

/**
 * @deprecated 2026-09-06 — 무에서 포인트 생성 경로. 항상 410 INVITE_DEPRECATED.
 * 신규 가입 리워드는 reward-service.redeemCampaignCode 를 사용한다.
 * 호출부(post-signup)는 reward-service.redeemCampaignCode 로 이미 교체됨. 남은 호출 없음.
 */
export async function redeemInviteCode(): Promise<never> {
  throw new ApiError(
    "INVITE_DEPRECATED",
    "구 초대 코드 지급은 중단되었습니다. 리워드 캠페인 코드(/api/reward/redeem)를 사용해 주세요.",
    410,
  );
}
