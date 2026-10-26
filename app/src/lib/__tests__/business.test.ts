import { describe, expect, it } from "vitest";
import { formatBizNumber, isValidBizNumber, parseBusinessInfo } from "../business";

describe("사업자등록번호 검증식", () => {
  it("실제 공개된 번호는 통과한다 (삼성전자 124-81-00998)", () => {
    expect(isValidBizNumber("124-81-00998")).toBe(true);
    expect(isValidBizNumber("1248100998")).toBe(true);
  });

  it("끝자리가 틀리거나 자릿수가 모자라면 거절한다", () => {
    expect(isValidBizNumber("1248100999")).toBe(false);
    expect(isValidBizNumber("1234567890")).toBe(false);
    expect(isValidBizNumber("12481009")).toBe(false);
  });

  it("123-45-67890 형태로 보여준다", () => {
    expect(formatBizNumber("1248100998")).toBe("124-81-00998");
  });
});

describe("기업회원 입력 검사", () => {
  it("정상 입력은 숫자만 남겨 돌려준다", () => {
    const r = parseBusinessInfo({ companyName: " 다랜드 ", bizNumber: "124-81-00998", ceoName: "홍길동" });
    expect(r).toEqual({ ok: true, value: { companyName: "다랜드", bizNumber: "1248100998", ceoName: "홍길동" } });
  });

  it("빈 상호·틀린 번호·빈 대표자는 각각 알려 준다", () => {
    expect(parseBusinessInfo({ companyName: "", bizNumber: "1248100998", ceoName: "a" })).toMatchObject({ ok: false, field: "companyName" });
    expect(parseBusinessInfo({ companyName: "a", bizNumber: "1248100999", ceoName: "a" })).toMatchObject({ ok: false, field: "bizNumber" });
    expect(parseBusinessInfo({ companyName: "a", bizNumber: "1248100998", ceoName: " " })).toMatchObject({ ok: false, field: "ceoName" });
  });
});
