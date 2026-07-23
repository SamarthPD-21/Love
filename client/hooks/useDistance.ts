"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface Location {
  lat: number;
  lng: number;
  updatedAt?: string | Date;
}

export function useDistance() {
  const [myLocation, setMyLocation] = useState<Location | null>(null);
  const [partnerLocation, setPartnerLocation] = useState<Location | null>(null);
  const [partnerName, setPartnerName] = useState<string>("Love");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Haversine formula to compute distance in km
  const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      Promise.resolve().then(() => {
        setError("Geolocation is not supported by your browser");
        setIsLoading(false);
      });
      return;
    }

    const updateMyLocationOnServer = async (lat: number, lng: number) => {
      try {
        await api.put("/location", { lat, lng });
      } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (err?.response?.status !== 404) {
          console.error("Failed to update location on server:", err);
        }
      }
    };

    const fetchPartnerLocation = async () => {
      try {
        const res = await api.get("/location/partner");
        if (res.data.success) {
          if (res.data.partnerName) {
            setPartnerName(res.data.partnerName);
          }
          if (res.data.partnerLocation) {
            const partLoc = res.data.partnerLocation;
            setPartnerLocation(partLoc);
          } else {
            setPartnerLocation(null);
          }
        }
      } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (err?.response?.status !== 404) {
          console.error("Failed to fetch partner location:", err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Watch current location
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newLoc = { lat: latitude, lng: longitude, updatedAt: new Date() };
        setMyLocation(newLoc);
        updateMyLocationOnServer(latitude, longitude);
      },
      (err) => {
        console.warn("Geolocation permission unavailable:", err?.message || err);
        setError("Location permission denied or unavailable");
        setIsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    // Initial partner location fetch
    fetchPartnerLocation();

    // Poll partner location every 30s
    const fetchInterval = setInterval(fetchPartnerLocation, 30000);

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (fetchInterval) clearInterval(fetchInterval);
    };
  }, []);

  // Derive distance from locations
  const distance = (myLocation && partnerLocation)
    ? getHaversineDistance(
        myLocation.lat,
        myLocation.lng,
        partnerLocation.lat,
        partnerLocation.lng
      )
    : null;

  return {
    distance,
    myLocation,
    partnerLocation,
    partnerName,
    error,
    isLoading,
  };
}
