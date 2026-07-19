import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleMapsUrlProvider } from "./googleMapsUrl";
import type { GeocodeResult, GeocodingProvider } from "../types";

function fakeGeocoder(results: GeocodeResult[]): GeocodingProvider {
  return { search: vi.fn().mockResolvedValue(results) };
}

function mockFetchResolvingTo(finalUrl: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, url: finalUrl } as Response),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GoogleMapsUrlProvider", () => {
  it("parses coordinates directly from the legacy saddr/daddr format", async () => {
    mockFetchResolvingTo(
      "https://www.google.com/maps?saddr=41.9891796,-87.6727476&daddr=42.0764445,-86.4226665",
    );
    const provider = new GoogleMapsUrlProvider(fakeGeocoder([]));

    const result = await provider.parseRouteLink("https://maps.app.goo.gl/abc123");

    expect(result.origin).toEqual({ lat: 41.9891796, lon: -87.6727476 });
    expect(result.destination).toEqual({ lat: 42.0764445, lon: -86.4226665 });
  });

  it("geocodes a non-coordinate daddr via the injected GeocodingProvider", async () => {
    mockFetchResolvingTo(
      "https://www.google.com/maps?saddr=41.9891796,-87.6727476&daddr=Celebration!+Cinema,+Benton+Harbor,+MI",
    );
    const geocoder = fakeGeocoder([
      { label: "Celebration! Cinema Benton Harbor, MI", location: { lat: 42.0764445, lon: -86.4226665 } },
    ]);
    const provider = new GoogleMapsUrlProvider(geocoder);

    const result = await provider.parseRouteLink("https://maps.app.goo.gl/abc123");

    expect(geocoder.search).toHaveBeenCalledWith("Celebration! Cinema, Benton Harbor, MI");
    expect(result.destination).toEqual({ lat: 42.0764445, lon: -86.4226665 });
    expect(result.destinationLabel).toBe("Celebration! Cinema Benton Harbor, MI");
  });

  it("parses the modern /maps/dir/<origin>/<destination>/@.../ path format", async () => {
    mockFetchResolvingTo("https://www.google.com/maps/dir/San+Francisco,+CA/Sacramento,+CA/@38.5,-121.9,8z");
    const geocoder = fakeGeocoder([{ label: "San Francisco, CA", location: { lat: 37.77, lon: -122.42 } }]);
    const provider = new GoogleMapsUrlProvider(geocoder);

    await provider.parseRouteLink("https://www.google.com/maps/dir/San+Francisco,+CA/Sacramento,+CA/@38.5,-121.9,8z");

    expect(geocoder.search).toHaveBeenCalledWith("San Francisco, CA");
    expect(geocoder.search).toHaveBeenCalledWith("Sacramento, CA");
  });

  it("uses the first and last waypoints for a multi-stop route", async () => {
    mockFetchResolvingTo("https://www.google.com/maps/dir/A/B/C/@38.5,-121.9,8z");
    const geocoder = fakeGeocoder([{ label: "resolved", location: { lat: 1, lon: 2 } }]);
    const provider = new GoogleMapsUrlProvider(geocoder);

    await provider.parseRouteLink("https://www.google.com/maps/dir/A/B/C/@38.5,-121.9,8z");

    expect(geocoder.search).toHaveBeenCalledWith("A");
    expect(geocoder.search).toHaveBeenCalledWith("C");
    expect(geocoder.search).not.toHaveBeenCalledWith("B");
  });

  it("rejects a non-Google-Maps input URL without fetching", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const provider = new GoogleMapsUrlProvider(fakeGeocoder([]));

    await expect(provider.parseRouteLink("https://example.com/evil")).rejects.toThrow(
      /non-Google-Maps/,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a metadata/internal-IP URL without fetching", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const provider = new GoogleMapsUrlProvider(fakeGeocoder([]));

    await expect(
      provider.parseRouteLink("http://169.254.169.254/latest/meta-data/"),
    ).rejects.toThrow(/non-Google-Maps/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects if the redirect chain resolves off Google's domains", async () => {
    mockFetchResolvingTo("https://attacker.example.com/steal?saddr=1,2&daddr=3,4");
    const provider = new GoogleMapsUrlProvider(fakeGeocoder([]));

    await expect(provider.parseRouteLink("https://maps.app.goo.gl/abc123")).rejects.toThrow(
      /non-Google-Maps/,
    );
  });

  it("throws a clear error when the resolved URL has no recognizable route", async () => {
    mockFetchResolvingTo("https://www.google.com/maps/@38.5,-121.9,8z");
    const provider = new GoogleMapsUrlProvider(fakeGeocoder([]));

    await expect(provider.parseRouteLink("https://maps.app.goo.gl/abc123")).rejects.toThrow(
      /Couldn't find a start and end point/,
    );
  });

  it("throws when geocoding a place label finds no results", async () => {
    mockFetchResolvingTo("https://www.google.com/maps?saddr=1,2&daddr=Nowhere+Special");
    const provider = new GoogleMapsUrlProvider(fakeGeocoder([]));

    await expect(provider.parseRouteLink("https://maps.app.goo.gl/abc123")).rejects.toThrow(
      /Couldn't locate/,
    );
  });
});
