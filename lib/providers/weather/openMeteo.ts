import type { LatLon, NormalizedWeather, WeatherProvider } from "../types";

const OPEN_METEO_BASE_URL = process.env.OPEN_METEO_BASE_URL ?? "https://api.open-meteo.com";

interface OpenMeteoResponse {
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation: number[];
    weather_code: number[];
    wind_speed_10m: number[];
  };
}

/** Open-Meteo forecast is free/keyless for non-commercial use and covers up to 16 days out. */
export class OpenMeteoWeatherProvider implements WeatherProvider {
  async getForecastAt(location: LatLon, targetTime: Date): Promise<NormalizedWeather> {
    const forecastDays = daysAheadInclusive(targetTime);
    if (forecastDays > 16) {
      throw new Error("Open-Meteo only forecasts up to 16 days ahead");
    }

    const url = new URL("/v1/forecast", OPEN_METEO_BASE_URL);
    url.searchParams.set("latitude", location.lat.toString());
    url.searchParams.set("longitude", location.lon.toString());
    url.searchParams.set(
      "hourly",
      "temperature_2m,precipitation,weather_code,wind_speed_10m",
    );
    url.searchParams.set("timezone", "UTC");
    url.searchParams.set("forecast_days", forecastDays.toString());

    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      throw new Error(`Open-Meteo request failed with status ${res.status}`);
    }

    const data = (await res.json()) as OpenMeteoResponse;
    const index = closestHourIndex(data.hourly.time, targetTime);
    if (index === -1) {
      throw new Error("Open-Meteo returned no hourly data covering the target time");
    }

    return {
      time: data.hourly.time[index],
      temperatureC: data.hourly.temperature_2m[index],
      precipitationMm: data.hourly.precipitation[index],
      weatherCode: data.hourly.weather_code[index],
      windSpeedKmh: data.hourly.wind_speed_10m[index],
    };
  }
}

function daysAheadInclusive(targetTime: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.ceil((targetTime.getTime() - Date.now()) / msPerDay);
  return Math.max(1, days + 1);
}

function closestHourIndex(times: string[], targetTime: Date): number {
  let bestIndex = -1;
  let bestDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    // Open-Meteo returns naive local timestamps; timezone=UTC makes them UTC.
    const diff = Math.abs(new Date(`${times[i]}Z`).getTime() - targetTime.getTime());
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = i;
    }
  }
  return bestIndex;
}
