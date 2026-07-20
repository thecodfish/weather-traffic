import { describe, expect, it } from "vitest";
import { buildLegPolylineSegments } from "./legPolylineSegments";
import type { NormalizedRoute } from "./providers/types";
import type { WeatherLeg } from "./groupIntoLegs";
import type { StopWithWeather } from "./sampleRoute";
import { WEATHER_CATEGORY_HEX_COLORS } from "./weatherCodes";
import { blendHexColors } from "./color";

// 5 steps -> geometry[0..5], step i location === geometry[i+1] (matches osrm.ts convention)
function fixtureRoute(): NormalizedRoute {
  const geometry = Array.from({ length: 6 }, (_, i) => ({ lat: i, lon: i }));
  const steps = Array.from({ length: 5 }, (_, i) => ({
    distanceMeters: 1000,
    durationSeconds: 60,
    cumulativeDurationSeconds: (i + 1) * 60,
    location: geometry[i + 1],
  }));
  return { distanceMeters: 5000, durationSeconds: 300, geometry, steps };
}

function stopAt(stepIndex: number): StopWithWeather {
  return {
    location: { lat: stepIndex, lon: stepIndex },
    etaOffsetSeconds: 0,
    eta: new Date(),
    cumulativeDistanceMeters: 0,
    stepIndex,
  };
}

function legFrom(startStepIndex: number, endStepIndex: number): WeatherLeg {
  return {
    startStop: stopAt(startStepIndex),
    endStop: stopAt(endStepIndex),
    stops: [],
    category: "clear",
    label: "Clear sky",
    minTemperatureC: 10,
    maxTemperatureC: 10,
    maxPrecipitationMm: 0,
  };
}

describe("buildLegPolylineSegments", () => {
  it("slices route geometry between a leg's start and end step index", () => {
    const route = fixtureRoute();
    const segments = buildLegPolylineSegments(route, [legFrom(1, 3)]);

    expect(segments).toHaveLength(1);
    // starts at step[1].location, includes step[2] and step[3]
    expect(segments[0].positions).toEqual([
      route.steps[1].location,
      route.steps[2].location,
      route.steps[3].location,
    ]);
  });

  it("starts from route.geometry[0] when the leg begins at the route origin (stepIndex -1)", () => {
    const route = fixtureRoute();
    const segments = buildLegPolylineSegments(route, [legFrom(-1, 1)]);

    expect(segments[0].positions[0]).toEqual(route.geometry[0]);
    expect(segments[0].positions).toEqual([route.geometry[0], route.steps[0].location, route.steps[1].location]);
  });

  it("produces adjoining segments for consecutive legs (shared boundary point)", () => {
    const route = fixtureRoute();
    const segments = buildLegPolylineSegments(route, [legFrom(-1, 2), legFrom(2, 4)]);

    const firstEnd = segments[0].positions[segments[0].positions.length - 1];
    const secondStart = segments[1].positions[0];
    expect(firstEnd).toEqual(secondStart);
  });

  it("colors a normal (multi-point) segment by the leg's own category", () => {
    const route = fixtureRoute();
    const leg = { ...legFrom(0, 2), category: "rain" as const };
    const segments = buildLegPolylineSegments(route, [leg]);
    expect(segments[0].color).toBe(WEATHER_CATEGORY_HEX_COLORS.rain);
  });

  it("returns an empty array for no legs", () => {
    expect(buildLegPolylineSegments(fixtureRoute(), [])).toEqual([]);
  });

  describe("single-sample legs", () => {
    it("borrows the previous step's point so a 1-sample leg still gets a visible line", () => {
      const route = fixtureRoute();
      // leg at stepIndex 2 only (start === end) -> degenerate on its own
      const segments = buildLegPolylineSegments(route, [legFrom(0, 0), legFrom(2, 2)]);

      expect(segments[1].positions).toHaveLength(2);
      expect(segments[1].positions).toEqual([route.steps[1].location, route.steps[2].location]);
    });

    it("blends the color with the previous leg's category", () => {
      const route = fixtureRoute();
      const clearLeg = { ...legFrom(0, 0), category: "clear" as const };
      const rainLeg = { ...legFrom(1, 1), category: "rain" as const };
      const segments = buildLegPolylineSegments(route, [clearLeg, rainLeg]);

      expect(segments[1].color).toBe(
        blendHexColors(WEATHER_CATEGORY_HEX_COLORS.rain, WEATHER_CATEGORY_HEX_COLORS.clear),
      );
    });

    it("uses its own color with no blending when it's the first leg", () => {
      const route = fixtureRoute();
      const leg = { ...legFrom(2, 2), category: "snow" as const };
      const segments = buildLegPolylineSegments(route, [leg]);

      expect(segments[0].color).toBe(WEATHER_CATEGORY_HEX_COLORS.snow);
    });

    it("borrows route.geometry[0] when the degenerate leg is right at stepIndex 0", () => {
      const route = fixtureRoute();
      const firstLeg = { ...legFrom(-1, -1), category: "clear" as const };
      const secondLeg = { ...legFrom(0, 0), category: "fog" as const };
      const segments = buildLegPolylineSegments(route, [firstLeg, secondLeg]);

      expect(segments[1].positions).toEqual([route.geometry[0], route.steps[0].location]);
    });

    it("stays a single point with no borrowing when it's the very first origin-only sample", () => {
      const route = fixtureRoute();
      const leg = { ...legFrom(-1, -1), category: "clear" as const };
      const segments = buildLegPolylineSegments(route, [leg]);

      expect(segments[0].positions).toEqual([route.geometry[0]]);
    });
  });
});
