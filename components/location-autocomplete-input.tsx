"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    google?: any;
  }
}

type LocationValue = {
  label: string;
  lat: number | null;
  lng: number | null;
};

type LocationAutocompleteInputProps = {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  placeholder?: string;
  className?: string;
};

let mapsScriptPromise: Promise<void> | null = null;

function loadGoogleMapsPlacesScript(apiKey: string) {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps?.places) return Promise.resolve();
  if (mapsScriptPromise) return mapsScriptPromise;

  mapsScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-memora-google-places="true"]',
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Google Maps script.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.memoraGooglePlaces = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps script."));
    document.head.appendChild(script);
  });

  return mapsScriptPromise;
}

export function LocationAutocompleteInput({
  value,
  onChange,
  placeholder = "Search for a location",
  className,
}: LocationAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !inputRef.current) return;

    let isDisposed = false;
    let placeListener: { remove: () => void } | null = null;

    void loadGoogleMapsPlacesScript(apiKey)
      .then(() => {
        if (isDisposed || !inputRef.current || !window.google?.maps?.places?.Autocomplete) {
          return;
        }

        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ["formatted_address", "geometry", "name"],
        });

        placeListener = autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const lat = place?.geometry?.location?.lat?.() ?? null;
          const lng = place?.geometry?.location?.lng?.() ?? null;
          const label = place?.formatted_address || place?.name || inputRef.current?.value || "";

          onChangeRef.current({
            label,
            lat,
            lng,
          });
        });
      })
      .catch(() => {
        // If the script fails, keep a plain text input behavior.
      });

    return () => {
      isDisposed = true;
      if (placeListener) {
        placeListener.remove();
      }
    };
  }, []);

  return (
    <input
      ref={inputRef}
      value={value.label}
      onChange={(event) =>
        onChange({
          label: event.target.value,
          lat: null,
          lng: null,
        })
      }
      className={className}
      placeholder={placeholder}
      autoComplete="off"
    />
  );
}

