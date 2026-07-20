import type { LatLon, NormalizedRoute } from "./providers/types";
import type { WeatherLeg } from "./groupIntoLegs";
import { WEATHER_CATEGORY_HEX_COLORS } from "./weatherCodes";
import { blendHexColors } from "./color";

export interface LegPolylineSegment {
  positions: LatLon[];
  color: string;
}

/**
 * Slices the route's road-following geometry into one polyline segment per
 * weather leg, using each leg's boundary stepIndex (see sampleRoute.ts) to
 * find where in route.steps that leg starts/ends.
 *
 * A leg with only one sample has no two points of its own to draw a line
 * between, so it'd otherwise disappear except for its map marker. Instead it
 * borrows the geometry point just before it (from the previous leg's stretch
 * of road) and gets a color blended with the previous leg's, so it still
 * reads as a short, visible transition rather than a gap.
 */
export function buildLegPolylineSegments(route: NormalizedRoute, legs: WeatherLeg[]): LegPolylineSegment[] {
  return legs.map((leg, i) => {
    const startIndex = leg.startStop.stepIndex;
    const endIndex = leg.endStop.stepIndex;
    const positions: LatLon[] = [startIndex === -1 ? route.geometry[0] : route.steps[startIndex].location];

    const loopStart = startIndex === -1 ? 0 : startIndex + 1;
    for (let j = loopStart; j <= endIndex; j++) {
      positions.push(route.steps[j].location);
    }

    const ownColor = WEATHER_CATEGORY_HEX_COLORS[leg.category];

    if (positions.length < 2) {
      if (startIndex > 0) {
        positions.unshift(route.steps[startIndex - 1].location);
      } else if (startIndex === 0) {
        positions.unshift(route.geometry[0]);
      }
      const previousLeg = legs[i - 1];
      const color = previousLeg
        ? blendHexColors(ownColor, WEATHER_CATEGORY_HEX_COLORS[previousLeg.category])
        : ownColor;
      return { positions, color };
    }

    return { positions, color: ownColor };
  });
}
