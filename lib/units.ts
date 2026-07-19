export type TemperatureUnit = "C" | "F";

export function formatTemperature(celsius: number, unit: TemperatureUnit): string {
  const value = unit === "F" ? celsius * (9 / 5) + 32 : celsius;
  return `${Math.round(value)}°${unit}`;
}
