export interface LatLon {
  lat: number;
  lon: number;
}

export interface RouteStep {
  distanceMeters: number;
  durationSeconds: number;
  /** Cumulative duration from the start of the route through the end of this step. */
  cumulativeDurationSeconds: number;
  location: LatLon;
}

export interface NormalizedRoute {
  distanceMeters: number;
  durationSeconds: number;
  /** Full route path for drawing on the map, in order. */
  geometry: LatLon[];
  /** Flattened steps across all legs, in order, each carrying cumulative duration. */
  steps: RouteStep[];
}

export interface RoutingProvider {
  getRoute(origin: LatLon, destination: LatLon): Promise<NormalizedRoute>;
}

export interface NormalizedWeather {
  time: string;
  temperatureC: number;
  precipitationMm: number;
  weatherCode: number;
  windSpeedKmh: number;
}

export interface WeatherProvider {
  getForecastAt(location: LatLon, targetTime: Date): Promise<NormalizedWeather>;
}

export interface GeocodeResult {
  label: string;
  location: LatLon;
}

export interface GeocodingProvider {
  search(query: string): Promise<GeocodeResult[]>;
}
