import { FieldValue, type Transaction } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";
import { ApiError } from "./api-error";
import { MIN_WITHDRAW } from "./spend-categories";

export interface BankInfo {
  bank: string;
  accountNumber: string;
  holder: string;
}

const SUPPORTED_BANKS = [
  "shinhan",
  "kb",
  "woori",
  "hana",
  "nh",
  "kakao",
  "toss",
];

export type WithdrawalStatus = "pending" | "completed" | "rejected";

export interface WithdrawalDoc {
  userId: string;
  amount: number;
  status: WithdrawalStatus;
  bankInfo: BankInfo;
  requestedAt: FirebaseFirestore.Timestamp | null;
  processedAt?: FirebaseFirestore.Timestamp | null;
  processedBy?: string;
  rejectReason?: string;
}

function validateBankInfo(input: unknown): BankInfo {
  if (!input || typeof input !== "object") {
    throw new ApiError("INVALID_INPUT", "bankInfo required", 400, { field: "bankInfo" });
  }
  const b = input as Record<string, unknown>;
  if (typeof b.bank !== "string" || !SUPPORTED_BANKS.includes(b.bank)) {
    throw new ApiError("INVALID_INPUT", "Invalid bank", 400, { field: "bankInfo.bank" });
  }
  if (typeof b.accountNumber !== "string" || !/^[0-9-]{6,30}$/.test(b.accountNumber)) {
    throw new ApiError("INVALID_INPUT", "Invalid account number", 400, {
      field: "bankInfo.accountNumber",
    });
  }
  const holder =
    typeof b.holder === "string" && b.holder.trim().length > 0
      ? b.holder.trim().slice(0, 30)
      : "";
  return {
    bank: b.bank,
    accountNumber: b.accountNumber.replace(/-/g, ""),
    holder,
  };
}

export async function requestWithdrawal(
  userId: string,
  amountInput: unknown,
  bankInput: unknown,
): Promise<{ requestId: string; newBalance: number; amount: number }> {
  if (
    typeof amountInput !== "number" ||
    !Number.isInteger(amountInput) ||
    amountInput < MIN_WITHDRAW
  ) {
    throw new ApiError("INVALID_INPUT", `Minimum withdrawal is ${MIN_WITHDRAW}P`, 400, {
      field: "amount",
    });
  }
  const bankInfo = validateBankInfo(bankInput);
  const db = adminDb();
  const userRef = db.collection("users").doc(userId);
  const reqRef = db.collection("withdrawals").doc();

  const newBalance = await db.runTransaction(async (tx: Transaction) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) {
      throw new ApiError("NOT_FOUND", "User not found", 404);
    }
    const balance = (snap.data()?.totalPoints || 0) as number;
    if (balance < amountInput) {
      throw new ApiError("INSUFFICIENT_BALANCE", "Not enough balance", 400);
    }
    const next = balance - amountInput;
    tx.update(userRef, { totalPoints: next });
    tx.create(reqRef, {
      userId,
      amount: amountInput,
      status: "pending",
      bankInfo,
      requestedAt: FieldValue.serverTimestamp(),
    });
    const txnRef = db.collection("transactions").doc();
    tx.create(txnRef, {
      consumerId: userId,
      type: "withdrawal_request",
      amount: amountInput,
      totalAccumulation: -amountInput,
      withdrawalId: reqRef.id,
      createdAt: FieldValue.serverTimestamp(),
    });
    return next;
  });

  return { requestId: reqRef.id, newBalance, amount: amountInput };
}

export async function cancelWithdrawal(
  userId: string,
  requestId: string,
): Promise<{ refunded: number; newBalance: number }> {
  if (typeof requestId !== "string" || requestId.length < 8) {
    throw new ApiError("INVALID_INPUT", "Invalid requestId", 400);
  }
  const db = adminDb();
  const reqRef = db.collection("withdrawals").doc(requestId);
  const userRef = db.collection("users").doc(userId);

  const result = await db.runTransaction(async (tx: Transaction) => {
    const reqSnap = await tx.get(reqRef);
    if (!reqSnap.exists) throw new ApiError("NOT_FOUND", "Request not found", 404);
    const data = reqSnap.data()!;
    if (data.userId !== userId) throw new ApiError("FORBIDDEN", "Not your request", 403);
    if (data.status !== "pending") {
      throw new ApiError("CONFLICT", `Cannot cancel ${data.status} request`, 409);
    }
    const userSnap = await tx.get(userRef);
    const balance = (userSnap.data()?.totalPoints || 0) as number;
    const refundAmount = data.amount as number;
    const next = balance + refundAmount;
    tx.update(userRef, { totalPoints: next });
    tx.update(reqRef, {
      status: "rejected",
      rejectReason: "user_cancelled",
      processedAt: FieldValue.serverTimestamp(),
    });
    const txnRef = db.collection("transactions").doc();
    tx.create(txnRef, {
      consumerId: userId,
      type: "withdrawal_refund",
      amount: refundAmount,
      totalAccumulation: refundAmount,
      withdrawalId: requestId,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { refunded: refundAmount, newBalance: next };
  });
  return result;
}

export async function approveWithdrawal(
  adminUid: string,
  requestId: string,
): Promise<void> {
  if (typeof requestId !== "string" || requestId.length < 8) {
    throw new ApiError("INVALID_INPUT", "Invalid requestId", 400);
  }
  const db = adminDb();
  const reqRef = db.collection("withdrawals").doc(requestId);
  await db.runTransaction(async (tx: Transaction) => {
    const snap = await tx.get(reqRef);
    if (!snap.exists) throw new ApiError("NOT_FOUND", "Request not found", 404);
    const data = snap.data()!;
    if (data.status !== "pending") {
      throw new ApiError("CONFLICT", `Cannot approve ${data.status} request`, 409);
    }
    tx.update(reqRef, {
      status: "completed",
      processedAt: FieldValue.serverTimestamp(),
      processedBy: adminUid,
    });
  });
}

export async function rejectWithdrawal(
  adminUid: string,
  requestId: string,
  reason: string,
): Promise<{ refunded: number }> {
  if (typeof requestId !== "string" || requestId.length < 8) {
    throw new ApiError("INVALID_INPUT", "Invalid requestId", 400);
  }
  const trimmedReason = (reason || "").slice(0, 200);
  const db = adminDb();
  const reqRef = db.collection("withdrawals").doc(requestId);

  return await db.runTransaction(async (tx: Transaction) => {
    const snap = await tx.get(reqRef);
    if (!snap.exists) throw new ApiError("NOT_FOUND", "Request not found", 404);
    const data = snap.data()!;
    if (data.status !== "pending") {
      throw new ApiError("CONFLICT", `Cannot reject ${data.status} request`, 409);
    }
    const userRef = db.collection("users").doc(data.userId);
    const userSnap = await tx.get(userRef);
    const balance = (userSnap.data()?.totalPoints || 0) as number;
    const refundAmount = data.amount as number;
    const next = balance + refundAmount;
    tx.update(userRef, { totalPoints: next });
    tx.update(reqRef, {
      status: "rejected",
      processedAt: FieldValue.serverTimestamp(),
      processedBy: adminUid,
      rejectReason: trimmedReason || "admin_rejected",
    });
    const txnRef = db.collection("transactions").doc();
    tx.create(txnRef, {
      consumerId: data.userId,
      type: "withdrawal_refund",
      amount: refundAmount,
      totalAccumulation: refundAmount,
      withdrawalId: requestId,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { refunded: refundAmount };
  });
}
