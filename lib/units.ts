export type TemperatureUnit = "C" | "F";

export function convertTemperature(celsius: number, unit: TemperatureUnit): number {
  return unit === "F" ? celsius * (9 / 5) + 32 : celsius;
}

export function formatTemperature(celsius: number, unit: TemperatureUnit): string {
  return `${Math.round(convertTemperature(celsius, unit))}°${unit}`;
}

/** Formats a temperature range, collapsing to a single value if they round to the same degree. */
export function formatTemperatureRange(minCelsius: number, maxCelsius: number, unit: TemperatureUnit): string {
  const min = Math.round(convertTemperature(minCelsius, unit));
  const max = Math.round(convertTemperature(maxCelsius, unit));
  return min === max ? `${min}°${unit}` : `${min}–${max}°${unit}`;
}
