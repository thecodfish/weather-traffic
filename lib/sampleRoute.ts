import type { LatLon, NormalizedRoute } from "./providers/types";

export interface SampledPoint {
  location: LatLon;
  /** Seconds from departure until the driver reaches this point. */
  etaOffsetSeconds: number;
  eta: Date;
  cumulativeDistanceMeters: number;
}

export interface SampleRouteOptions {
  /** Target spacing between samples, in seconds of drive time. Default: 15 minutes. */
  intervalSeconds?: number;
  /** Hard cap on how many samples (including origin and destination) get produced,
   * so a long route doesn't fire a weather lookup per point. Default: 10. */
  maxSamples?: number;
}

const DEFAULT_INTERVAL_SECONDS = 15 * 60;
const DEFAULT_MAX_SAMPLES = 10;

/**
 * Picks evenly time-spaced points along a route (always including origin and
 * destination) and attaches each one's ETA given a departure time. Pure and
 * network-free so it's unit-testable against a fixture route.
 */
export function sampleRoute(
  route: NormalizedRoute,
  departureTime: Date,
  options: SampleRouteOptions = {},
): SampledPoint[] {
  const intervalSeconds = options.intervalSeconds ?? DEFAULT_INTERVAL_SECONDS;
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
      },
    ];
  }

  // Spread samples evenly if the requested interval would exceed the cap.
  const intervalCount = Math.floor(totalDuration / intervalSeconds) + 1;
  const effectiveInterval =
    intervalCount > maxSamples ? totalDuration / (maxSamples - 1) : intervalSeconds;

  const targets: number[] = [];
  for (let t = 0; t < totalDuration; t += effectiveInterval) {
    targets.push(t);
  }
  targets.push(totalDuration);

  return targets.map((targetSeconds) => {
    if (targetSeconds <= 0) {
      return {
        location: route.geometry[0],
        etaOffsetSeconds: 0,
        eta: departureTime,
        cumulativeDistanceMeters: 0,
      };
    }

    const step = findStepAtOrAfter(route.steps, targetSeconds);
    return {
      location: step.location,
      etaOffsetSeconds: step.cumulativeDurationSeconds,
      eta: new Date(departureTime.getTime() + step.cumulativeDurationSeconds * 1000),
      cumulativeDistanceMeters: cumulativeDistanceThrough(route.steps, step),
    };
  });
}

/** Binary search for the first step whose cumulative duration reaches targetSeconds. */
function findStepAtOrAfter(
  steps: NormalizedRoute["steps"],
  targetSeconds: number,
): NormalizedRoute["steps"][number] {
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
  return steps[lo];
}

function cumulativeDistanceThrough(
  steps: NormalizedRoute["steps"],
  target: NormalizedRoute["steps"][number],
): number {
  let total = 0;
  for (const step of steps) {
    total += step.distanceMeters;
    if (step === target) break;
  }
  return total;
}
