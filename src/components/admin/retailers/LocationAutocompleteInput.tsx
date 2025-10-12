'use client';

import React, { useEffect, useState, useRef } from 'react';
import { cn } from '@/utils/cn';

declare global {
  interface Window {
    google: any;
  }
}

interface LocationAutocompleteInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLocationSelect?: (address: string) => void;
  apiKey: string; // Pass NEXT_PUBLIC_GOOGLE_MAPS_API_KEY here
}

export function LocationAutocompleteInput({
  value,
  onChange,
  onLocationSelect,
  apiKey,
  className,
  ...props
}: LocationAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const sessionTokenRef = useRef<any>(null);

  // Load Maps JavaScript API with Places library
  useEffect(() => {
    if (window.google?.maps?.places) return;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    document.body.appendChild(script);
  }, [apiKey]);

  // Initialize a session token when component mounts
  useEffect(() => {
    if (window.google?.maps?.places) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
    }
  }, []);

  // Fetch autocomplete predictions (NEW API)
  useEffect(() => {
    const fetchPredictions = async () => {
      if (
        !window.google?.maps?.places ||
        !value ||
        value.trim().length < 3
      ) {
        setSuggestions([]);
        return;
      }

      setLoading(true);

      try {
        const request = {
          input: value.trim(),
          sessionToken: sessionTokenRef.current!,
        };

        const { suggestions } =
          await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

        setSuggestions(suggestions ?? []);
      } catch (err) {
        console.error('Autocomplete fetch error', err);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, [value]);

  // Handle user selection
  const handleSelect = async (suggestion: any) => {
    try {
      const place = suggestion.placePrediction.toPlace();

      await place.fetchFields({
        fields: ['displayName', 'formattedAddress'],
      });

      onLocationSelect?.(place.formattedAddress || place.displayName || '');
    } catch (err) {
      console.error('Failed to fetch place details', err);
    } finally {
      setSuggestions([]);
    }
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 150)}
        autoComplete="off"
        className={cn(
          'w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />

      {isFocused && (
        <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
          {loading && <div className="px-3 py-2 text-sm text-muted-foreground">Loading…</div>}
          {!loading && suggestions.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No results</div>
          )}
          {!loading &&
            suggestions.map((s, i) => {
              const prediction = s.placePrediction;
              return (
                <button
                  key={i}
                  type="button"
                  onMouseDown={e => {
                    e.preventDefault();
                    handleSelect(s);
                  }}
                  className="flex w-full items-start px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                >
                  <span className="font-medium text-foreground">{prediction.text.text}</span>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
