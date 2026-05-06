import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

declare global {
  var __dalandAdminApp: App | undefined;
}

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set. Cannot initialize firebase-admin.",
    );
  }
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.private_key === "string") {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return parsed;
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON. Make sure it's stringified on one line.",
    );
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
