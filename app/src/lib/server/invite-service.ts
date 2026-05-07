import { randomBytes } from "crypto";
import { adminDb } from "./firebase-admin";
import { ApiError } from "./api-error";
import { INVITE_TIERS, isValidTier, type InviteTierId } from "./invite-tiers";
import { calculateInviteReward } from "@/lib/nonlinear-engine";
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
 * Redeem an invite code for a newly-signed-up user.
 * - Idempotent: if inviteRedemptions/{inviteeUid} already exists, throws ALREADY_REDEEMED
 * - Self-invite check
 * - amount/reward calculated from server-side INVITE_TIERS only (code's stored amount is double-checked)
 */
export async function redeemInviteCode(
  inviteeUid: string,
  code: string,
): Promise<{
  distributedToNewUser: number;
  advertiserNetGain: number;
  inviterUid: string;
  tierId: InviteTierId;
}> {
  if (typeof code !== "string" || !/^[A-Z0-9]{8}$/.test(code)) {
    throw new ApiError("INVALID_INPUT", "Invalid invite code format", 400, {
      field: "inviteCode",
    });
  }
  const db = adminDb();
  const codeRef = db.collection("inviteCodes").doc(code);
  const redemptionRef = db.collection("inviteRedemptions").doc(inviteeUid);

  return await db.runTransaction(async (tx: Transaction) => {
    const [redemptionSnap, codeSnap] = await Promise.all([
      tx.get(redemptionRef),
      tx.get(codeRef),
    ]);
    if (redemptionSnap.exists) {
      throw new ApiError("ALREADY_REDEEMED", "User already redeemed an invite", 409);
    }
    if (!codeSnap.exists) {
      throw new ApiError("NOT_FOUND", "Invite code not found", 404);
    }
    const codeData = codeSnap.data()!;
    if (codeData.active === false) {
      throw new ApiError("INACTIVE", "Invite code is no longer active", 410);
    }
    const inviterUid = codeData.ownerUid as string;
    if (inviterUid === inviteeUid) {
      throw new ApiError("SELF_INVITE", "Cannot redeem your own invite", 400);
    }
    const tierId = codeData.tierId as InviteTierId;
    if (!isValidTier(tierId)) {
      throw new ApiError("INTERNAL", "Stored tier is invalid", 500);
    }
    const tier = INVITE_TIERS[tierId];
    const reward = calculateInviteReward(tier.amount);

    const inviterRef = db.collection("users").doc(inviterUid);
    const inviteeRef = db.collection("users").doc(inviteeUid);
    const inviterSnap = await tx.get(inviterRef);
    const inviteeSnap = await tx.get(inviteeRef);

    const inviterPoints = (inviterSnap.exists ? inviterSnap.data()?.totalPoints || 0 : 0) as number;
    const inviteePoints = (inviteeSnap.exists ? inviteeSnap.data()?.totalPoints || 0 : 0) as number;

    tx.set(
      inviterRef,
      { totalPoints: inviterPoints + reward.advertiserNetGain },
      { merge: true },
    );
    tx.set(
      inviteeRef,
      { totalPoints: inviteePoints + reward.distributedToNewUser },
      { merge: true },
    );

    tx.create(redemptionRef, {
      inviteeUid,
      inviterUid,
      code,
      tierId,
      amount: reward.distributedToNewUser,
      advertiserNetGain: reward.advertiserNetGain,
      redeemedAt: FieldValue.serverTimestamp(),
    });

    tx.update(codeRef, {
      redeemCount: FieldValue.increment(1),
      totalAdvertiserNetGain: FieldValue.increment(reward.advertiserNetGain),
    });

    const inviteeTxRef = db.collection("transactions").doc();
    tx.create(inviteeTxRef, {
      consumerId: inviteeUid,
      type: "invite_invitee",
      amount: reward.distributedToNewUser,
      totalAccumulation: reward.distributedToNewUser,
      inviteCode: code,
      inviterUid,
      createdAt: FieldValue.serverTimestamp(),
    });
    const inviterTxRef = db.collection("transactions").doc();
    tx.create(inviterTxRef, {
      consumerId: inviterUid,
      type: "invite_advertiser",
      amount: reward.advertiserSpend,
      totalAccumulation: reward.advertiserNetGain,
      inviteCode: code,
      inviteeUid,
      createdAt: FieldValue.serverTimestamp(),
    });

    return {
      distributedToNewUser: reward.distributedToNewUser,
      advertiserNetGain: reward.advertiserNetGain,
      inviterUid,
      tierId,
    };
  });
}
