"use client";

import type { StopWithWeather } from "./types";
import { describeWeatherCode, WEATHER_CATEGORY_STYLES } from "@/lib/weatherCodes";
import { formatTemperature, type TemperatureUnit } from "@/lib/units";

interface WeatherStopListProps {
  stops: StopWithWeather[];
  unit: TemperatureUnit;
}

export function WeatherStopList({ stops, unit }: WeatherStopListProps) {
  if (stops.length === 0) return null;

  return (
    <ol className="flex flex-col gap-2">
      {stops.map((stop, i) => {
        const isFirst = i === 0;
        const isLast = i === stops.length - 1;
        const info = stop.weather ? describeWeatherCode(stop.weather.weatherCode) : null;

        return (
          <li
            key={i}
            className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm text-slate-900 ${
              info ? WEATHER_CATEGORY_STYLES[info.category] : "border-slate-200 bg-white"
            }`}
          >
            <div>
              <div className="font-medium">
                {isFirst ? "Departure" : isLast ? "Arrival" : `Stop ${i}`}
              </div>
              <div className="text-xs opacity-80">
                {stop.eta.toLocaleString(undefined, {
                  weekday: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {" · "}
                {(stop.cumulativeDistanceMeters / 1609.34).toFixed(1)} mi in
              </div>
            </div>
            <div className="text-right">
              {stop.weather ? (
                <>
                  <div className="font-semibold">{formatTemperature(stop.weather.temperatureC, unit)}</div>
                  <div className="text-xs">{info?.label}</div>
                </>
              ) : stop.weatherError ? (
                <div className="text-xs text-red-600">Weather unavailable</div>
              ) : (
                <div className="text-xs opacity-70">Loading…</div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
