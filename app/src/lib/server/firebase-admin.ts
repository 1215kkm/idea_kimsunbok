import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { ApiError } from "./api-error";

declare global {
  var __dalandAdminApp: App | undefined;
}

/**
 * 서버 키가 없으면 지금까지는 평범한 Error 라서 모든 API 가 500 + 영문 메시지로 끝났다.
 * 클라이언트 키(NEXT_PUBLIC_*)만 설정하고 서버 키를 빼먹은 배포에서 실제로 그랬다.
 * 원인을 로그에 남기고 화면에는 한국어 안내가 나가도록 ApiError 로 던진다.
 */
function notConfigured(detail: string): never {
  console.error(`[firebase-admin] ${detail}`);
  throw new ApiError(
    "SERVER_NOT_CONFIGURED",
    "서버 설정이 완료되지 않아 처리할 수 없습니다. 관리자에게 문의해 주세요.",
    503,
  );
}

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    notConfigured("FIREBASE_SERVICE_ACCOUNT_KEY 환경변수가 없습니다.");
  }
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.private_key === "string") {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return parsed;
  } catch {
    notConfigured("FIREBASE_SERVICE_ACCOUNT_KEY 가 올바른 JSON 이 아닙니다 (한 줄 문자열이어야 함).");
  }
}

function initAdmin(): App {
  if (globalThis.__dalandAdminApp) return globalThis.__dalandAdminApp;
  const existing = getApps()[0];
  if (existing) {
    globalThis.__dalandAdminApp = existing;
    return existing;
  }
  const serviceAccount = getServiceAccount();
  const app = initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
  globalThis.__dalandAdminApp = app;
  return app;
}

export function adminAuth(): Auth {
  return getAuth(initAdmin());
}

export function adminDb(): Firestore {
  return getFirestore(initAdmin());
}
