import type { LatLon, NormalizedRoute } from "./providers/types";
import type { WeatherLeg } from "./groupIntoLegs";
import type { WeatherCategory } from "./weatherCodes";

export interface LegPolylineSegment {
  category: WeatherCategory;
  positions: LatLon[];
}

/**
 * Slices the route's road-following geometry into one polyline segment per
 * weather leg, using each leg's boundary stepIndex (see sampleRoute.ts) to
 * find where in route.steps that leg starts/ends.
 */
export function buildLegPolylineSegments(route: NormalizedRoute, legs: WeatherLeg[]): LegPolylineSegment[] {
  return legs.map((leg) => {
    const startIndex = leg.startStop.stepIndex;
    const endIndex = leg.endStop.stepIndex;
    const positions: LatLon[] = [startIndex === -1 ? route.geometry[0] : route.steps[startIndex].location];

    const loopStart = startIndex === -1 ? 0 : startIndex + 1;
    for (let i = loopStart; i <= endIndex; i++) {
      positions.push(route.steps[i].location);
    }

    return { category: leg.category, positions };
  });
}
