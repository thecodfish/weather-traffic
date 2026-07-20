import type { StopWithWeather } from "./sampleRoute";
import { describeWeatherCode, type WeatherCategory } from "./weatherCodes";

export interface WeatherLeg {
  startStop: StopWithWeather;
  endStop: StopWithWeather;
  /** All stops making up this leg, in order. */
  stops: StopWithWeather[];
  category: WeatherCategory;
  label: string;
  minTemperatureC: number;
  maxTemperatureC: number;
  maxPrecipitationMm: number;
}

const BENIGN_CATEGORIES: ReadonlySet<WeatherCategory> = new Set(["clear", "cloudy"]);

/**
 * Groups consecutive resolved stops into "legs" of similar weather. clear/cloudy
 * flicker gets merged into one bucket — drivers don't care about that kind of
 * back-and-forth — but every other category (fog, drizzle, rain, snow,
 * thunderstorm) keeps its own strict boundary, since those transitions are
 * exactly what's worth calling out even if the stretch is brief.
 *
 * Stops with no resolved weather (still loading, or errored) break a leg
 * rather than being folded into one, since we don't know what they were.
 */
export function groupIntoLegs(stops: StopWithWeather[]): WeatherLeg[] {
  const legs: WeatherLeg[] = [];
  let currentStops: StopWithWeather[] = [];
  let currentKey: WeatherCategory | "benign" | null = null;

  for (const stop of stops) {
    if (!stop.weather) {
      if (currentStops.length > 0) legs.push(finalizeLeg(currentStops));
      currentStops = [];
      currentKey = null;
      continue;
    }

    const category = describeWeatherCode(stop.weather.weatherCode).category;
    const key = BENIGN_CATEGORIES.has(category) ? "benign" : category;

    if (currentKey !== null && key !== currentKey) {
      legs.push(finalizeLeg(currentStops));
      currentStops = [];
    }
    currentStops.push(stop);
    currentKey = key;
  }

  if (currentStops.length > 0) legs.push(finalizeLeg(currentStops));

  return legs;
}

function finalizeLeg(stops: StopWithWeather[]): WeatherLeg {
  const categoryCounts = new Map<WeatherCategory, number>();
  const labelCounts = new Map<string, number>();
  let minTemperatureC = Infinity;
  let maxTemperatureC = -Infinity;
  let maxPrecipitationMm = 0;

  for (const stop of stops) {
    if (!stop.weather) continue;
    const info = describeWeatherCode(stop.weather.weatherCode);
    categoryCounts.set(info.category, (categoryCounts.get(info.category) ?? 0) + 1);
    labelCounts.set(info.label, (labelCounts.get(info.label) ?? 0) + 1);
    minTemperatureC = Math.min(minTemperatureC, stop.weather.temperatureC);
    maxTemperatureC = Math.max(maxTemperatureC, stop.weather.temperatureC);
    maxPrecipitationMm = Math.max(maxPrecipitationMm, stop.weather.precipitationMm);
  }

  return {
    startStop: stops[0],
    endStop: stops[stops.length - 1],
    stops,
    category: mode(categoryCounts),
    label: mode(labelCounts),
    minTemperatureC,
    maxTemperatureC,
    maxPrecipitationMm,
  };
}

function mode<T>(counts: Map<T, number>): T {
  let best: T | undefined;
  let bestCount = -1;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best as T;
}
