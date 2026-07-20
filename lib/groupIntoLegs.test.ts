import { describe, expect, it } from "vitest";
import { groupIntoLegs } from "./groupIntoLegs";
import type { StopWithWeather } from "./sampleRoute";
import type { NormalizedWeather } from "./providers/types";

let nextIndex = 0;

function stop(weatherCode: number | null, overrides: Partial<NormalizedWeather> = {}): StopWithWeather {
  const i = nextIndex++;
  return {
    location: { lat: i, lon: i },
    etaOffsetSeconds: i * 600,
    eta: new Date(Date.UTC(2026, 0, 1, 0, 0, 0) + i * 600_000),
    cumulativeDistanceMeters: i * 10_000,
    stepIndex: i,
    weather:
      weatherCode === null
        ? undefined
        : {
            time: "",
            temperatureC: 15,
            precipitationMm: 0,
            weatherCode,
            windSpeedKmh: 10,
            ...overrides,
          },
  };
}

describe("groupIntoLegs", () => {
  it("merges clear/cloudy flicker into a single benign leg", () => {
    nextIndex = 0;
    // clear, partly cloudy, overcast, mainly clear — all benign
    const stops = [stop(0), stop(2), stop(3), stop(1)];
    const legs = groupIntoLegs(stops);

    expect(legs).toHaveLength(1);
    expect(legs[0].stops).toHaveLength(4);
  });

  it("keeps distinct inclement categories as separate legs even when adjacent", () => {
    nextIndex = 0;
    const stops = [stop(61), stop(95)]; // rain, then thunderstorm
    const legs = groupIntoLegs(stops);

    expect(legs).toHaveLength(2);
    expect(legs[0].category).toBe("rain");
    expect(legs[1].category).toBe("thunderstorm");
  });

  it("preserves a single-stop inclement leg rather than merging it away", () => {
    nextIndex = 0;
    const stops = [stop(0), stop(0), stop(95), stop(0), stop(0)];
    const legs = groupIntoLegs(stops);

    expect(legs).toHaveLength(3);
    expect(legs.map((l) => l.category)).toEqual(["clear", "thunderstorm", "clear"]);
    expect(legs[1].stops).toHaveLength(1);
  });

  it("keeps repeated identical inclement categories as one leg (not just benign gets merged)", () => {
    nextIndex = 0;
    const stops = [stop(61), stop(63), stop(65)]; // slight, moderate, heavy rain — all "rain"
    const legs = groupIntoLegs(stops);

    expect(legs).toHaveLength(1);
    expect(legs[0].category).toBe("rain");
  });

  it("breaks a leg at stops with no resolved weather", () => {
    nextIndex = 0;
    const stops = [stop(0), stop(0), stop(null), stop(0), stop(0)];
    const legs = groupIntoLegs(stops);

    expect(legs).toHaveLength(2);
    expect(legs[0].stops).toHaveLength(2);
    expect(legs[1].stops).toHaveLength(2);
  });

  it("computes min/max temperature and max precipitation across the leg", () => {
    nextIndex = 0;
    const stops = [
      stop(61, { temperatureC: 10, precipitationMm: 1 }),
      stop(63, { temperatureC: 14, precipitationMm: 5 }),
      stop(61, { temperatureC: 12, precipitationMm: 2 }),
    ];
    const legs = groupIntoLegs(stops);

    expect(legs).toHaveLength(1);
    expect(legs[0].minTemperatureC).toBe(10);
    expect(legs[0].maxTemperatureC).toBe(14);
    expect(legs[0].maxPrecipitationMm).toBe(5);
  });

  it("picks the most frequent label within a leg as representative", () => {
    nextIndex = 0;
    const stops = [stop(61), stop(61), stop(63)]; // 2x "Slight rain", 1x "Moderate rain"
    const legs = groupIntoLegs(stops);

    expect(legs[0].label).toBe("Slight rain");
  });

  it("sets startStop/endStop to the first/last stop of the leg", () => {
    nextIndex = 0;
    const stops = [stop(0), stop(0), stop(0)];
    const legs = groupIntoLegs(stops);

    expect(legs[0].startStop).toBe(stops[0]);
    expect(legs[0].endStop).toBe(stops[2]);
  });

  it("returns an empty array for an empty input", () => {
    expect(groupIntoLegs([])).toEqual([]);
  });

  it("returns nothing when every stop has no resolved weather", () => {
    nextIndex = 0;
    expect(groupIntoLegs([stop(null), stop(null)])).toEqual([]);
  });
});
