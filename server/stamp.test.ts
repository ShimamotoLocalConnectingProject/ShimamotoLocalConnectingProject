import { describe, expect, it } from "vitest";
import { calcStampValue, generateQrToken, verifyQrToken } from "./db";

describe("calcStampValue", () => {
  it("returns 1.0 for 1st visit", () => {
    expect(calcStampValue(1)).toBe(1.0);
  });

  it("returns 1.0 for 2nd visit", () => {
    expect(calcStampValue(2)).toBe(1.0);
  });

  it("returns 0.5 for 3rd visit", () => {
    expect(calcStampValue(3)).toBe(0.5);
  });

  it("returns 0.5 for 10th visit", () => {
    expect(calcStampValue(10)).toBe(0.5);
  });

  it("returns 0.5 for 100th visit", () => {
    expect(calcStampValue(100)).toBe(0.5);
  });
});

describe("QR token generation and verification", () => {
  const storeId = 1;
  const qrSecret = "test-secret-uuid-1234";
  const date = "2026-03-06";

  it("generates a 32-character hex token", () => {
    const token = generateQrToken(storeId, qrSecret, date);
    expect(token).toHaveLength(32);
    expect(token).toMatch(/^[0-9a-f]{32}$/);
  });

  it("generates the same token for the same inputs", () => {
    const token1 = generateQrToken(storeId, qrSecret, date);
    const token2 = generateQrToken(storeId, qrSecret, date);
    expect(token1).toBe(token2);
  });

  it("generates different tokens for different dates", () => {
    const token1 = generateQrToken(storeId, qrSecret, "2026-03-06");
    const token2 = generateQrToken(storeId, qrSecret, "2026-03-07");
    expect(token1).not.toBe(token2);
  });

  it("generates different tokens for different stores", () => {
    const token1 = generateQrToken(1, qrSecret, date);
    const token2 = generateQrToken(2, qrSecret, date);
    expect(token1).not.toBe(token2);
  });

  it("generates different tokens for different secrets", () => {
    const token1 = generateQrToken(storeId, "secret-a", date);
    const token2 = generateQrToken(storeId, "secret-b", date);
    expect(token1).not.toBe(token2);
  });

  it("verifies a valid token", () => {
    const token = generateQrToken(storeId, qrSecret, date);
    expect(verifyQrToken(storeId, qrSecret, date, token)).toBe(true);
  });

  it("rejects an invalid token", () => {
    expect(verifyQrToken(storeId, qrSecret, date, "invalid-token-string")).toBe(false);
  });

  it("rejects a token from a different date", () => {
    const token = generateQrToken(storeId, qrSecret, "2026-03-06");
    expect(verifyQrToken(storeId, qrSecret, "2026-03-07", token)).toBe(false);
  });

  it("rejects a token from a different store", () => {
    const token = generateQrToken(1, qrSecret, date);
    expect(verifyQrToken(2, qrSecret, date, token)).toBe(false);
  });
});
