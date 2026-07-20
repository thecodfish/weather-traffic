import type { LatLon, NormalizedRoute, NormalizedWeather } from "./providers/types";

export interface SampledPoint {
  location: LatLon;
  /** Seconds from departure until the driver reaches this point. */
  etaOffsetSeconds: number;
  eta: Date;
  cumulativeDistanceMeters: number;
  /** Index into route.steps this sample resolved to, or -1 for the route's origin point. */
  stepIndex: number;
}

export interface StopWithWeather extends SampledPoint {
  weather?: NormalizedWeather;
  weatherError?: string;
}

export interface SampleRouteOptions {
  /** How many points to produce along the route, including origin and destination. Default: 20. */
  maxSamples?: number;
}

const DEFAULT_MAX_SAMPLES = 20;

/**
 * Picks `maxSamples` evenly time-spaced points along a route (always including
 * origin and destination) and attaches each one's ETA given a departure time.
 * Pure and network-free so it's unit-testable against a fixture route.
 */
export function sampleRoute(
  route: NormalizedRoute,
  departureTime: Date,
  options: SampleRouteOptions = {},
): SampledPoint[] {
  const maxSamples = options.maxSamples ?? DEFAULT_MAX_SAMPLES;
  const totalDuration = route.durationSeconds;

  if (route.geometry.length === 0) {
    return [];
  }

  if (totalDuration <= 0 || route.steps.length === 0) {
    return [
      {
        location: route.geometry[0],
        etaOffsetSeconds: 0,
        eta: departureTime,
        cumulativeDistanceMeters: 0,
        stepIndex: -1,
      },
    ];
  }

  // Index-based math (rather than repeated addition) keeps the count exact
  // regardless of floating-point drift, and guarantees the first/last targets
  // land on exactly 0 and totalDuration.
  const count = Math.max(2, maxSamples);
  const targets = Array.from({ length: count }, (_, i) => (i * totalDuration) / (count - 1));

  return targets.map((targetSeconds) => {
    if (targetSeconds <= 0) {
      return {
        location: route.geometry[0],
        etaOffsetSeconds: 0,
        eta: departureTime,
        cumulativeDistanceMeters: 0,
        stepIndex: -1,
      };
    }

    const stepIndex = findStepIndexAtOrAfter(route.steps, targetSeconds);
    const step = route.steps[stepIndex];
    return {
      location: step.location,
      etaOffsetSeconds: step.cumulativeDurationSeconds,
      eta: new Date(departureTime.getTime() + step.cumulativeDurationSeconds * 1000),
      cumulativeDistanceMeters: cumulativeDistanceThrough(route.steps, stepIndex),
      stepIndex,
    };
  });
}

/** Binary search for the index of the first step whose cumulative duration reaches targetSeconds. */
function findStepIndexAtOrAfter(steps: NormalizedRoute["steps"], targetSeconds: number): number {
  let lo = 0;
  let hi = steps.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (steps[mid].cumulativeDurationSeconds >= targetSeconds) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  return lo;
}

function cumulativeDistanceThrough(steps: NormalizedRoute["steps"], targetIndex: number): number {
  let total = 0;
  for (let i = 0; i <= targetIndex; i++) {
    total += steps[i].distanceMeters;
  }
  return total;
}
