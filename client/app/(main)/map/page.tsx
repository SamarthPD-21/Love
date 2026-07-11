"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Map, Plus, Trash2, Calendar, MapPin, Loader2, X, Compass, Globe } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface TravelPin {
  _id: string;
  title: string;
  description?: string;
  lat: number; // custom grid position X
  lng: number; // custom grid position Y
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

  // Filter category
  const [activeFilter, setActiveFilter] = useState<"all" | "visited" | "planned">("all");

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"visited" | "planned">("visited");
  const [date, setDate] = useState("");
  const [lat, setLat] = useState(50); // percentage X
  const [lng, setLng] = useState(50); // percentage Y
  const [submitting, setSubmitting] = useState(false);

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
  }, []);

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
    } catch (err) {
      console.error("Failed to delete travel pin:", err);
    }
  };

  const filteredPins = pins.filter(
    (p) => activeFilter === "all" || p.category === activeFilter
  );

  return (
    <div className="min-h-[calc(100dvh-6rem)] flex flex-col pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Map className="w-8 h-8 text-primary" /> Travel Pinboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pins of special spots we visited or plan to travel to. Click the pinboard to drop a marker! 🗺️
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Drop a Pin
        </button>
      </div>

      {/* Main Grid: Interactive Canvas Board & List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch flex-1">
        {/* Left/Middle: The Pinboard Canvas */}
        <div className="lg:col-span-2 flex flex-col items-stretch p-4 bg-card border-4 border-border rounded-3xl relative min-h-[420px] shadow-inner select-none overflow-hidden">
          {/* Corkboard texture background */}
          <div className="absolute inset-0 bg-[radial-gradient(#C4B59D_1px,transparent_1px)] dark:bg-[radial-gradient(#27272A_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />

          {/* Heading overlay */}
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            <span className="text-[10px] font-bold bg-[#8B7D6B] text-white py-1 px-3 rounded-full flex items-center gap-1.5 shadow-sm">
              <Compass className="w-3.5 h-3.5" /> OUR TRAVEL MAP
            </span>
          </div>

          {/* Canvas Wrapper */}
          <div className="relative flex-1 rounded-2xl border-2 border-dashed border-border/50 m-2 flex items-center justify-center overflow-hidden">
            {loading ? (
              <Loader2 className="w-8 h-8 text-[#8B7D6B] animate-spin" />
            ) : (
              <>
                {/* Visual Background grid representing a map */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                  <Globe className="w-96 h-96 text-[#8B7D6B]" />
                </div>

                {/* Render pins on coordinates */}
                <AnimatePresence>
                  {filteredPins.map((pin) => (
                    <motion.div
                      key={pin._id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      style={{
                        position: "absolute",
                        left: `${pin.lat}%`,
                        top: `${pin.lng}%`,
                      }}
                      className="group -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
                    >
                      <MapPin
                        className={cn(
                          "w-7 h-7 drop-shadow-md transition-transform group-hover:scale-125 duration-200",
                          pin.category === "visited"
                            ? "text-rose-500 fill-rose-500/20"
                            : "text-amber-500 fill-amber-500/20"
                        )}
                      />

                      {/* Tooltip on hover */}
                      <div className="absolute left-1/2 -top-12 -translate-x-1/2 scale-0 group-hover:scale-100 transition-all duration-200 bg-card border border-border text-[10px] py-1.5 px-3 rounded-xl shadow-lg whitespace-nowrap z-20 pointer-events-none">
                        <p className="font-bold text-foreground">{pin.title}</p>
                        <p className="text-[8px] text-muted-foreground mt-0.5 capitalize">
                          {pin.category} {pin.date ? `• ${format(new Date(pin.date), "PP")}` : ""}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </>
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
                  "px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-colors cursor-pointer",
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
                  className="card-cozy p-4 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-foreground leading-tight">
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
                    <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed italic">
                      &ldquo;{pin.description}&rdquo;
                    </p>
                  )}
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
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-2xl z-10"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-xl font-bold text-foreground flex items-center gap-2 mb-6">
                <MapPin className="w-5 h-5 text-primary" /> Drop a Pin
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Spot Name</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Our First Date Cafe, Eiffel Tower"
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Description (Optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What did we do here?"
                    className="w-full px-4 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 cursor-pointer"
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
                      className="w-full px-3 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Coordinate pickers */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Coordinate X (%)</label>
                    <input
                      type="number"
                      required
                      min={5}
                      max={95}
                      value={lat}
                      onChange={(e) => setLat(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Coordinate Y (%)</label>
                    <input
                      type="number"
                      required
                      min={5}
                      max={95}
                      value={lng}
                      onChange={(e) => setLng(Number(e.target.value))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
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
