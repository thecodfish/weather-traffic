import { describe, expect, it } from "vitest";
import { blendHexColors } from "./color";

describe("blendHexColors", () => {
  it("averages two colors channel-wise", () => {
    expect(blendHexColors("#000000", "#ffffff")).toBe("#808080");
  });

  it("returns the same color when blending a color with itself", () => {
    expect(blendHexColors("#2563eb", "#2563eb")).toBe("#2563eb");
  });

  it("blends distinct category colors into a mid color", () => {
    // amber (clear) and blue (rain)
    expect(blendHexColors("#f59e0b", "#2563eb")).toBe("#8d817b");
  });

  it("is order-independent", () => {
    expect(blendHexColors("#f59e0b", "#2563eb")).toBe(blendHexColors("#2563eb", "#f59e0b"));
  });
});
