import type { GeocodeResult, GeocodingProvider } from "../types";

const NOMINATIM_BASE_URL = process.env.NOMINATIM_BASE_URL ?? "https://nominatim.openstreetmap.org";

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

/**
 * Nominatim's usage policy requires a descriptive User-Agent and forbids unattributed
 * client-side use, so this must be called from our server (never directly from the browser).
 * https://operations.osmfoundation.org/policies/nominatim/
 */
export class NominatimGeocodingProvider implements GeocodingProvider {
  async search(query: string): Promise<GeocodeResult[]> {
    const url = new URL("/search", NOMINATIM_BASE_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "5");

    const res = await fetch(url, {
      headers: { "User-Agent": "route-weather-arrival-poc (https://github.com/thecodfish/weather-traffic)" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      throw new Error(`Nominatim request failed with status ${res.status}`);
    }

    const data = (await res.json()) as NominatimResult[];
    return data.map((result) => ({
      label: result.display_name,
      location: { lat: parseFloat(result.lat), lon: parseFloat(result.lon) },
    }));
  }
}
