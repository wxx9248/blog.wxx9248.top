import { describe, expect, it } from "vitest";
import { convertBilibiliId } from "@/lib/bilibili/id";

describe("convertBilibiliId", () => {
  it("converts an AV id to its BV id", () => {
    expect(convertBilibiliId("av170001")).toBe("BV17x411w7KC");
  });

  it("converts a BV id to its AV id", () => {
    expect(convertBilibiliId("BV17x411w7KC")).toBe("av170001");
  });

  it("converts ids beyond 32 bits both ways", () => {
    expect(convertBilibiliId("av1054803170")).toBe("BV1mH4y1u7UA");
    expect(convertBilibiliId("BV1mH4y1u7UA")).toBe("av1054803170");
    expect(convertBilibiliId("av111298867365120")).toBe("BV1L9Uoa9EUx");
    expect(convertBilibiliId("BV1L9Uoa9EUx")).toBe("av111298867365120");
  });

  it("rejects AV ids too large for a BV id", () => {
    expect(convertBilibiliId("av2251799813685248")).toBeNull();
  });

  it("ignores surrounding space and the prefix's case", () => {
    expect(convertBilibiliId("  AV170001 ")).toBe("BV17x411w7KC");
  });

  it("rejects anything else", () => {
    expect(convertBilibiliId("")).toBeNull();
    expect(convertBilibiliId("170001")).toBeNull();
    expect(convertBilibiliId("BV17x411")).toBeNull();
  });

  it("rejects BV ids with characters outside the alphabet", () => {
    expect(convertBilibiliId("BV17x411w7K0")).toBeNull();
  });
});
