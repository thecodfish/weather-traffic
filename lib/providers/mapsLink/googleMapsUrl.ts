import type { GeocodingProvider, LatLon, MapsLinkProvider, ParsedRouteLink } from "../types";

/**
 * Hosts we'll actually fetch. Both the pasted URL and the fully-redirected URL
 * must match this list — the endpoint accepts an arbitrary user-supplied URL
 * and fetches it server-side, so an open allowlist would be an SSRF vector.
 */
const ALLOWED_HOSTS = new Set([
  "maps.app.goo.gl",
  "goo.gl",
  "google.com",
  "www.google.com",
  "maps.google.com",
]);

const COORDINATE_PATTERN = /^-?\d{1,3}(?:\.\d+)?\s*,\s*-?\d{1,3}(?:\.\d+)?$/;

function assertAllowedHost(url: URL) {
  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) {
    throw new Error(`Refusing to fetch non-Google-Maps URL: ${url.hostname}`);
  }
}

function parseWaypoint(raw: string): LatLon | null {
  const trimmed = raw.trim();
  if (!COORDINATE_PATTERN.test(trimmed)) return null;
  const [lat, lon] = trimmed.split(",").map((part) => parseFloat(part.trim()));
  return { lat, lon };
}

/** Pulls the two directions waypoints (as coordinate strings or place labels) out of a resolved Google Maps URL. */
function extractWaypointLabels(resolvedUrl: URL): [string, string] {
  // Legacy share-link format: ?saddr=...&daddr=...
  const saddr = resolvedUrl.searchParams.get("saddr");
  const daddr = resolvedUrl.searchParams.get("daddr");
  if (saddr && daddr) {
    return [saddr, daddr];
  }

  // Modern format: /maps/dir/<origin>/<destination>/.../@lat,lng,zoom/...
  const segments = resolvedUrl.pathname.split("/").filter(Boolean);
  const dirIndex = segments.indexOf("dir");
  if (dirIndex !== -1) {
    const waypoints = segments
      .slice(dirIndex + 1)
      .filter((segment) => !segment.startsWith("@") && !segment.startsWith("data="))
      .map((segment) => decodeURIComponent(segment).replace(/\+/g, " "));
    if (waypoints.length >= 2) {
      return [waypoints[0], waypoints[waypoints.length - 1]];
    }
  }

  throw new Error("Couldn't find a start and end point in that link — is it a Google Maps directions link?");
}

/**
 * Resolves a shared Google Maps directions link by following its redirect
 * chain server-side and parsing the resulting URL. This depends on Google's
 * unofficial/undocumented URL scheme rather than a stable API contract, so it
 * can break if that scheme changes. A future GooglePlacesApiProvider (using
 * the official Places/Directions API with a key) can implement the same
 * MapsLinkProvider interface as a drop-in replacement — see config.ts.
 */
export class GoogleMapsUrlProvider implements MapsLinkProvider {
  constructor(private readonly geocodingProvider: GeocodingProvider) {}

  async parseRouteLink(url: string): Promise<ParsedRouteLink> {
    let inputUrl: URL;
    try {
      inputUrl = new URL(url);
    } catch {
      throw new Error("That doesn't look like a valid URL");
    }
    assertAllowedHost(inputUrl);

    const res = await fetch(inputUrl, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      throw new Error(`Google Maps link resolution failed with status ${res.status}`);
    }

    const resolvedUrl = new URL(res.url);
    assertAllowedHost(resolvedUrl);

    const [originRaw, destinationRaw] = extractWaypointLabels(resolvedUrl);

    const [origin, destination] = await Promise.all([
      this.resolveWaypoint(originRaw),
      this.resolveWaypoint(destinationRaw),
    ]);

    return {
      origin: origin.location,
      originLabel: origin.label,
      destination: destination.location,
      destinationLabel: destination.label,
    };
  }

  private async resolveWaypoint(raw: string): Promise<{ location: LatLon; label: string }> {
    const coordinate = parseWaypoint(raw);
    if (coordinate) {
      return { location: coordinate, label: raw.trim() };
    }

    const results = await this.geocodingProvider.search(raw);
    if (results.length === 0) {
      throw new Error(`Couldn't locate "${raw}" from the map link`);
    }
    return { location: results[0].location, label: results[0].label };
  }
}
