// CODEF 연동 검증 스크립트 (임시, git 미커밋)
// 실행: node --env-file=.env.local scripts/codef-test.mjs
import { publicEncrypt, constants } from "node:crypto";

const CLIENT_ID = process.env.CODEF_CLIENT_ID;
const CLIENT_SECRET = process.env.CODEF_CLIENT_SECRET;
const PUBLIC_KEY = process.env.CODEF_PUBLIC_KEY;
const API_HOST = process.env.CODEF_API_HOST || "https://api.codef.io";

function log(...a) { console.log(...a); }

async function getToken() {
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const res = await fetch(
    "https://oauth.codef.io/oauth/token?grant_type=client_credentials",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );
  const text = await res.text();
  log("[1] OAuth status:", res.status);
  let data;
  try { data = JSON.parse(text); } catch { log("  raw:", text.slice(0, 300)); throw new Error("token parse fail"); }
  if (!data.access_token) { log("  body:", JSON.stringify(data)); throw new Error("no access_token"); }
  log("  ✓ access_token 발급 OK (expires_in:", data.expires_in, ")");
  return data.access_token;
}

function rsaEncrypt(plain) {
  const pem = `-----BEGIN PUBLIC KEY-----\n${PUBLIC_KEY}\n-----END PUBLIC KEY-----`;
  const enc = publicEncrypt(
    { key: pem, padding: constants.RSA_PKCS1_PADDING },
    Buffer.from(plain, "utf8"),
  );
  return enc.toString("base64");
}

async function codefReq(token, path, body) {
  const res = await fetch(`${API_HOST}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  let parsed;
  try { parsed = JSON.parse(decodeURIComponent(raw)); }
  catch { try { parsed = JSON.parse(raw); } catch { parsed = { _raw: raw.slice(0, 500) }; } }
  return { status: res.status, parsed };
}

(async () => {
  log("=== CODEF 연동 검증 ===\n");

  // 1. OAuth
  const token = await getToken();

  // 2. RSA 암호화
  const encrypted = rsaEncrypt("test-password-1234");
  log("\n[2] RSA 암호화 OK (length:", encrypted.length, ")");

  // 3. connectedId 생성 시도 — CODEF 샌드박스 카드 테스트 계정
  //    (CODEF 공식 샌드박스: organization 0301 신한, id/pw = 공통 테스트값)
  log("\n[3] connectedId 생성 테스트 (샌드박스 신한카드 테스트 계정)");
  const createBody = {
    accountList: [
      {
        countryCode: "KR",
        businessType: "CD",
        clientType: "P",
        organization: "0301",
        loginType: "1",
        id: "test_user",
        password: rsaEncrypt("test_password"),
      },
    ],
  };
  const r3 = await codefReq(token, "/v1/account/create", createBody);
  log("  status:", r3.status);
  log("  result:", JSON.stringify(r3.parsed?.result || r3.parsed).slice(0, 400));
  const connectedId = r3.parsed?.data?.connectedId;
  if (connectedId) log("  ✓ connectedId:", connectedId);

  // 4. 승인내역 조회 엔드포인트/응답 구조 확인
  if (connectedId) {
    log("\n[4] 카드 승인내역 조회 테스트");
    const r4 = await codefReq(token, "/v1/kr/card/p/account/approval-list", {
      connectedId,
      organization: "0301",
      startDate: "20240101",
      endDate: "20241231",
      orderBy: "0",
      inquiryType: "0",
    });
    log("  status:", r4.status);
    log("  result:", JSON.stringify(r4.parsed?.result || r4.parsed).slice(0, 400));
    const list = r4.parsed?.data?.resApprovalList;
    if (Array.isArray(list)) {
      log("  ✓ 승인내역", list.length, "건. 첫 건 필드:",
        list[0] ? Object.keys(list[0]).join(", ") : "(없음)");
    }
  }

  log("\n=== 끝 ===");
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
