/**
 * 리워드광고 캠페인 문구 템플릿 · 정직줄 · 금칙어 (순수 함수, I/O 없음)
 *
 * 문구 확정본: docs/marketing/2026-09-06-reward-copy.md §1 (아뱅, 2026-09-06). 문구는 그 문서를 그대로 옮긴 것이며
 * 바꿀 때는 문서를 먼저 개정한다.
 *
 * 규칙 (CEO 확정): 리워드 = 광고주 예산에서 신규회원에게 100% 이전. 광고주에게 돌아오는 포인트 0.
 * "12만P", "120% 수익", "5% 평생", "입금하면 120%" 전부 금지 → 금칙어 (§1.5) 로 클라이언트·서버 양쪽에서 차단.
 *
 * P1-4 (지급 조건에 "첫 입금 1만P" 추가) 시 "가입하면" → "가입하고 첫 입금하면" 일괄 교체 + 정직줄에 "첫 입금 후 지급" 추가 (§1.6).
 */

export const COPY_TEMPLATE_IDS = ["plain", "first_come", "local_owner"] as const;
export type CopyTemplateId = (typeof COPY_TEMPLATE_IDS)[number];

export const MAX_HEADLINE_LENGTH = 20;
export const MAX_OWNER_NAME_LENGTH = 30;

export interface CopyVars {
  /** 광고주 표시명 (가게명·회사명·닉네임). 모든 템플릿이 조사 회피형이라 받침 문제 없음 */
  owner: string;
  /** 1인당 지급 P */
  unit: number;
  /** 모집 인원 */
  headcount: number;
  /** 8자 가입 코드. 미발급(미리보기) 단계면 빈 문자열 → "발급 예정" 으로 표시 */
  code: string;
}

export interface CopyTemplate {
  id: CopyTemplateId;
  name: string;
  tone: string;
  headline: (v: CopyVars) => string;
  /** 헤드라인이 20자를 넘을 때 쓰는 폴백 (없으면 그대로) */
  headlineFallback?: (v: CopyVars) => string;
  body: (v: CopyVars) => string;
  cta: (v: CopyVars) => string;
  kakao: (v: CopyVars) => string;
  instagram: (v: CopyVars) => [string, string];
}

export function formatUnit(unit: number): string {
  return `${unit.toLocaleString("ko-KR")}P`;
}

function codeOrPlaceholder(code: string): string {
  return code || "발급 예정";
}

export const COPY_TEMPLATES: readonly CopyTemplate[] = [
  {
    id: "plain",
    name: "담백",
    tone: "수식어 없이 숫자와 주체만. 기업·기관 기본값.",
    headline: (v) => `가입하면 ${formatUnit(v.unit)} 드립니다`,
    body: (v) =>
      `${v.owner}의 광고 예산에서 신규 회원 ${v.headcount}명에게 1인 1회 ${formatUnit(v.unit)}를 드립니다. 1P = 1원, 다랜드에서 바로 쓸 수 있어요.`,
    cta: (v) => `가입하고 ${formatUnit(v.unit)} 받기`,
    kakao: (v) =>
      `[${v.owner}] 다랜드 가입하면 ${formatUnit(v.unit)} 드려요. 광고주 예산에서 1인 1회, 1P = 1원. 가입 코드 ${codeOrPlaceholder(v.code)}`,
    instagram: (v) => [
      `가입하면 ${formatUnit(v.unit)}`,
      `${v.owner} 예산에서 · 1P = 1원 · 코드 ${codeOrPlaceholder(v.code)}`,
    ],
  },
  {
    id: "first_come",
    name: "선착순",
    tone: "예산은 제출 시 잠기고 인원은 유한 — 원장에 있는 사실 그대로.",
    headline: (v) => `선착순 ${v.headcount}명에게 ${formatUnit(v.unit)}`,
    headlineFallback: (v) => `선착순 ${v.headcount}명, ${formatUnit(v.unit)}`,
    body: (v) =>
      `${v.owner}에서 잠가 둔 예산은 딱 ${v.headcount}명분. 가입하면 1인 1회 ${formatUnit(v.unit)}, 1P = 1원. 마감 후 남은 예산은 광고주에게 돌아갑니다.`,
    cta: () => "지금 가입하기",
    kakao: (v) =>
      `[${v.owner}] 선착순 ${v.headcount}명에게 ${formatUnit(v.unit)}. 마감되면 끝, 1인 1회. 가입 코드 ${codeOrPlaceholder(v.code)}`,
    instagram: (v) => [
      `선착순 ${v.headcount}명, ${formatUnit(v.unit)}`,
      `마감되면 끝 · 1인 1회 · 코드 ${codeOrPlaceholder(v.code)}`,
    ],
  },
  {
    id: "local_owner",
    name: "동네 사장님",
    tone: "친근·구어. 사장님이 단골·이웃에게 카톡으로 보내는 상황.",
    headline: (v) => `${v.owner}에서 쏩니다, ${formatUnit(v.unit)}`,
    headlineFallback: (v) => `우리 가게가 쏩니다, ${formatUnit(v.unit)}`,
    body: (v) =>
      `${v.owner} 사장님이 광고 예산에서 동네 손님 ${v.headcount}분께 드리는 가입 선물. 1인 1회 ${formatUnit(v.unit)}, 1P = 1원. 다랜드 가입하면 끝.`,
    cta: () => "선물 받고 가입하기",
    kakao: (v) =>
      `${v.owner}에서 쏩니다. 다랜드 가입하면 ${formatUnit(v.unit)} (1P = 1원, 1인 1회). 가입 코드 ${codeOrPlaceholder(v.code)}`,
    instagram: (v) => [
      `${v.owner}에서 쏩니다`,
      `가입하면 ${formatUnit(v.unit)} · 1P = 1원 · 코드 ${codeOrPlaceholder(v.code)}`,
    ],
  },
];

