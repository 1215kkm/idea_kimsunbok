"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import BigButton from "@/components/v2/BigButton";

const input =
  "w-full min-h-[80px] rounded-2xl border-2 border-[#BEC4D4] bg-white px-5 text-[26px] font-bold text-[#1A1F36] outline-none focus:border-[#3B4CCA]";

function authMessage(err: unknown): string {
  const code = (err as { code?: string })?.code || "";
  if (code === "auth/user-not-found" || code === "auth/invalid-credential" || code === "auth/wrong-password")
    return "이메일이나 비밀번호가 틀렸어요.";
  if (code === "auth/email-already-in-use") return "이미 가입한 이메일이에요. 들어가기를 눌러 주세요.";
  if (code === "auth/network-request-failed") return "인터넷 연결을 확인해 주세요.";
  if (code === "auth/too-many-requests") return "잠시 뒤에 다시 해 주세요.";
  return "다시 한 번 해 주세요.";
}

export default function V2Start() {
  const { user, loading, isDemo, signIn, signUp, demoSignIn } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.replace("/v2/home");
  }, [user, router]);

  if (loading || user) {
    return <div className="flex min-h-screen items-center justify-center text-[26px] text-[#6B7394]">잠시만요…</div>;
  }

  const submit = async () => {
    setError("");
    if (!email.includes("@")) return setError("이메일을 확인해 주세요.");
    if (password.length < 6) return setError("비밀번호는 6글자 이상이에요.");
    if (mode === "up" && !name.trim()) return setError("이름을 적어 주세요.");
    if (mode === "up" && !agree) return setError("약관 동의를 눌러 주세요.");
    setBusy(true);
    try {
      if (mode === "up") await signUp(email, password, name.trim(), null, true, { memberType: "personal" });
      else await signIn(email, password);
    } catch (err) {
      setError(authMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-7 px-5 py-10">
      <div className="text-center">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-[#3B4CCA] to-[#2D3A8C] text-[52px] font-black text-white">
          D
        </div>
        <h1 className="mt-5 text-[44px] font-black text-[#3B4CCA]">다랜드</h1>
      </div>

      <div className="flex flex-col gap-4">
        {mode === "up" && (
          <label className="flex flex-col gap-2">
            <span className="text-[24px] font-bold">이름</span>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </label>
        )}
        <label className="flex flex-col gap-2">
          <span className="text-[24px] font-bold">이메일</span>
          <input
            className={input}
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[24px] font-bold">비밀번호</span>
          <input
            className={input}
            type="password"
            autoComplete={mode === "up" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </label>

        {mode === "up" && (
          <button
            type="button"
            role="checkbox"
            aria-checked={agree}
            onClick={() => setAgree((v) => !v)}
            className={`flex min-h-[88px] items-center gap-4 rounded-2xl border-2 px-5 text-left text-[24px] font-bold ${
              agree ? "border-[#3B4CCA] bg-[#3B4CCA]/10 text-[#3B4CCA]" : "border-[#BEC4D4] bg-white text-[#1A1F36]"
            }`}
          >
            <span className="text-[36px]" aria-hidden>
              {agree ? "☑" : "☐"}
            </span>
            약관에 모두 동의해요
          </button>
        )}
        {mode === "up" && (
          <p className="-mt-3 text-[20px] text-[#6B7394]">
            <Link href="/terms" className="underline">
              이용약관
            </Link>{" "}
            ·{" "}
            <Link href="/privacy" className="underline">
              개인정보
            </Link>{" "}
            · 베타 시연(가상 포인트)
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-2xl bg-[#EF4444]/10 px-5 py-4 text-[24px] font-bold text-[#EF4444]">
            {error}
          </p>
        )}

        <BigButton tone="gold" onClick={submit} disabled={busy}>
          {busy ? "잠시만요…" : mode === "up" ? "가입하기" : "들어가기"}
        </BigButton>
        <BigButton small onClick={() => { setMode(mode === "in" ? "up" : "in"); setError(""); }}>
          {mode === "in" ? "처음이에요 (가입)" : "이미 가입했어요"}
        </BigButton>
        {isDemo && (
          <BigButton small onClick={demoSignIn}>
            그냥 둘러보기
          </BigButton>
        )}
      </div>
    </main>
  );
}
