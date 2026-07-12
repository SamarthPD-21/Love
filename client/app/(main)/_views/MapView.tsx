"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Map as MapIcon, Plus, Trash2, Calendar, MapPin, Loader2, X, Compass, Globe, Search } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useToastStore } from "@/stores/useToastStore";
import { useTheme } from "next-themes";
import Script from "next/script";

interface TravelPin {
  _id: string;
  title: string;
  description?: string;
  lat: number; 
  lng: number; 
  category: "visited" | "planned";
  date?: string;
  userId: {
    _id: string;
    name: string;
    avatar?: string;
  };
}

export default function MapPage() {
  const [pins, setPins] = useState<TravelPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState("");
  const { playSound } = useSoundEffects();
  const showToast = useToastStore((s) => s.showToast);
  const { theme } = useTheme();

  // Filter category
  const [activeFilter, setActiveFilter] = useState<"all" | "visited" | "planned">("all");

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"visited" | "planned">("visited");
  const [date, setDate] = useState("");
  const [lat, setLat] = useState(0); 
  const [lng, setLng] = useState(0); 
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Leaflet map hooks
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [markersGroup, setMarkersGroup] = useState<any>(null);

  const fetchPins = async () => {
    try {
      const response = await api.get("/map");
      if (response.data.success) {
        setPins(response.data.data);
      }
    } catch (err) {
      console.error("Failed to load map pins:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPins();
    
    // Dynamically append Leaflet stylesheet
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    if ((window as any).L) {
      setLeafletLoaded(true);
    }

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!leafletLoaded || !document.getElementById("map-container")) return;
    const L = (window as any).L;
    if (!L) return;

    // Clean up existing map instance in window
    const existingMap = (window as any)._leafletMap;
    if (existingMap) {
      existingMap.remove();
    }

    // Set custom icon anchor behaviors
    const map = L.map("map-container", {
      zoomControl: true,
      attributionControl: false,
    }).setView([25, 10], 2);

    (window as any)._leafletMap = map;
    setMapInstance(map);

    // Apply CartoDB dark/light tile layouts depending on the active theme
    const isDark = theme === "dark";
    const tileUrl = isDark
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    L.tileLayer(tileUrl, {
      maxZoom: 18,
    }).addTo(map);

    // Create markers layer group
    const group = L.layerGroup().addTo(map);
    setMarkersGroup(group);

    // Capture coordinates on click
    map.on("click", (e: any) => {
      const { lat, lng } = e.latlng;
      setLat(parseFloat(lat.toFixed(6)));
      setLng(parseFloat(lng.toFixed(6)));
      setGoogleMapsUrl("");
      setIsModalOpen(true);
      playSound("tap");
    });

    return () => {
      map.remove();
      (window as any)._leafletMap = null;
    };
  }, [leafletLoaded, theme]);

  // Render and update markers on coordinates changes
  useEffect(() => {
    if (!mapInstance || !markersGroup) return;
    const L = (window as any).L;
    if (!L) return;

    markersGroup.clearLayers();

    const customIcon = (category: string) => {
      const color = category === "visited" ? "#EF4444" : "#F59E0B";
      return L.divIcon({
        className: "custom-map-pin",
        html: `
          <div class="relative -top-4 -left-3 group">
            <svg class="w-7 h-7 drop-shadow-md transition-transform duration-200 group-hover:scale-125" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="${color}"/>
            </svg>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });
    };

    filteredPins.forEach((pin) => {
      const marker = L.marker([pin.lat, pin.lng], {
        icon: customIcon(pin.category),
      });

      const formattedDate = pin.date ? format(new Date(pin.date), "PPP") : "";
      marker.bindPopup(`
        <div class="p-3 space-y-1 rounded-xl select-text">
          <h4 class="font-bold text-xs text-foreground leading-tight m-0">${pin.title}</h4>
          <span class="text-[9px] uppercase tracking-wider font-extrabold text-primary">${pin.category} ${formattedDate ? `• ${formattedDate}` : ""}</span>
          ${pin.description ? `<p class="text-[10px] text-muted-foreground m-0 mt-1 italic">&ldquo;${pin.description}&rdquo;</p>` : ""}
          <p class="text-[8px] text-muted-foreground/60 m-0 mt-1">Coords: ${pin.lat.toFixed(4)}, ${pin.lng.toFixed(4)}</p>
        </div>
      `);

      marker.addTo(markersGroup);
    });
  }, [pins, activeFilter, mapInstance, markersGroup]);

  // Google Maps link parser
  const handleGoogleMapsUrlChange = (url: string) => {
    setGoogleMapsUrl(url);
    if (!url.trim()) return;

    // Extract title
    let extractedTitle = "";
    const placeMatch = url.match(/\/maps\/place\/([^/]+)/);
    if (placeMatch) {
      extractedTitle = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
      setTitle(extractedTitle);
    }

    // Extract coordinates
    // 1. @lat,lng format
    const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      setLat(parseFloat(atMatch[1]));
      setLng(parseFloat(atMatch[2]));
      showToast("Coordinates parsed from Google Maps link!", "success");
      return;
    }

    // 2. q=lat,lng format
    const qMatch = url.match(/[?&](q|query)=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qMatch) {
      setLat(parseFloat(qMatch[2]));
      setLng(parseFloat(qMatch[3]));
      showToast("Coordinates parsed from Google Maps query!", "success");
      return;
    }

    // 3. raw lat,lng string format
    const rawMatch = url.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/);
    if (rawMatch) {
      setLat(parseFloat(rawMatch[1]));
      setLng(parseFloat(rawMatch[2]));
      showToast("Raw coordinates detected!", "success");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setError("");
    setSubmitting(true);

    try {
      const response = await api.post("/map", {
        title,
        description,
        lat,
        lng,
        category,
        date: date || undefined,
      });

      if (response.data.success) {
        setPins((prev) => [response.data.data, ...prev]);
        setIsModalOpen(false);
        setTitle("");
        setDescription("");
        setCategory("visited");
        setDate("");
        setGoogleMapsUrl("");
        showToast("Travel pin saved successfully!", "success");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to add travel pin");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this travel spot?")) return;
    try {
      await api.delete(`/map/${id}`);
      setPins((prev) => prev.filter((p) => p._id !== id));
      showToast("Pin deleted.", "success");
    } catch (err) {
      console.error("Failed to delete travel pin:", err);
    }
  };

  const handleSelectPin = (pin: TravelPin) => {
    if (mapInstance) {
      mapInstance.flyTo([pin.lat, pin.lng], 14, {
        duration: 1.5,
      });
      playSound("chime");
    }
  };

  const filteredPins = pins.filter(
    (p) => activeFilter === "all" || p.category === activeFilter
  );

  return (
    <div className="min-h-[calc(100dvh-6rem)] flex flex-col pb-8">
      {/* Script Loader for Leaflet CDN */}
      <Script 
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" 
        strategy="afterInteractive" 
        onLoad={() => setLeafletLoaded(true)}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2 font-display">
            <MapIcon className="w-8 h-8 text-primary" /> Travel Pinboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pins of special spots we visited or plan to travel to. Click the map to drop a marker! 🗺️
          </p>
        </div>
        <button
          onClick={() => {
            playSound("tap");
            setLat(0);
            setLng(0);
            setGoogleMapsUrl("");
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Drop a Pin
        </button>
      </div>

      {/* Main Grid: Interactive Map Board & List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch flex-1">
        
        {/* Left/Middle: The Map Container */}
        <div className="lg:col-span-2 flex flex-col items-stretch p-3 bg-card border-2 border-border/80 rounded-3xl relative min-h-[420px] shadow-lg select-none">
          <div 
            id="map-container"
            className="flex-1 w-full rounded-2xl overflow-hidden z-0 border border-border bg-muted/20 relative"
          >
            {!leafletLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-xs font-semibold">Aligning satellites...</p>
              </div>
            )}
          </div>
        </div>

        {/* Right side: Pins list tracker */}
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 border-b border-border/80 pb-2">
            {(["all", "visited", "planned"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setActiveFilter(mode)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors cursor-pointer",
                  activeFilter === mode
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          {filteredPins.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 border border-dashed border-border rounded-3xl bg-card/50 text-center">
              <MapPin className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground italic">No pins recorded yet.</p>
            </div>
          ) : (
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[380px] pr-1">
              {filteredPins.map((pin) => (
                <div
                  key={pin._id}
                  onClick={() => handleSelectPin(pin)}
                  className="card-cozy p-4 flex flex-col justify-between hover:border-primary/50 cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-extrabold text-foreground leading-tight group-hover:text-primary transition-colors">
                        {pin.title}
                      </h4>
                      <p className="text-[9px] text-muted-foreground mt-0.5 capitalize">
                        {pin.category} {pin.date ? `• ${format(new Date(pin.date), "PP")}` : ""}
                      </p>
                    </div>

                    <button
                      onClick={(e) => handleDelete(pin._id, e)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {pin.description && (
                    <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed italic border-t border-border/20 pt-1.5">
                      &ldquo;{pin.description}&rdquo;
                    </p>
                  )}
                  
                  <div className="flex justify-between items-center mt-2.5 text-[8px] text-muted-foreground/60">
                    <span>by {pin.userId.name}</span>
                    <span className="font-mono">{pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Creation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/45 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl z-10 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-bold text-foreground flex items-center gap-2 border-b border-border/40 pb-2">
                <MapPin className="w-5 h-5 text-primary" /> Drop a Travel Pin
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Google Maps Link Linker */}
                <div className="space-y-1.5 p-3 rounded-2xl bg-muted/40 border border-border/30">
                  <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5" /> Pin via Google Maps Link
                  </label>
                  <input
                    type="text"
                    value={googleMapsUrl}
                    onChange={(e) => handleGoogleMapsUrlChange(e.target.value)}
                    placeholder="Paste a Google Maps place link or coordinates..."
                    className="w-full px-4 py-2.5 rounded-xl text-xs bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  />
                  <p className="text-[9px] text-muted-foreground mt-1">
                    💡 Pre-fills location name and coordinates automatically from URLs.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Spot Name</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Eiffel Tower, Our First Date Cafe"
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Description (Optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what we did or what we plan to do here..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    >
                      <option value="visited">Visited Spot 🏖️</option>
                      <option value="planned">Planned Spot ✈️</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Date (Optional)</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Coordinate pickers */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Latitude</label>
                    <input
                      type="number"
                      required
                      step="any"
                      min={-90}
                      max={90}
                      value={lat}
                      onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Longitude</label>
                    <input
                      type="number"
                      required
                      step="any"
                      min={-180}
                      max={180}
                      value={lng}
                      onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground focus:outline-none"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-rose-500 font-semibold bg-rose-50 dark:bg-rose-950/20 py-1.5 px-3 rounded-lg border border-rose-100 dark:border-rose-900/30">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl font-semibold text-sm bg-primary text-white hover:bg-primary-hover active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg mt-2 cursor-pointer"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Adding...
                    </span>
                  ) : (
                    "Save Spot"
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
