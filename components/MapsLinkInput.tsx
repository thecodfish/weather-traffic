"use client";

import { useState } from "react";
import type { ParsedRouteLink } from "@/lib/providers/types";

interface MapsLinkInputProps {
  onResolved: (result: ParsedRouteLink) => void;
}

export function MapsLinkInput({ onResolved }: MapsLinkInputProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!url.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/parse-maps-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to parse that link");
      onResolved(body as ParsedRouteLink);
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse that link");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        Or paste a Google Maps route link
      </label>
      <div className="mt-1 flex gap-2">
        <input
          type="text"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
          placeholder="https://maps.app.goo.gl/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!url.trim() || isLoading}
          className="shrink-0 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Parsing…" : "Use link"}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
