import { describe, expect, it } from "vitest";
import { buildLegPolylineSegments } from "./legPolylineSegments";
import type { NormalizedRoute } from "./providers/types";
import type { WeatherLeg } from "./groupIntoLegs";
import type { StopWithWeather } from "./sampleRoute";

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

  it("carries the leg's category through to the segment", () => {
    const route = fixtureRoute();
    const leg = { ...legFrom(0, 2), category: "rain" as const };
    const segments = buildLegPolylineSegments(route, [leg]);
    expect(segments[0].category).toBe("rain");
  });

  it("returns an empty array for no legs", () => {
    expect(buildLegPolylineSegments(fixtureRoute(), [])).toEqual([]);
  });
});
