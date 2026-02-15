const { onCall } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { initializeApp } = require("firebase-admin/app");

initializeApp();
const db = getFirestore();

// ===== 비선형공식 엔진 =====
function calculateNonlinear(amount) {
  const sellerRate = 0.5;
  const consumerRate = 0.5;
  const correctionTarget = 1.2;

  const sellerAccumulation = amount * sellerRate;
  const consumerAccumulation = amount * consumerRate;
  const totalAccumulation = Math.round(amount * correctionTarget);
  const bonus = totalAccumulation - amount;

  return {
    amount,
    sellerAccumulation,
    consumerAccumulation,
    totalAccumulation,
    rate: correctionTarget * 100,
    bonus,
    principal: amount,
  };
}

// ===== 결제 처리 함수 (클라이언트에서 호출) =====
exports.processPayment = onCall(async (request) => {
  const { storeId, storeName, amount } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new Error("인증이 필요합니다.");
  if (!amount || amount <= 0) throw new Error("유효한 금액을 입력하세요.");

  const result = calculateNonlinear(amount);

  // 트랜잭션으로 원자적 처리
  await db.runTransaction(async (t) => {
    const userRef = db.doc(`users/${uid}`);
    const userSnap = await t.get(userRef);
    const currentPoints = userSnap.exists ? (userSnap.data().totalPoints || 0) : 0;

    // 포인트 업데이트
    t.set(userRef, { totalPoints: currentPoints + result.totalAccumulation }, { merge: true });

    // 거래 기록
    const txRef = db.collection("transactions").doc();
    t.set(txRef, {
      consumerId: uid,
      storeId,
      storeName,
      amount,
      nonlinearResult: result,
      totalAccumulation: result.totalAccumulation,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return result;
});

// ===== 거래 생성 시 자동 알림 (확장용) =====
exports.onTransactionCreated = onDocumentCreated("transactions/{txId}", async (event) => {
  const data = event.data?.data();
  if (!data) return;

  // 추후 Cloud Messaging 알림 연동 가능
  console.log(`거래 완료: ${data.storeName}, ${data.amount}원 → ${data.totalAccumulation}P 적립`);
});
