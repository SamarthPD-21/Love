import type { Metadata } from "next";
import "./cinema.css";

export const metadata: Metadata = {
  title: "Cinema — Our Private Space",
  description: "Cozy private cinema hall.",
  robots: "noindex, nofollow",
};

export default function CinemaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-theme="dark" className="cinema-root min-h-screen bg-[#050510] text-[#F0EAF4] antialiased overflow-hidden">
      {children}
    </div>
  );
}
