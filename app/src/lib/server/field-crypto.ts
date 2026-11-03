import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from "crypto";
import { ApiError } from "./api-error";

/**
 * 민감 항목(출금 계좌번호) 암호화 — AES-256-GCM.
 *
 * 저장 형식: "enc:v1:<base64(iv 12B | tag 16B | 암호문)>"
 * DB 가 통째로 새어도 계좌번호는 읽을 수 없고, 키는 서버 환경변수에만 있다.
 *
 * 키 우선순위
 *  1) ACCOUNT_ENCRYPTION_KEY — base64 32바이트 (권장. `openssl rand -base64 32`)
 *  2) 없으면 FIREBASE_SERVICE_ACCOUNT_KEY 의 private_key 에서 HKDF 로 유도 —
 *     배포 설정을 따로 바꾸지 않아도 동작하게 하는 임시 수단. 서비스 계정 키를 교체하면
 *     예전 암호문을 못 읽으므로, 운영 전에는 1)을 꼭 넣는다.
 */
const PREFIX = "enc:v1:";
let cachedKey: Buffer | null = null;

function loadKey(): Buffer {
  if (cachedKey) return cachedKey;
  const explicit = process.env.ACCOUNT_ENCRYPTION_KEY;
  if (explicit) {
    const k = Buffer.from(explicit, "base64");
    if (k.length !== 32) {
      throw new ApiError("SERVER_NOT_CONFIGURED", "서버 암호화 설정이 올바르지 않습니다. 관리자에게 문의해 주세요.", 503);
    }
    cachedKey = k;
    return k;
  }
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  let secret = "";
  try {
    secret = sa ? String(JSON.parse(sa).private_key || "") : "";
  } catch {
    secret = "";
  }
  if (!secret) {
    throw new ApiError("SERVER_NOT_CONFIGURED", "서버 설정이 완료되지 않아 처리할 수 없습니다. 관리자에게 문의해 주세요.", 503);
  }
  const salt = createHash("sha256").update("daland-field-crypto").digest();
  cachedKey = Buffer.from(hkdfSync("sha256", secret, salt, "account-number-v1", 32));
  return cachedKey;
}

export function encryptField(plain: string): string {
  const key = loadKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString("base64");
}

/** 예전(평문) 값은 그대로 돌려준다 — 암호화 전에 저장된 출금 요청 호환 */
export function decryptField(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored;
  const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ct = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", loadKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

export function isEncrypted(stored: unknown): boolean {
  return typeof stored === "string" && stored.startsWith(PREFIX);
}

/** 화면 표시용: 뒤 4자리만 */
export function maskAccount(digits: string): string {
  const d = (digits || "").replace(/[^0-9]/g, "");
  return d.length <= 4 ? d : `${"*".repeat(Math.min(d.length - 4, 8))}${d.slice(-4)}`;
}

/** 테스트에서 키를 바꿀 때 */
export function __resetFieldCryptoKey() {
  cachedKey = null;
}
