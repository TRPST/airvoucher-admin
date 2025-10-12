'use client';

import React, { useEffect, useState, useRef } from 'react';

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
  ...props
}: LocationAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

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
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
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
          await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

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
    <div className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 150)}
        autoComplete="off"
        {...props}
      />

      {isFocused && (
        <div className="absolute left-0 right-0 mt-1 rounded-md border bg-white shadow-md z-10">
          {loading && <div className="px-3 py-2 text-gray-500">Loading…</div>}
          {!loading && suggestions.length === 0 && (
            <div className="px-3 py-2 text-gray-500">No results</div>
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
                  className="block w-full text-left px-3 py-2 hover:bg-gray-100"
                >
                  <span className="font-medium">{prediction.text.text}</span>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}
