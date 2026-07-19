import type { SampledPoint } from "@/lib/sampleRoute";
import type { NormalizedWeather } from "@/lib/providers/types";

export interface StopWithWeather extends SampledPoint {
  weather?: NormalizedWeather;
  weatherError?: string;
}
