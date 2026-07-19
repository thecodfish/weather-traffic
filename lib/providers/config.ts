import { OsrmRoutingProvider } from "./routing/osrm";
import { OpenMeteoWeatherProvider } from "./weather/openMeteo";
import { NominatimGeocodingProvider } from "./geocoding/nominatim";
import { GoogleMapsUrlProvider } from "./mapsLink/googleMapsUrl";
import type { GeocodingProvider, MapsLinkProvider, RoutingProvider, WeatherProvider } from "./types";

/**
 * Single swap point for external providers. To switch e.g. routing from OSRM to
 * OpenRouteService, implement RoutingProvider in ./routing/ors.ts and change the
 * instantiation below — no other file needs to change.
 */
export const routingProvider: RoutingProvider = new OsrmRoutingProvider();
export const weatherProvider: WeatherProvider = new OpenMeteoWeatherProvider();
export const geocodingProvider: GeocodingProvider = new NominatimGeocodingProvider();

/**
 * Parses pasted Google Maps route links. GoogleMapsUrlProvider follows the
 * link's redirect chain and scrapes Google's unofficial URL scheme — free but
 * fragile. To swap in the official Google Places/Directions API (needs an API
 * key, but more robust for links that only carry an opaque place ID), add a
 * GooglePlacesApiProvider implementing MapsLinkProvider in ./mapsLink/ and
 * change the instantiation below.
 */
export const mapsLinkProvider: MapsLinkProvider = new GoogleMapsUrlProvider(geocodingProvider);
