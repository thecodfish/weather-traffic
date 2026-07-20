export type WeatherCategory =
  | "clear"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "thunderstorm";

interface WeatherCodeInfo {
  label: string;
  category: WeatherCategory;
}

/** WMO weather interpretation codes, as used by Open-Meteo's weather_code field. */
const WEATHER_CODES: Record<number, WeatherCodeInfo> = {
  0: { label: "Clear sky", category: "clear" },
  1: { label: "Mainly clear", category: "clear" },
  2: { label: "Partly cloudy", category: "cloudy" },
  3: { label: "Overcast", category: "cloudy" },
  45: { label: "Fog", category: "fog" },
  48: { label: "Depositing rime fog", category: "fog" },
  51: { label: "Light drizzle", category: "drizzle" },
  53: { label: "Moderate drizzle", category: "drizzle" },
  55: { label: "Dense drizzle", category: "drizzle" },
  56: { label: "Light freezing drizzle", category: "drizzle" },
  57: { label: "Dense freezing drizzle", category: "drizzle" },
  61: { label: "Slight rain", category: "rain" },
  63: { label: "Moderate rain", category: "rain" },
  65: { label: "Heavy rain", category: "rain" },
  66: { label: "Light freezing rain", category: "rain" },
  67: { label: "Heavy freezing rain", category: "rain" },
  71: { label: "Slight snow fall", category: "snow" },
  73: { label: "Moderate snow fall", category: "snow" },
  75: { label: "Heavy snow fall", category: "snow" },
  77: { label: "Snow grains", category: "snow" },
  80: { label: "Slight rain showers", category: "rain" },
  81: { label: "Moderate rain showers", category: "rain" },
  82: { label: "Violent rain showers", category: "rain" },
  85: { label: "Slight snow showers", category: "snow" },
  86: { label: "Heavy snow showers", category: "snow" },
  95: { label: "Thunderstorm", category: "thunderstorm" },
  96: { label: "Thunderstorm with slight hail", category: "thunderstorm" },
  99: { label: "Thunderstorm with heavy hail", category: "thunderstorm" },
};

export function describeWeatherCode(code: number): WeatherCodeInfo {
  return WEATHER_CODES[code] ?? { label: "Unknown", category: "cloudy" };
}

export const WEATHER_CATEGORY_STYLES: Record<WeatherCategory, string> = {
  clear: "bg-amber-100 text-amber-900 border-amber-300",
  cloudy: "bg-slate-100 text-slate-900 border-slate-300",
  fog: "bg-zinc-200 text-zinc-900 border-zinc-400",
  drizzle: "bg-sky-100 text-sky-900 border-sky-300",
  rain: "bg-blue-100 text-blue-900 border-blue-300",
  snow: "bg-indigo-50 text-indigo-900 border-indigo-300",
  thunderstorm: "bg-purple-100 text-purple-900 border-purple-300",
};

/** Hex colors used for map markers/polylines — one per category, for the map's own dark-on-tile rendering. */
export const WEATHER_CATEGORY_HEX_COLORS: Record<WeatherCategory, string> = {
  clear: "#f59e0b",
  cloudy: "#64748b",
  fog: "#71717a",
  drizzle: "#0ea5e9",
  rain: "#2563eb",
  snow: "#6366f1",
  thunderstorm: "#9333ea",
};
