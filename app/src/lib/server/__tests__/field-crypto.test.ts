import { beforeEach, describe, expect, it } from "vitest";
import { __resetFieldCryptoKey, decryptField, encryptField, isEncrypted, maskAccount } from "../field-crypto";
import { maskedBankInfo, openBankInfo, sealBankInfo } from "../withdraw-service";

beforeEach(() => {
  process.env.ACCOUNT_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
  __resetFieldCryptoKey();
});

describe("계좌번호 암호화 (AES-256-GCM)", () => {
  it("암호화 → 복호화하면 원래 번호, 암호문에는 번호가 보이지 않는다", () => {
    const enc = encryptField("3333011234567");
    expect(isEncrypted(enc)).toBe(true);
    expect(enc).not.toContain("3333011234567");
    expect(decryptField(enc)).toBe("3333011234567");
  });

  it("같은 번호도 매번 다른 암호문 (무작위 IV)", () => {
    expect(encryptField("1234567890")).not.toBe(encryptField("1234567890"));
  });

  it("다른 키로는 열리지 않는다", () => {
    const enc = encryptField("1234567890");
    process.env.ACCOUNT_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString("base64");
    __resetFieldCryptoKey();
    expect(() => decryptField(enc)).toThrow();
  });

  it("암호화 이전의 평문 기록은 그대로 읽는다", () => {
    expect(decryptField("110123456789")).toBe("110123456789");
  });

  it("화면에는 뒤 4자리만", () => {
    expect(maskAccount("3333011234567")).toBe("********4567");
  });
});

describe("출금 계좌 저장 형식", () => {
  const bank = { bank: "kakao", accountNumber: "3333011234567", holder: "홍길동" };

  it("저장본에는 평문이 없고, 관리자는 전체 번호, 회원은 가린 번호를 본다", () => {
    const sealed = sealBankInfo(bank);
    expect(JSON.stringify(sealed)).not.toContain("3333011234567");
    expect(openBankInfo(sealed)).toEqual(bank);
    expect(maskedBankInfo(sealed)).toEqual({ bank: "kakao", accountNumber: "****4567" });
  });

  it("예전 평문 기록도 관리자 화면에서 읽힌다", () => {
    expect(openBankInfo({ bank: "kb", accountNumber: "110123456789", holder: "김" })?.accountNumber).toBe("110123456789");
  });
});