export function getTemplate(id: string | null | undefined): CopyTemplate | null {
  return COPY_TEMPLATES.find((t) => t.id === id) ?? null;
}

export function isCopyTemplateId(v: unknown): v is CopyTemplateId {
  return typeof v === "string" && (COPY_TEMPLATE_IDS as readonly string[]).includes(v);
}

/**
 * 정직줄 — 모든 공유물·미리보기·캠페인 상세 맨 끝에 자동으로 붙는 한 줄. 광고주가 지울 수 없다.
 * 본문이 셋("광고주 예산에서", "1P = 1원", "1인 1회") 중 하나만 자연스럽게 녹여도 이 줄이 셋 다 보장한다.
 */
export function honestLine(code: string): string {
  return `광고주 예산에서 지급 · 1P = 1원 · 1인 1회 · 가입 코드 ${codeOrPlaceholder(code)}`;
}

/** 헤드라인 — 20자 초과 시 템플릿 폴백. 폴백도 넘으면 폴백 그대로 (더 줄이지 않는다: 문구는 아뱅 소관) */
export function renderHeadline(t: CopyTemplate, v: CopyVars): string {
  const h = t.headline(v);
  if (h.length <= MAX_HEADLINE_LENGTH || !t.headlineFallback) return h;
  return t.headlineFallback(v);
}

export interface RenderedCopy {
  headline: string;
  body: string;
  cta: string;
  /** rewardCampaigns.copy 에 저장되는 값: 헤드라인 + 개행 + 본문 (광고주가 이 텍스트를 수정할 수 있다) */
  copy: string;
}

export function renderTemplate(t: CopyTemplate, v: CopyVars): RenderedCopy {
  const headline = renderHeadline(t, v);
  const body = t.body(v);
  return { headline, body, cta: t.cta(v), copy: `${headline}\n${body}` };
}

/** 저장된 copy(헤드라인\n본문) 를 다시 두 조각으로 */
export function splitCopy(copy: string): { headline: string; body: string } {
  const idx = copy.indexOf("\n");
  if (idx < 0) return { headline: copy.trim(), body: "" };
  return { headline: copy.slice(0, idx).trim(), body: copy.slice(idx + 1).trim() };
}

export interface SharePack {
  /** 가입 화면이 코드를 프리필하는 링크 (`/?code=XXXX`) */
  link: string;
  /** 카톡 1줄 + 링크 + 정직줄 */
  kakao: string;
  /** 인스타 스토리 2줄 + 정직줄 */
  instagram: string;
  /** 기본 = 저장된 copy + 링크 + 정직줄 (어느 채널에나) */
  basic: string;
  honest: string;
}

export function buildShareLink(origin: string, code: string): string {
  return `${origin.replace(/\/$/, "")}/?code=${encodeURIComponent(code)}`;
}

/**
 * 공유 팩. templateId 가 없거나(광고주가 템플릿 없이 썼거나 구 데이터) 모르면 copy 기반 폴백.
 * 모든 결과물 끝에 정직줄이 붙는다.
 */
export function buildSharePack(args: {
  origin: string;
  code: string;
  copy: string;
  templateId?: string | null;
  vars: Omit<CopyVars, "code">;
}): SharePack {
  const { origin, code, copy, templateId, vars } = args;
  const v: CopyVars = { ...vars, code };
  const link = buildShareLink(origin, code);
  const honest = honestLine(code);
  const t = getTemplate(templateId);
  const { headline } = splitCopy(copy);
  const kakaoLine = t ? t.kakao(v) : `[${v.owner}] ${headline}`;
  const instaLines = t ? t.instagram(v) : [headline, `${v.owner} 예산에서 · 코드 ${code}`];
  return {
    link,
    honest,
    kakao: `${kakaoLine}\n${link}\n${honest}`,
    instagram: `${instaLines[0]}\n${instaLines[1]}\n${honest}`,
    basic: `${copy.trim()}\n${link}\n${honest}`,
  };
}

