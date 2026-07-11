import type { Metadata, Viewport } from "next";
import { Inter, Caveat } from "next/font/google";
import { Providers } from "@/providers/Providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Home — Our Private Space",
  description: "A private digital home built only for the two of us. Filled with memories, surprises, dreams, letters, and love.",
  keywords: ["love", "couple", "memories", "private", "home"],
  robots: "noindex, nofollow",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFF8F0" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1625" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${caveat.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
