import { describe, expect, it } from "vitest";
import {
  COPY_TEMPLATES,
  MAX_HEADLINE_LENGTH,
  buildSharePack,
  findBrandWarnings,
  findForbiddenTerms,
  getTemplate,
  honestLine,
  renderHeadline,
  renderTemplate,
  splitCopy,
  type CopyVars,
} from "../reward-copy-templates";

const SAMPLE: CopyVars = { owner: "김밥천국", unit: 100_000, headcount: 10, code: "ABCD1234" };

describe("reward-copy-templates (아뱅 확정본 2026-09-06 §1)", () => {
  it("템플릿 3종 전부 금칙어 0건 — 헤드라인·본문·CTA·카톡·인스타·정직줄", () => {
    for (const t of COPY_TEMPLATES) {
      const r = renderTemplate(t, SAMPLE);
      const all = [r.headline, r.body, r.cta, t.kakao(SAMPLE), ...t.instagram(SAMPLE), honestLine(SAMPLE.code)].join("\n");
      expect(findForbiddenTerms(all), t.id).toEqual([]);
      // 정직 3요소 중 하나 이상이 본문에 있고, 정직줄이 셋 다 보장
      expect(/1P = 1원|광고 예산|1인 1회/.test(r.body), t.id).toBe(true);
    }
    const h = honestLine("ABCD1234");
    expect(h).toBe("광고주 예산에서 지급 · 1P = 1원 · 1인 1회 · 가입 코드 ABCD1234");
  });

  it("표본값 헤드라인은 20자 이하, 초과 조합은 폴백으로 내려간다", () => {
    for (const t of COPY_TEMPLATES) {
      expect(renderHeadline(t, SAMPLE).length, t.id).toBeLessThanOrEqual(MAX_HEADLINE_LENGTH);
    }
    // ② 선착순: 1천만P × 100명 → 21자 → 콤마 폴백
    const fc = getTemplate("first_come")!;
    const big = { ...SAMPLE, unit: 10_000_000, headcount: 100 };
    expect(fc.headline(big).length).toBeGreaterThan(MAX_HEADLINE_LENGTH);
    expect(renderHeadline(fc, big)).toBe("선착순 100명, 10,000,000P");
    // ③ 동네 사장님: 상호 5자 이상 → "우리 가게가 쏩니다"
    const lo = getTemplate("local_owner")!;
    const longOwner = { ...SAMPLE, owner: "행복한김밥천국" };
    expect(renderHeadline(lo, longOwner)).toBe("우리 가게가 쏩니다, 100,000P");
    expect(renderHeadline(lo, SAMPLE)).toBe("김밥천국에서 쏩니다, 100,000P");
  });

  it("copy 저장 형식 = 헤드라인\\n본문, splitCopy 로 복원", () => {
    const r = renderTemplate(getTemplate("plain")!, SAMPLE);
    expect(r.copy).toBe(`${r.headline}\n${r.body}`);
    expect(splitCopy(r.copy)).toEqual({ headline: r.headline, body: r.body });
    expect(splitCopy("한 줄만")).toEqual({ headline: "한 줄만", body: "" });
  });

  it("공유 팩: 링크는 /?code=, 카톡·인스타·기본 전부 정직줄로 끝난다", () => {
    const r = renderTemplate(getTemplate("first_come")!, SAMPLE);
    const pack = buildSharePack({
      origin: "https://daland.example/",
      code: "ABCD1234",
      copy: r.copy,
      templateId: "first_come",
      vars: { owner: "김밥천국", unit: 100_000, headcount: 10 },
    });
    expect(pack.link).toBe("https://daland.example/?code=ABCD1234");
    const honest = honestLine("ABCD1234");
    for (const text of [pack.kakao, pack.instagram, pack.basic]) {
      expect(text.endsWith(honest)).toBe(true);
      expect(findForbiddenTerms(text)).toEqual([]);
    }
    expect(pack.kakao.startsWith("[김밥천국] 선착순 10명에게 100,000P.")).toBe(true);
    expect(pack.instagram.split("\n")[0]).toBe("선착순 10명, 100,000P");
    // 템플릿 없이(직접 작성) 저장된 copy 도 폴백으로 공유 팩이 나온다
    const custom = buildSharePack({
      origin: "https://daland.example",
      code: "ZZZZ9999",
      copy: "우리 가게 오픈 기념\n가입하면 10,000P",
      templateId: null,
      vars: { owner: "분식집", unit: 10_000, headcount: 5 },
    });
    expect(custom.kakao.split("\n")[0]).toBe("[분식집] 우리 가게 오픈 기념");
    expect(custom.basic.endsWith(honestLine("ZZZZ9999"))).toBe(true);
  });

  it("금칙어 12종: 시안 위반 문구는 걸리고, 어떤 단어인지 돌려준다", () => {
    expect(findForbiddenTerms("광고주가 10만P 지급하면 Model A로 120%(12만P) 광고주에게 지급")).toEqual([
      "120% (120퍼·1.2배·백이십 포함)",
      "12만 / 120만 / 1,200만",
    ]);
    expect(findForbiddenTerms("신규 회원이 지출할 때마다 5%를 평생 광고주에게")).toEqual(["평생", "5%"]);
    expect(findForbiddenTerms("입금하면 120% 증액 적립")).toEqual(["120% (120퍼·1.2배·백이십 포함)", "입금하면 + 120"]);
    expect(findForbiddenTerms("투자하면 수익 보장")).toEqual(["수익", "투자", "보장"]);
    expect(findForbiddenTerms("이것을 데이터 노동이라고 합니다. 기본소득!")).toEqual(["데이터 노동 / 기본소득"]);
    expect(findForbiddenTerms("하루에도 횟수 제한 없이 무제한 증액")).toEqual(["무한 / 무제한 / 횟수 제한 없이"]);
    expect(findForbiddenTerms("1초에 2천만원, 하루에 1억 번다")).toEqual(["1초에 / 하루에 N억"]);
    expect(findForbiddenTerms("1,200만P 드립니다")).toEqual(["12만 / 120만 / 1,200만"]);
  });

  it("금칙어 우회 차단: 공백·전각·제로폭·한글 변형도 같은 문자열로 본다 (강체크 N-1)", () => {
    const NUM = "120% (120퍼·1.2배·백이십 포함)";
    // 공백 끼워넣기
    expect(findForbiddenTerms("1 2 0 % 적립")).toEqual([NUM]);
    expect(findForbiddenTerms("수 익 이 납니다")).toEqual(["수익"]);
    // 전각 (NFKC)
    expect(findForbiddenTerms("１２０％ 지급")).toEqual([NUM]);
    expect(findForbiddenTerms("１２만P 드립니다")).toEqual(["12만 / 120만 / 1,200만"]);
    // 제로폭 문자
    expect(findForbiddenTerms("120​% 수﻿익")).toEqual([NUM, "수익"]);
    // 한글·배수 변형
    expect(findForbiddenTerms("백이십 퍼센트 돌려드립니다")).toEqual([NUM]);
    expect(findForbiddenTerms("120퍼 적립")).toEqual([NUM]);
    expect(findForbiddenTerms("1.2배로 돌아옵니다")).toEqual([NUM]);
    // 상호 경고도 같은 정규화를 쓴다
    expect(findBrandWarnings("신 한 은행 제휴")).toEqual(["신한"]);
  });

  it("금칙어 예외·오탐 방지: 카드+OCR 문맥의 120%, 112만, 10.5%, 10만 은 통과", () => {
    expect(findForbiddenTerms("카드 결제 후 영수증 OCR 검증 시 120% 적립")).toEqual([]);
    expect(findForbiddenTerms("선착순 120명 모집")).toEqual([]);
    expect(findForbiddenTerms("가입 시 10만P 지급")).toEqual([]);
    expect(findForbiddenTerms("112만P")).toEqual([]);
    expect(findForbiddenTerms("10.5% 할인")).toEqual([]);
    expect(findForbiddenTerms("")).toEqual([]);
  });

  it("타사 상호는 차단이 아니라 경고 목록", () => {
    expect(findBrandWarnings("신한은행 제휴 이벤트")).toEqual(["신한"]);
    expect(findForbiddenTerms("신한은행 제휴 이벤트")).toEqual([]);
    expect(findBrandWarnings("김밥천국")).toEqual([]);
  });
});
