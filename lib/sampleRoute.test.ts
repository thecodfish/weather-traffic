import { describe, expect, it } from "vitest";
import { sampleRoute } from "./sampleRoute";
import type { NormalizedRoute } from "./providers/types";

/** A synthetic 60-minute route with no network calls, one step per minute. */
function fixtureRoute(): NormalizedRoute {
  const stepCount = 60;
  const totalDuration = 3600;
  const totalDistance = 100_000;
  const geometry = [{ lat: 0, lon: 0 }];
  const steps: NormalizedRoute["steps"] = [];

  for (let i = 1; i <= stepCount; i++) {
    const location = { lat: i, lon: i };
    geometry.push(location);
    steps.push({
      distanceMeters: totalDistance / stepCount,
      durationSeconds: totalDuration / stepCount,
      cumulativeDurationSeconds: (totalDuration / stepCount) * i,
      location,
    });
  }

  return { distanceMeters: totalDistance, durationSeconds: totalDuration, geometry, steps };
}

/** Mirrors real OSRM data: many fine-grained steps with a non-round total duration. */
function fineGrainedFixtureRoute(): NormalizedRoute {
  const stepCount = 337;
  const totalDuration = 1349.5;
  const geometry = [{ lat: 0, lon: 0 }];
  const steps: NormalizedRoute["steps"] = [];
  for (let i = 1; i <= stepCount; i++) {
    const location = { lat: i, lon: i };
    geometry.push(location);
    steps.push({
      distanceMeters: 21009.8 / stepCount,
      durationSeconds: totalDuration / stepCount,
      cumulativeDurationSeconds: (totalDuration / stepCount) * i,
      location,
    });
  }
  return { distanceMeters: 21009.8, durationSeconds: totalDuration, geometry, steps };
}

describe("sampleRoute", () => {
  it("always includes origin and destination", () => {
    const departure = new Date("2026-07-19T12:00:00Z");
    const samples = sampleRoute(fixtureRoute(), departure, { maxSamples: 5 });

    expect(samples[0].eta.getTime()).toBe(departure.getTime());
    expect(samples[0].etaOffsetSeconds).toBe(0);

    const last = samples[samples.length - 1];
    expect(last.etaOffsetSeconds).toBe(3600);
    expect(last.eta.getTime()).toBe(departure.getTime() + 3600 * 1000);
  });

  it("spaces samples evenly across the route", () => {
    const departure = new Date("2026-07-19T12:00:00Z");
    const samples = sampleRoute(fixtureRoute(), departure, { maxSamples: 5 });

    expect(samples).toHaveLength(5);
    expect(samples.map((s) => s.etaOffsetSeconds)).toEqual([0, 900, 1800, 2700, 3600]);
  });

  it("produces exactly maxSamples points regardless of the requested count", () => {
    const departure = new Date("2026-07-19T12:00:00Z");
    for (const maxSamples of [2, 3, 4, 5, 10, 20]) {
      expect(sampleRoute(fixtureRoute(), departure, { maxSamples })).toHaveLength(maxSamples);
    }
  });

  it("produces exactly maxSamples points even when duration doesn't divide evenly", () => {
    // A non-round total duration is where naive floating-point accumulation
    // drifts and can produce an extra near-duplicate point at the end.
    const route = fineGrainedFixtureRoute();
    const departure = new Date("2026-07-19T12:00:00Z");
    for (let maxSamples = 2; maxSamples <= 10; maxSamples++) {
      expect(sampleRoute(route, departure, { maxSamples })).toHaveLength(maxSamples);
    }
  });

  it("clamps below-minimum sample counts up to 2", () => {
    const departure = new Date("2026-07-19T12:00:00Z");
    const samples = sampleRoute(fixtureRoute(), departure, { maxSamples: 1 });
    expect(samples).toHaveLength(2);
  });

  it("produces monotonically increasing ETAs and cumulative distance", () => {
    const departure = new Date("2026-07-19T12:00:00Z");
    const samples = sampleRoute(fixtureRoute(), departure);

    for (let i = 1; i < samples.length; i++) {
      expect(samples[i].eta.getTime()).toBeGreaterThan(samples[i - 1].eta.getTime());
      expect(samples[i].cumulativeDistanceMeters).toBeGreaterThan(
        samples[i - 1].cumulativeDistanceMeters,
      );
    }
  });

  it("returns a single point for a zero-duration route", () => {
    const departure = new Date("2026-07-19T12:00:00Z");
    const route: NormalizedRoute = {
      distanceMeters: 0,
      durationSeconds: 0,
      geometry: [{ lat: 1, lon: 1 }],
      steps: [],
    };

    const samples = sampleRoute(route, departure);
    expect(samples).toEqual([
      {
        location: { lat: 1, lon: 1 },
        etaOffsetSeconds: 0,
        eta: departure,
        cumulativeDistanceMeters: 0,
        stepIndex: -1,
      },
    ]);
  });

  it("exposes an increasing stepIndex per sample, matching route.steps", () => {
    const route = fixtureRoute();
    const departure = new Date("2026-07-19T12:00:00Z");
    const samples = sampleRoute(route, departure, { maxSamples: 5 });

    expect(samples[0].stepIndex).toBe(-1);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i].stepIndex).toBeGreaterThan(samples[i - 1].stepIndex);
      expect(route.steps[samples[i].stepIndex].location).toEqual(samples[i].location);
    }
  });
});
