import { expect, it } from "vitest";
import { formatDate, formatSize } from "@/lib/posts/format";

it("formats sizes like ls -h", () => {
  expect(formatSize(512)).toBe("512");
  expect(formatSize(4300)).toBe("4.2K");
  expect(formatSize(12_800)).toBe("13K");
  expect(formatSize(3 * 1024 * 1024)).toBe("3.0M");
});

it("formats dates as UTC ISO dates", () => {
  expect(formatDate(new Date("2021-02-15T21:54:00-05:00"))).toBe("2021-02-16");
});
