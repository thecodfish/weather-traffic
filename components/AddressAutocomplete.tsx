"use client";

import { useEffect, useRef, useState } from "react";
import type { GeocodeResult, LatLon } from "@/lib/providers/types";

interface AddressAutocompleteProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (text: string) => void;
  onSelect: (result: GeocodeResult) => void;
  selectedLocation: LatLon | null;
}

const DEBOUNCE_MS = 400;

export function AddressAutocomplete({
  label,
  placeholder,
  value,
  onChange,
  onSelect,
  selectedLocation,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 3) {
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(value)}`);
        if (res.ok) {
          setSuggestions(await res.json());
          setIsOpen(true);
        }
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <input
        type="text"
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (e.target.value.trim().length < 3) setSuggestions([]);
        }}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
      />
      {selectedLocation && (
        <span className="mt-1 block text-xs text-emerald-600">
          Pinned at {selectedLocation.lat.toFixed(4)}, {selectedLocation.lon.toFixed(4)}
        </span>
      )}
      {isLoading && <span className="mt-1 block text-xs text-slate-400">Searching…</span>}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-[1000] mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {suggestions.map((result, i) => (
            <li key={i}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(result);
                  setIsOpen(false);
                }}
              >
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
