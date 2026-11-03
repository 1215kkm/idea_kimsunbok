/**
 * 기업회원 정보 (가입 화면 · 서버 · 관리자 공용)
 *
 * 사업자등록번호는 국세청 검증식(가중치 1,3,7,1,3,7,1,3,5)으로 형식만 확인한다.
 * 실제 등록·휴폐업 여부 확인은 국세청 조회 API 계약 후 관리자 검토 단계에서 한다 (businessVerified=false 로 시작).
 */
export type MemberType = "personal" | "business";

export interface BusinessInfo {
  companyName: string;
  bizNumber: string; // 숫자 10자리
  ceoName: string;
}

export function normalizeBizNumber(raw: string): string {
  return (raw || "").replace(/[^0-9]/g, "");
}

/** 123-45-67890 형태로 보여준다 */
export function formatBizNumber(raw: string): string {
  const d = normalizeBizNumber(raw);
  if (d.length !== 10) return d;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

export function isValidBizNumber(raw: string): boolean {
  const d = normalizeBizNumber(raw);
  if (!/^\d{10}$/.test(d)) return false;
  const w = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(d[i]) * w[i];
  sum += Math.floor((Number(d[8]) * 5) / 10);
  return (10 - (sum % 10)) % 10 === Number(d[9]);
}

/** 입력 검사. 문제가 있으면 한국어 안내 문구, 없으면 정리된 값. */
export function parseBusinessInfo(
  raw: unknown,
): { ok: true; value: BusinessInfo } | { ok: false; field: keyof BusinessInfo; message: string } {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const companyName = typeof r.companyName === "string" ? r.companyName.trim().slice(0, 60) : "";
  const ceoName = typeof r.ceoName === "string" ? r.ceoName.trim().slice(0, 30) : "";
  const bizNumber = typeof r.bizNumber === "string" ? normalizeBizNumber(r.bizNumber) : "";
  if (!companyName) return { ok: false, field: "companyName", message: "상호(회사 이름)를 입력해 주세요." };
  if (!isValidBizNumber(bizNumber)) return { ok: false, field: "bizNumber", message: "사업자등록번호 10자리를 다시 확인해 주세요." };
  if (!ceoName) return { ok: false, field: "ceoName", message: "대표자 이름을 입력해 주세요." };
  return { ok: true, value: { companyName, bizNumber, ceoName } };
}
