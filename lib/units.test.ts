import { describe, expect, it } from "vitest";
import { convertTemperature, formatTemperature, formatTemperatureRange } from "./units";

describe("units", () => {
  it("converts Celsius to Fahrenheit correctly", () => {
    expect(convertTemperature(0, "F")).toBe(32);
    expect(convertTemperature(100, "F")).toBe(212);
    expect(convertTemperature(20, "C")).toBe(20);
  });

  it("formats a single temperature with its unit symbol", () => {
    expect(formatTemperature(0, "F")).toBe("32°F");
    expect(formatTemperature(20, "C")).toBe("20°C");
  });

  it("collapses a range to a single value when both round to the same degree", () => {
    expect(formatTemperatureRange(20, 20.4, "C")).toBe("20°C");
  });

  it("shows a range when the endpoints round to different degrees", () => {
    expect(formatTemperatureRange(15, 20, "C")).toBe("15–20°C");
  });
});
