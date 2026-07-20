export function formatMiles(meters: number): string {
  return (meters / 1609.34).toFixed(1);
}

export function formatEtaTime(date: Date): string {
  return date.toLocaleString(undefined, { hour: "numeric", minute: "2-digit" });
}
