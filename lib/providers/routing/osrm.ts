import type { LatLon, NormalizedRoute, RoutingProvider } from "../types";

const OSRM_BASE_URL = process.env.OSRM_BASE_URL ?? "https://router.project-osrm.org";

interface OsrmRoute {
  distance: number;
  duration: number;
  geometry: { coordinates: [number, number][] };
  legs: {
    annotation: {
      distance: number[];
      duration: number[];
    };
  }[];
}

interface OsrmResponse {
  code: string;
  message?: string;
  routes: OsrmRoute[];
}

/**
 * Routes via OSRM's HTTP API. Uses per-segment `annotations=duration,distance`
 * (one value per pair of consecutive geometry coordinates) rather than turn-by-turn
 * steps, so sampling isn't limited by how coarse OSRM's maneuver steps are — a long
 * straight highway stretch is still broken into many timed segments.
 */
export class OsrmRoutingProvider implements RoutingProvider {
  async getRoute(origin: LatLon, destination: LatLon): Promise<NormalizedRoute> {
    const coords = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
    const url = new URL(`/route/v1/driving/${coords}`, OSRM_BASE_URL);
    url.searchParams.set("overview", "full");
    url.searchParams.set("geometries", "geojson");
    url.searchParams.set("annotations", "duration,distance");

    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      throw new Error(`OSRM request failed with status ${res.status}`);
    }

    const data = (await res.json()) as OsrmResponse;
    if (data.code !== "Ok" || data.routes.length === 0) {
      throw new Error(data.message ?? `OSRM could not find a route (code: ${data.code})`);
    }

    const route = data.routes[0];
    const geometry: LatLon[] = route.geometry.coordinates.map(([lon, lat]) => ({ lat, lon }));

    const steps: NormalizedRoute["steps"] = [];
    let cumulativeDurationSeconds = 0;
    for (const leg of route.legs) {
      const { distance, duration } = leg.annotation;
      for (let i = 0; i < duration.length; i++) {
        cumulativeDurationSeconds += duration[i];
        steps.push({
          distanceMeters: distance[i],
          durationSeconds: duration[i],
          cumulativeDurationSeconds,
          // annotation[i] describes the segment ending at coordinate i + 1
          location: geometry[steps.length + 1],
        });
      }
    }

    return {
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      geometry,
      steps,
    };
  }
}
