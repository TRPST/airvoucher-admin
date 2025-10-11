import * as React from 'react';

type AutocompleteInstance = {
  addListener: (eventName: string, handler: () => void) => void;
  getPlace: () => {
    formatted_address?: string;
    name?: string;
  };
};

type NullableAutocomplete = AutocompleteInstance | null;

interface LocationAutocompleteInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onLocationSelect?: (address: string) => void;
  apiKey?: string;
}

const SCRIPT_ID = 'google-places-autocomplete-script';
let scriptLoadingPromise: Promise<void> | null = null;

const loadGoogleMapsScript = (apiKey: string) => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps script can only load in the browser'));
  }

  if (window.google?.maps?.places) {
    return Promise.resolve();
  }

  if (!apiKey) {
    return Promise.reject(new Error('Missing Google Maps API key'));
  }

  if (!scriptLoadingPromise) {
    scriptLoadingPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

      const handleError = () => {
        reject(new Error('Failed to load Google Maps script'));
      };

      if (existingScript) {
        const handleLoad = () => {
          existingScript.setAttribute('data-loaded', 'true');
          resolve();
        };

        if (existingScript.getAttribute('data-loaded') === 'true') {
          resolve();
        } else {
          existingScript.addEventListener('load', handleLoad, { once: true });
          existingScript.addEventListener('error', handleError, { once: true });
        }
        return;
      }

      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.async = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
      const handleLoad = () => {
        script.setAttribute('data-loaded', 'true');
        resolve();
      };
      script.addEventListener('load', handleLoad, { once: true });
      script.addEventListener('error', handleError, { once: true });
      document.head.appendChild(script);
    });
  }

  return scriptLoadingPromise;
};

declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          Autocomplete: new (
            input: HTMLInputElement,
            opts?: {
              fields?: string[];
              types?: string[];
            }
          ) => AutocompleteInstance;
        };
        event?: {
          clearInstanceListeners: (instance: AutocompleteInstance | null) => void;
        };
      };
    };
  }
}

export function LocationAutocompleteInput({
  apiKey,
  onLocationSelect,
  value,
  onChange,
  ...inputProps
}: LocationAutocompleteInputProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const autocompleteRef = React.useRef<NullableAutocomplete>(null);
  const hasLoggedWarning = React.useRef(false);
  const onLocationSelectRef = React.useRef(onLocationSelect);

  React.useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  React.useEffect(() => {
    const resolvedApiKey = apiKey ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

    if (!resolvedApiKey) {
      if (!hasLoggedWarning.current) {
        console.warn('LocationAutocompleteInput: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set.');
        hasLoggedWarning.current = true;
      }
      return;
    }

    let isActive = true;

    const initAutocomplete = () => {
      if (!isActive || !inputRef.current || !window.google?.maps?.places) {
        return;
      }

      const clearListeners = window.google?.maps?.event?.clearInstanceListeners;
      if (autocompleteRef.current && clearListeners) {
        clearListeners(autocompleteRef.current);
      }

      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        fields: ['formatted_address', 'name', 'address_components'],
        types: ['geocode'],
      });

      autocompleteRef.current.addListener('place_changed', () => {
        if (!isActive) return;
        const place = autocompleteRef.current?.getPlace();
        const formatted = place?.formatted_address || place?.name || inputRef.current?.value || '';
        if (formatted) {
          onLocationSelectRef.current?.(formatted);
        }
      });
    };

    loadGoogleMapsScript(resolvedApiKey)
      .then(() => {
        initAutocomplete();
      })
      .catch((err) => {
        if (!hasLoggedWarning.current) {
          console.warn(err.message);
          hasLoggedWarning.current = true;
        }
      });

    return () => {
      isActive = false;
      const clearListeners = window.google?.maps?.event?.clearInstanceListeners;
      if (autocompleteRef.current && clearListeners) {
        clearListeners(autocompleteRef.current);
      }
    };
  }, [apiKey]);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={onChange}
      {...inputProps}
    />
  );
}
