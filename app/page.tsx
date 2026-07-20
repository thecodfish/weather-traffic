"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { MapsLinkInput } from "@/components/MapsLinkInput";
import { WeatherStopList } from "@/components/WeatherStopList";
import type { StopWithWeather } from "@/components/types";
import { mapWithConcurrency } from "@/lib/mapWithConcurrency";
import { sampleRoute, type SampledPoint } from "@/lib/sampleRoute";
import type { GeocodeResult, LatLon, NormalizedRoute, ParsedRouteLink } from "@/lib/providers/types";
import type { TemperatureUnit } from "@/lib/units";

const MIN_STOPS = 2;
const MAX_STOPS = 50;
const DEFAULT_STOPS = 20;

// Cap how many weather lookups run at once, and retry a stop once before
// giving up — large stop counts shouldn't burst dozens of simultaneous
// requests at the weather API in one shot.
const WEATHER_CONCURRENCY = 6;
const WEATHER_RETRY_DELAY_MS = 500;

async function fetchWeatherForStop(stop: SampledPoint, attempt = 0): Promise<StopWithWeather> {
  try {
    const weatherRes = await fetch("/api/weather", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat: stop.location.lat,
        lon: stop.location.lon,
        targetTime: stop.eta.toISOString(),
      }),
    });
    const weatherBody = await weatherRes.json();
    if (!weatherRes.ok) throw new Error(weatherBody.error ?? "Weather lookup failed");
    return { ...stop, weather: weatherBody };
  } catch (err) {
    if (attempt < 1) {
      await new Promise((resolve) => setTimeout(resolve, WEATHER_RETRY_DELAY_MS));
      return fetchWeatherForStop(stop, attempt + 1);
    }
    return { ...stop, weatherError: err instanceof Error ? err.message : "Unknown error" };
  }
}

const MapView = dynamic(() => import("@/components/MapView").then((m) => m.MapView), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-slate-400">Loading map…</div>,
});

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export default function Home() {
  const [originQuery, setOriginQuery] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");
  const [origin, setOrigin] = useState<LatLon | null>(null);
  const [destination, setDestination] = useState<LatLon | null>(null);
  const [departureValue, setDepartureValue] = useState(() => toDatetimeLocalValue(new Date()));
  const [maxStops, setMaxStops] = useState(DEFAULT_STOPS);
  const [unit, setUnit] = useState<TemperatureUnit>("F");
  const [route, setRoute] = useState<NormalizedRoute | null>(null);
  const [stops, setStops] = useState<StopWithWeather[]>([]);
  const [isPlanning, setIsPlanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPlan = origin !== null && destination !== null && !isPlanning;

  function handleSelectOrigin(result: GeocodeResult) {
    setOrigin(result.location);
    setOriginQuery(result.label);
  }

  function handleSelectDestination(result: GeocodeResult) {
    setDestination(result.location);
    setDestinationQuery(result.label);
  }

  function handleMapsLinkResolved(result: ParsedRouteLink) {
    setOrigin(result.origin);
    setOriginQuery(result.originLabel);
    setDestination(result.destination);
    setDestinationQuery(result.destinationLabel);
  }

  function handleMapClick(location: LatLon) {
    if (!origin) {
      setOrigin(location);
      setOriginQuery(`${location.lat.toFixed(5)}, ${location.lon.toFixed(5)}`);
    } else if (!destination) {
      setDestination(location);
      setDestinationQuery(`${location.lat.toFixed(5)}, ${location.lon.toFixed(5)}`);
    }
  }

  function handleClear() {
    setOrigin(null);
    setDestination(null);
    setOriginQuery("");
    setDestinationQuery("");
    setRoute(null);
    setStops([]);
    setError(null);
  }

  async function handlePlanRoute() {
    if (!origin || !destination) return;
    setIsPlanning(true);
    setError(null);
    setRoute(null);
    setStops([]);

    try {
      const routeRes = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, destination }),
      });
      const routeBody = await routeRes.json();
      if (!routeRes.ok) throw new Error(routeBody.error ?? "Failed to compute route");

      const normalizedRoute = routeBody as NormalizedRoute;
      setRoute(normalizedRoute);

      const departureTime = new Date(departureValue);
      const sampled = sampleRoute(normalizedRoute, departureTime, { maxSamples: maxStops });
      setStops(sampled);

      const withWeather = await mapWithConcurrency(sampled, WEATHER_CONCURRENCY, fetchWeatherForStop);
      setStops(withWeather);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsPlanning(false);
    }
  }

  const routeGeometry = useMemo(() => route?.geometry ?? [], [route]);

  return (
    <div className="flex flex-col gap-4 p-4 lg:h-screen lg:flex-row lg:overflow-hidden">
      <aside className="flex w-full flex-col gap-4 lg:w-96 lg:overflow-y-auto lg:pr-2">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Route Weather Arrival</h1>
          <p className="mt-1 text-sm text-slate-500">
            Plot a drive and see the forecast weather for when you&apos;ll actually reach each point.
          </p>
        </div>

        <AddressAutocomplete
          label="Origin"
          placeholder="Search an address, or click the map"
          value={originQuery}
          onChange={setOriginQuery}
          onSelect={handleSelectOrigin}
          selectedLocation={origin}
        />
        <AddressAutocomplete
          label="Destination"
          placeholder="Search an address, or click the map"
          value={destinationQuery}
          onChange={setDestinationQuery}
          onSelect={handleSelectDestination}
          selectedLocation={destination}
        />

        <MapsLinkInput onResolved={handleMapsLinkResolved} />

        <div>
          <label className="block text-sm font-medium text-slate-700">Departure time</label>
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
            value={departureValue}
            onChange={(e) => setDepartureValue(e.target.value)}
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700">
              Number of stops ({MIN_STOPS}–{MAX_STOPS})
            </label>
            <input
              type="number"
              min={MIN_STOPS}
              max={MAX_STOPS}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              value={maxStops}
              onChange={(e) => {
                const parsed = parseInt(e.target.value, 10);
                if (Number.isNaN(parsed)) return;
                setMaxStops(Math.min(MAX_STOPS, Math.max(MIN_STOPS, parsed)));
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Units</label>
            <div className="mt-1 flex overflow-hidden rounded-md border border-slate-300">
              {(["F", "C"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setUnit(option)}
                  className={`px-3 py-2 text-sm font-medium ${
                    unit === option ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  °{option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePlanRoute}
            disabled={!canPlan}
            className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isPlanning ? "Planning…" : "Plan route"}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Clear
          </button>
        </div>

        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {route && (
          <div className="text-sm text-slate-600">
            {(route.distanceMeters / 1609.34).toFixed(1)} mi &middot;{" "}
            {Math.round(route.durationSeconds / 60)} min drive
          </div>
        )}

        <WeatherStopList stops={stops} unit={unit} />
      </aside>

      <main className="h-96 overflow-hidden rounded-lg border border-slate-200 lg:h-full lg:flex-1">
        <MapView
          origin={origin}
          destination={destination}
          routeGeometry={routeGeometry}
          stops={stops}
          onMapClick={handleMapClick}
          unit={unit}
        />
      </main>
    </div>
  );
}
