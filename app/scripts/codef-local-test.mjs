// 네트워크 없이 검증 가능한 로직 테스트
import { publicEncrypt, privateDecrypt, constants, generateKeyPairSync } from "node:crypto";

let pass = 0, fail = 0;
function check(name, cond, extra = "") {
  if (cond) { console.log(`  ✓ ${name}`); pass++; }
  else { console.log(`  ✗ ${name} ${extra}`); fail++; }
}

console.log("=== CODEF 로직 검증 (오프라인) ===\n");

// 1. 실제 CODEF public key로 RSA 암호화가 에러 없이 동작하는지
console.log("[1] RSA 암호화 (실제 CODEF publicKey)");
const PUBLIC_KEY = process.env.CODEF_PUBLIC_KEY;
check("CODEF_PUBLIC_KEY 존재", !!PUBLIC_KEY);
try {
  const pem = `-----BEGIN PUBLIC KEY-----\n${PUBLIC_KEY}\n-----END PUBLIC KEY-----`;
  const enc = publicEncrypt(
    { key: pem, padding: constants.RSA_PKCS1_PADDING },
    Buffer.from("my-secret-password-1234", "utf8"),
  );
  const b64 = enc.toString("base64");
  check("암호화 성공 (base64 출력)", b64.length > 100, `len=${b64.length}`);
  check("매번 다른 암호문 (PKCS1 랜덤 패딩)", (() => {
    const a = publicEncrypt({ key: pem, padding: constants.RSA_PKCS1_PADDING }, Buffer.from("x"));
    const b = publicEncrypt({ key: pem, padding: constants.RSA_PKCS1_PADDING }, Buffer.from("x"));
    return a.toString("base64") !== b.toString("base64");
  })());
} catch (e) {
  check("암호화 성공", false, e.message);
}

// 2. RSA 라운드트립 (자체 키쌍으로 암복호 일치 검증 → 패딩/인코딩 로직 정확성)
console.log("\n[2] RSA 라운드트립 (패딩/인코딩 로직 검증)");
{
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const plain = "password!@#한글1234";
  const enc = publicEncrypt({ key: publicKey, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(plain, "utf8"));
  const dec = privateDecrypt({ key: privateKey, padding: constants.RSA_PKCS1_PADDING }, enc).toString("utf8");
  check("암호화→복호화 원문 일치", dec === plain, `got="${dec}"`);
}

// 3. CODEF URL-encoded 응답 파싱 로직
console.log("\n[3] CODEF 응답 파싱 (URL-encoded JSON)");
{
  const sample = { result: { code: "CF-00000", message: "성공" }, data: { connectedId: "abc123" } };
  const urlEncoded = encodeURIComponent(JSON.stringify(sample));
  let parsed;
  try { parsed = JSON.parse(decodeURIComponent(urlEncoded)); }
  catch { parsed = null; }
  check("URL-encoded 응답 디코딩", parsed?.data?.connectedId === "abc123");

  // 일반 JSON(인코딩 안 된 경우)도 폴백 처리
  const plainJson = JSON.stringify(sample);
  let parsed2;
  try { parsed2 = JSON.parse(decodeURIComponent(plainJson)); }
  catch { try { parsed2 = JSON.parse(plainJson); } catch { parsed2 = null; } }
  check("일반 JSON 폴백 파싱", parsed2?.result?.code === "CF-00000");
}

// 4. 승인내역 → 멱등키 / 금액 파싱 로직
console.log("\n[4] 승인내역 처리 로직");
{
  const item = {
    resApprovalNo: "12345678",
    resUsedDate: "20240615",
    resUsedTime: "143025",
    resUsedAmount: "12,500",
    resCancelYN: "0",
    resMemberStoreName: "스타벅스 강남점",
  };
  const amount = parseInt((item.resUsedAmount || "0").replace(/[^0-9]/g, ""), 10);
  check("금액 콤마 제거 파싱", amount === 12500, `got=${amount}`);
  const cardOrg = "shinhan";
  const dedupeId = `${cardOrg}_${item.resApprovalNo}_${item.resUsedDate}`;
  check("멱등키 생성", dedupeId === "shinhan_12345678_20240615", dedupeId);
  check("취소건 필터 (resCancelYN=1 제외)", item.resCancelYN !== "1");
  const docId = `card_uid123_${dedupeId}`;
  check("Firestore 문서ID 안전", /^[A-Za-z0-9_]+$/.test(docId), docId);
}

// 5. 카드사 기관코드 매핑
console.log("\n[5] 카드사 기관코드");
{
  const CARD_ORGS = { shinhan:"0306", kb:"0301", samsung:"0302", hyundai:"0303",
    lotte:"0305", hana:"0313", bc:"0304", woori:"0309", nh:"0307" };
  check("9개 카드사 정의", Object.keys(CARD_ORGS).length === 9);
  check("코드 형식 4자리 숫자", Object.values(CARD_ORGS).every((c) => /^\d{4}$/.test(c)));
}

console.log(`\n=== 결과: ${pass} 통과 / ${fail} 실패 ===`);
process.exit(fail > 0 ? 1 : 0);
