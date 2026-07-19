import { OsrmRoutingProvider } from "./routing/osrm";
import { OpenMeteoWeatherProvider } from "./weather/openMeteo";
import { NominatimGeocodingProvider } from "./geocoding/nominatim";
import type { GeocodingProvider, RoutingProvider, WeatherProvider } from "./types";

/**
 * Single swap point for external providers. To switch e.g. routing from OSRM to
 * OpenRouteService, implement RoutingProvider in ./routing/ors.ts and change the
 * instantiation below — no other file needs to change.
 */
export const routingProvider: RoutingProvider = new OsrmRoutingProvider();
export const weatherProvider: WeatherProvider = new OpenMeteoWeatherProvider();
export const geocodingProvider: GeocodingProvider = new NominatimGeocodingProvider();
