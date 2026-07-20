"use client";

import type { WeatherLeg } from "@/lib/groupIntoLegs";
import { WEATHER_CATEGORY_STYLES } from "@/lib/weatherCodes";
import { formatTemperatureRange, type TemperatureUnit } from "@/lib/units";
import { formatEtaTime, formatMiles } from "@/lib/format";

interface WeatherLegListProps {
  legs: WeatherLeg[];
  unit: TemperatureUnit;
}

export function WeatherLegList({ legs, unit }: WeatherLegListProps) {
  if (legs.length === 0) return null;

  return (
    <ol className="flex flex-col gap-2">
      {legs.map((leg, i) => (
        <li
          key={i}
          className={`rounded-md border px-3 py-2 text-sm text-slate-900 ${WEATHER_CATEGORY_STYLES[leg.category]}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium">{leg.label}</div>
              <div className="text-xs opacity-80">
                Mi {formatMiles(leg.startStop.cumulativeDistanceMeters)}–
                {formatMiles(leg.endStop.cumulativeDistanceMeters)} &middot; {formatEtaTime(leg.startStop.eta)}–
                {formatEtaTime(leg.endStop.eta)}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">
                {formatTemperatureRange(leg.minTemperatureC, leg.maxTemperatureC, unit)}
              </div>
              {leg.maxPrecipitationMm > 0 && (
                <div className="text-xs">up to {leg.maxPrecipitationMm.toFixed(1)} mm</div>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