// ---------------------------------------------------------------------------
// 금칙어 (§1.5) — 광고주 자유 입력 copy 저장 전 클라이언트·서버 양쪽에서 검사
// ---------------------------------------------------------------------------

export interface ForbiddenRule {
  /** 사용자에게 보여줄 표현 */
  label: string;
  test: (text: string) => boolean;
  reason: string;
}

const CARD_OCR_RE = /카드/;
const OCR_OR_RECEIPT_RE = /OCR|영수증/i;

function includesAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

/** 제로폭·공백류 (BOM, ZWSP, ZWNJ, ZWJ, word joiner, 각종 스페이스) — 사이에 끼워 넣는 우회를 막는다 */
const INVISIBLE_RE = /[\s\u00ad\u200b-\u200f\u2028\u2029\u202a-\u202e\u2060\ufeff]/g;

/**
 * 금칙어 매칭용 정규화 — 사람 눈에 같아 보이는 것을 같은 문자열로.
 *  - NFKC: 전각 `１２０％` → `120%`, `㈜`·합자 등 호환 문자 분해
 *  - 대문자 통일 (OCR 예외 규칙은 별도 대소문자 무시 정규식)
 *  - 공백·제로폭 제거: `1 2 0 %`, `수 익`, `12 만` 우회 차단
 * 사용자에게 보여주는 문구는 원문 그대로 두고, 검사만 이 사본으로 한다.
 */
export function normalizeForMatch(raw: string): string {
  return (raw || "").normalize("NFKC").replace(INVISIBLE_RE, "");
}

export const FORBIDDEN_RULES: readonly ForbiddenRule[] = [
  {
    label: "120% (120퍼·1.2배·백이십 포함)",
    // 문구 안에 "카드" + ("OCR" | "영수증") 이 함께 있으면 실지출 120% 문맥이라 허용
    test: (t) => /120%|120퍼|1\.2배|백이십/.test(t) && !(CARD_OCR_RE.test(t) && OCR_OR_RECEIPT_RE.test(t)),
    reason: "리워드 문맥의 120%는 무에서 생성 약속",
  },
  {
    label: "12만 / 120만 / 1,200만",
    test: (t) => /(?<![\d,])(12만|120만|1,?200만)/.test(t),
    reason: "예산×1.2 계열 숫자",
  },
  { label: "수익", test: (t) => t.includes("수익"), reason: "광고주·회원 수익 모두 없음" },
  { label: "평생", test: (t) => t.includes("평생"), reason: "5% 평생 배분은 미확정(P2)" },
  { label: "5%", test: (t) => /(?<![\d.])5%/.test(t), reason: "5% 배분은 미확정(P2)" },
  { label: "투자", test: (t) => t.includes("투자"), reason: "유사수신 오해" },
  { label: "보장", test: (t) => t.includes("보장"), reason: "표시광고법" },
  {
    label: "입금하면 + 120",
    test: (t) => t.includes("입금하면") && t.includes("120"),
    reason: "입금은 100%",
  },
  {
    label: "데이터 노동 / 기본소득",
    test: (t) => includesAny(t, ["데이터 노동", "데이터노동", "기본소득"]),
    reason: "법적 정의 없음",
  },
  {
    label: "무한 / 무제한 / 횟수 제한 없이",
    test: (t) => includesAny(t, ["무한", "무제한", "횟수 제한 없이", "횟수제한 없이"]),
    reason: "1인 1회와 충돌",
  },
  {
    label: "1초에 / 하루에 N억",
    test: (t) => t.includes("1초에") || /하루에\s*[\d,]+\s*억/.test(t),
    reason: "근거 없는 수익 약속",
  },
];

/**
 * 걸린 금칙어 라벨 목록 (빈 배열 = 통과).
 * 검사는 NFKC + 공백·제로폭 제거 사본으로 한다 — `1 2 0 %`, `１２０％`, `수 익` 같은 우회를 같은 문자열로 본다.
 */
export function findForbiddenTerms(text: string): string[] {
  const t = normalizeForMatch(text);
  return FORBIDDEN_RULES.filter((r) => r.test(t)).map((r) => r.label);
}

export function forbiddenMessage(labels: string[]): string {
  return `이 표현은 쓸 수 없습니다: ${labels.join(", ")}`;
}

/**
 * 실존 타사 상호 (§1.5 #12) — P0 는 경고만, 차단은 법무 검토 후.
 * 광고주 본인 상호가 같을 수 있으므로 서버는 막지 않고 화면에서만 안내한다.
 */
export const BRAND_WARN_WORDS = ["신한", "삼성", "CJ", "스타벅스", "국민은행", "카카오뱅크", "토스", "쿠팡", "네이버페이"] as const;

export function findBrandWarnings(text: string): string[] {
  const t = normalizeForMatch(text);
  return BRAND_WARN_WORDS.filter((w) => t.includes(w));
}
