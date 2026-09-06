/** 관리자 화면 표시용 포맷 (순수 함수) */

export const fmt = (n: number): string => n.toLocaleString("ko-KR");

export const fmtP = (n: number): string => `${fmt(n)} P`;

/** +1,000 / −1,000 (0 은 부호 없음) */
export const fmtSigned = (n: number): string => (n > 0 ? `+${fmt(n)}` : n < 0 ? `−${fmt(-n)}` : "0");

export function fmtDateTime(ms: number | null | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function fmtDate(ms: number | null | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

/** 09-06 10:31 */
export function fmtShort(ms: number | null | undefined): string {
  if (!ms) return "—";
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 26시간 경과 / 3일 경과 */
export function fmtElapsed(ms: number | null | undefined, now: number = Date.now()): string {
  if (!ms) return "—";
  const h = Math.floor((now - ms) / 3_600_000);
  if (h < 1) return "1시간 미만";
  if (h < 48) return `${h}시간 경과`;
  return `${Math.floor(h / 24)}일 경과`;
}

/** kim***@gmail.com */
export function maskEmail(email: string): string {
  if (!email) return "—";
  const at = email.indexOf("@");
  if (at <= 0) return email;
  const local = email.slice(0, at);
  const head = local.slice(0, Math.min(3, local.length));
  return `${head}***${email.slice(at)}`;
}
