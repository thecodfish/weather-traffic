import { describe, expect, it } from "vitest";
import { sampleRoute } from "./sampleRoute";
import type { NormalizedRoute } from "./providers/types";

/** A synthetic 60-minute route with no network calls, one step per minute so
 * 15-minute-interval targets land exactly on a step boundary. */
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

describe("sampleRoute", () => {
  it("always includes origin and destination", () => {
    const departure = new Date("2026-07-19T12:00:00Z");
    const samples = sampleRoute(fixtureRoute(), departure, { intervalSeconds: 900, maxSamples: 10 });

    expect(samples[0].eta.getTime()).toBe(departure.getTime());
    expect(samples[0].etaOffsetSeconds).toBe(0);

    const last = samples[samples.length - 1];
    expect(last.etaOffsetSeconds).toBe(3600);
    expect(last.eta.getTime()).toBe(departure.getTime() + 3600 * 1000);
  });

  it("respects the requested interval when under the sample cap", () => {
    const departure = new Date("2026-07-19T12:00:00Z");
    const samples = sampleRoute(fixtureRoute(), departure, { intervalSeconds: 900, maxSamples: 10 });

    // 3600s route at 900s (15min) spacing -> targets at 0, 900, 1800, 2700, 3600 = 5 points
    expect(samples).toHaveLength(5);
    expect(samples.map((s) => s.etaOffsetSeconds)).toEqual([0, 900, 1800, 2700, 3600]);
  });

  it("caps the sample count and spreads evenly when the interval would exceed it", () => {
    const departure = new Date("2026-07-19T12:00:00Z");
    // A tiny interval would normally produce 60+ points; the cap should win.
    const samples = sampleRoute(fixtureRoute(), departure, { intervalSeconds: 60, maxSamples: 5 });

    expect(samples).toHaveLength(5);
    expect(samples[0].etaOffsetSeconds).toBe(0);
    expect(samples[samples.length - 1].etaOffsetSeconds).toBe(3600);
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
      { location: { lat: 1, lon: 1 }, etaOffsetSeconds: 0, eta: departure, cumulativeDistanceMeters: 0 },
    ]);
  });
});
