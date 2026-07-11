"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings, Calendar, User, Link2, LogOut, Loader2, Copy, Check, Heart } from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function SettingsPage() {
  const router = useRouter();
  const { user, token, setAuth, clearAuth } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState("");
  const [profileAvatar, setProfileAvatar] = useState("");
  const [anniversary, setAnniversary] = useState("");
  const [relationshipStatus, setRelationshipStatus] = useState("pending");
  const [inviteCode, setInviteCode] = useState("");
  const [partnerName, setPartnerName] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAnniversary, setSavingAnniversary] = useState(false);
  const [copied, setCopied] = useState(false);

  const [errorProfile, setErrorProfile] = useState("");
  const [errorAnniversary, setErrorAnniversary] = useState("");

  const fetchDetails = async () => {
    try {
      const response = await api.get("/users/me");
      if (response.data.user) {
        const u = response.data.user;
        setProfileName(u.name || "");
        setProfileAvatar(u.avatar || "");

        if (u.relationshipId) {
          const rel = u.relationshipId;
          setRelationshipStatus(rel.status || "pending");
          setInviteCode(rel.inviteCode || "");
          if (rel.startDate) {
            setAnniversary(format(new Date(rel.startDate), "yyyy-MM-dd"));
          }
        }

        if (u.partnerId) {
          setPartnerName(u.partnerId.name || "");
        }
      }
    } catch (err) {
      console.error("Failed to load settings details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, []);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setErrorProfile("");
    const formData = new FormData();
    formData.append("files", file);

    try {
      const response = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (response.data?.urls?.[0]) {
        setProfileAvatar(response.data.urls[0]);
      }
    } catch (err: any) {
      setErrorProfile("Failed to upload avatar image");
      console.error(err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;
    setErrorProfile("");
    setSavingProfile(true);

    try {
      const response = await api.put("/users/me", {
        name: profileName,
        avatar: profileAvatar || undefined,
      });

      if (response.data.user) {
        setAuth(response.data.user, token || "");
        alert("Profile updated successfully!");
      }
    } catch (err: any) {
      setErrorProfile(err.response?.data?.error || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdateAnniversary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anniversary) return;
    setErrorAnniversary("");
    setSavingAnniversary(true);

    try {
      const response = await api.put("/users/relationship", {
        startDate: anniversary,
      });

      if (response.data.relationship) {
        alert("Anniversary updated successfully!");
      }
    } catch (err: any) {
      setErrorAnniversary(err.response?.data?.error || "Failed to update anniversary");
    } finally {
      setSavingAnniversary(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = () => {
    if (!confirm("Are you sure you want to log out?")) return;
    clearAuth();
    router.push("/login");
  };

  return (
    <div className="min-h-[calc(100dvh-6rem)] flex flex-col pb-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <Settings className="w-8 h-8 text-primary" /> Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customize your profile, anniversary dates, and connect your spaces ⚙️
        </p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start max-w-5xl w-full">
          {/* Column 1: Profile settings */}
          <div className="bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-md rounded-3xl p-6 shadow-xl space-y-6">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Profile Details
            </h3>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Your Name</label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider block">Profile Photo</label>
                
                <div className="flex items-center gap-4">
                  {/* Photo Preview */}
                  <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0">
                    {profileAvatar ? (
                      <img src={profileAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-primary" />
                    )}
                  </div>

                  {/* File input button */}
                  <div className="flex-1">
                    <label className="inline-block px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                      {uploadingAvatar ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                        </span>
                      ) : (
                        "Upload Photo 📸"
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingAvatar}
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-muted-foreground mt-1.5">JPG, PNG, or GIF up to 5MB</p>
                  </div>
                </div>
              </div>

              {errorProfile && (
                <p className="text-xs text-rose-500 font-semibold bg-rose-50 dark:bg-rose-950/20 py-1.5 px-3 rounded-lg border border-rose-100 dark:border-rose-900/30">
                  {errorProfile}
                </p>
              )}

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full py-2.5 rounded-xl font-semibold text-xs bg-primary hover:bg-primary-hover text-white disabled:opacity-60 transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98]"
              >
                {savingProfile ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </span>
                ) : (
                  "Update Profile"
                )}
              </button>
            </form>
          </div>

          {/* Column 2: Anniversary settings */}
          <div className="bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-md rounded-3xl p-6 shadow-xl space-y-6">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> Relationship Date
            </h3>

            <form onSubmit={handleUpdateAnniversary} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Anniversary Date</label>
                <input
                  type="date"
                  required
                  value={anniversary}
                  onChange={(e) => setAnniversary(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                />
              </div>

              {errorAnniversary && (
                <p className="text-xs text-rose-500 font-semibold bg-rose-50 dark:bg-rose-950/20 py-1.5 px-3 rounded-lg border border-rose-100 dark:border-rose-900/30">
                  {errorAnniversary}
                </p>
              )}

              <button
                type="submit"
                disabled={savingAnniversary}
                className="w-full py-2.5 rounded-xl font-semibold text-xs bg-primary hover:bg-primary-hover text-white disabled:opacity-60 transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98]"
              >
                {savingAnniversary ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </span>
                ) : (
                  "Update Anniversary"
                )}
              </button>
            </form>
          </div>

          {/* Column 3: Partner Connection / Logout */}
          <div className="space-y-6">
            {/* Connection status */}
            <div className="bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-md rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm uppercase tracking-wider flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" /> Connection Status
              </h3>

              {relationshipStatus === "active" ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                    <Heart className="w-4 h-4 fill-emerald-500 text-emerald-500" />
                    <span>Connected with {partnerName || "Partner"}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    You have established a private, secure digital space with each other. Happy journaling!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="py-2 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                    <span>Waiting for partner...</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Share this code</label>
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-mono">
                      <span className="flex-1 text-sm font-bold text-primary tracking-wider text-center select-all">{inviteCode}</span>
                      <button
                        onClick={handleCopyCode}
                        className={cn(
                          "p-2 rounded-xl transition-all cursor-pointer",
                          copied ? "bg-emerald-50 text-emerald-500" : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                        )}
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Logout panel */}
            <div className="bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-md rounded-3xl p-6 shadow-xl">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-100/50 transition-all cursor-pointer active:scale-[0.98]"
              >
                <LogOut className="w-4.5 h-4.5" />
                Sign Out from Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
