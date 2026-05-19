import { publicEncrypt, constants } from "crypto";
import { ApiError } from "./api-error";

const OAUTH_URL = "https://oauth.codef.io/oauth/token?grant_type=client_credentials";
const API_HOST = process.env.CODEF_API_HOST || "https://api.codef.io";

interface TokenCache {
  token: string;
  expiresAt: number;
}

declare global {
  var __codefToken: TokenCache | undefined;
}

function getCredentials() {
  const clientId = process.env.CODEF_CLIENT_ID;
  const clientSecret = process.env.CODEF_CLIENT_SECRET;
  const publicKey = process.env.CODEF_PUBLIC_KEY;
  if (!clientId || !clientSecret || !publicKey) {
    throw new ApiError(
      "INTERNAL",
      "CODEF env vars missing (CODEF_CLIENT_ID / CODEF_CLIENT_SECRET / CODEF_PUBLIC_KEY)",
      500,
    );
  }
  return { clientId, clientSecret, publicKey };
}

/** CODEF는 민감정보(비밀번호 등)를 publicKey로 RSA 암호화 후 전송해야 함 */
export function codefEncrypt(plain: string): string {
  const { publicKey } = getCredentials();
  const pem = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
  const encrypted = publicEncrypt(
    { key: pem, padding: constants.RSA_PKCS1_PADDING },
    Buffer.from(plain, "utf8"),
  );
  return encrypted.toString("base64");
}

/** OAuth 2.0 액세스 토큰 발급 (7일 유효, globalThis 캐싱) */
export async function getCodefToken(): Promise<string> {
  const cached = globalThis.__codefToken;
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }
  const { clientId, clientSecret } = getCredentials();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(OAUTH_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  if (!res.ok) {
    throw new ApiError("INTERNAL", `CODEF token request failed (${res.status})`, 502);
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) {
    throw new ApiError("INTERNAL", "CODEF token response missing access_token", 502);
  }
  globalThis.__codefToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 7 * 24 * 3600) * 1000,
  };
  return data.access_token;
}

/**
 * CODEF API 호출.
 * 주의: CODEF는 응답 본문을 URL-encoding 해서 보냄 → decodeURIComponent 후 JSON.parse 필요.
 */
export async function codefRequest<T = unknown>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const token = await getCodefToken();
  const res = await fetch(`${API_HOST}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(decodeURIComponent(raw));
  } catch {
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new ApiError("INTERNAL", "CODEF response parse failed", 502);
    }
  }
  return parsed as T;
}

export interface CodefResult<T> {
  result: {
    code: string; // "CF-00000" = 성공
    message: string;
    extraMessage?: string;
  };
  data: T;
}

export function isCodefSuccess(r: CodefResult<unknown>): boolean {
  return r?.result?.code === "CF-00000";
}
