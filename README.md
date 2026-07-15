# 🌌 Our Little Universe — Couples' Workspace

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-v15.2-black?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-v19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-v5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-v4.x-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-v8.x-47A248?style=for-the-badge&logo=mongodb&logoColor=white)

A beautiful, premium, and highly interactive shared space for couples. Connect with your partner in real-time to calculate distance, track anniversaries, exchange letters inside 3D animated envelopes, drop secret scrolls in a virtual memory jar, pin travels on an interactive map, co-watch movies, and stream music in the background.

</div>

---

## 🎨 Premium Visual Experience

* **🌅 Ambient Time-of-Day Effects**: Floating pink hearts dance across your screen during the day, while gentle fireflies float across a dark night sky in dark mode.
* **💅 Cozy Theme Switcher**: Seamless dark and light themes customized with sleek, high-fidelity HSL tailored palettes and elegant Outfit typography.
* **🎵 Haptic Audio Triggers**: Soft chimes, whooshes, and taps trigger when unsealing envelopes, opening drawers, dropping notes, and toggling player settings.
* **🔔 Custom Toast Alert System**: Animated glassmorphic toast notification cards replace standard browser popups.

---

## 🚀 Key Feature Rooms

### 1. 🎬 Cinema Hall & Co-Watching (Revamped standalone room)
* **🎟️ Standing Room Curtains**: A separate, immersive setup interface featuring a dynamic movie projector loader beam, spotlight glows, and interactive snack checklists.
* **🔌 Love Cinema Sync Extension**: Integrates directly with a custom Manifest V3 browser extension to bypass X-Frame-Options/CSP header blocks, enabling premium movie hosting embeds.
* **⚡ Multi-Source Selector**: Toggle on-the-fly between **11 high-speed streaming servers** (1HD, VidSrc.to, VidSrc.me, VidSrcMe.ru, VidSrc.xyz, 2Embed, MultiEmbed, Embed.su, AutoEmbed, SmashyStream, Cineby, BFlix) using a fast server-side Wikidata SPARQL IMDB/TMDB-ID mapping & cached client resolution.
* **📁 Google Drive Co-Watching**: Input any shared Google Drive file link directly in the lobby. The system automatically parses the file ID, generates the embed, and synchronizes playback (play, pause, and seeks) dynamically between partners.
* **💬 Theater Chat & Fun Actions**: A sliding glassmorphic sidebar chat drawer with floating emoji reactions (❤️, 😂, 😢, 🍿), dimmable ambient lights overlay, and popcorn fight/cuddle triggers.

### 2. 💌 Letters & Mood Cabinets ("Open When")
* **✉️ 3D Envelope Unsealing**: Rebuilt letters detail page with a 3D animated envelope flap that flips 180° before the letter sheet slides out.
* **🗄️ Cabinet Drawers**: Mood-based "Open When" cabinets (Happy, Sad, Angry, etc.) load letters within inline modal drawers without page redirects, supporting inline audio and photo attachments.
* **🎤 Companion Voice Notes**: Attaching audio recordings to letters automatically registers a standalone voice note pointing back to the letter with a clickable backlink.

### 3. 🫙 Secret Memory Jar
* **🤫 Surprise Protection**: Notes dropped into the jar are hidden from the history chest to protect the surprise.
* **📜 Dynamic Visual Scrolls**: The count of floating scrolls inside the glass jar reflects the undrawn count. Drawing a scroll shakes the jar, pops a scroll, and adds it to the chest history.
* **🔄 Sync Refresh**: An inline header refresh control synchronizes notes instantly between partners.

### 4. 🗺️ Travel Pinboard (Interactive Leaflet Map)
* **📍 Geographical Pinning**: Replaced percentage coordinate grids with a fully interactive Leaflet Map.
* **🗺️ Adaptive Map Styling**: Automatically shifts map tiles (CartoDB dark-matter for dark theme, CartoDB voyager for light theme).
* **🔍 Google Maps URL Parser**: Paste a Google Maps place link to automatically parse the location name and extract coordinates.
* **✈️ Fly-to Zoom Transitions**: Selecting a pinned spot from the list pans and zooms the map smoothly to the target coordinate.

### 5. 🎵 The Lounge & Global Music Player
* **🎧 Spotify to YouTube Fallback**: Spotify track links are resolved on the server-side to YouTube video IDs, enabling full audio streaming instead of the standard 30-second Spotify preview.
* **✨ Global Persistent Player Bar**: A glassmorphic player bar slides up in the bottom-right corner. It stays active as you navigate between pages, showing bouncing waveform equalizers, a spinning disc indicator, timeline seeking, and volume controls.

### 6. 🫂 Comfort Room & Milestones
* **🤗 Virtual Actions**: Send hugs and kisses that trigger fullscreen animations on your partner's screen.
* **📅 Anniversary Tracker**: Computes days together and distance.
* **⏳ Milestone Countdowns**: Target date countdowns for upcoming anniversaries, trips, and visits.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 16 (App Router, React 19), Tailwind CSS 4, Framer Motion, Zustand, TanStack Query, Leaflet.js |
| **Backend** | Node.js, Express, TypeScript, Socket.io, Mongoose, Zod, got-scraping, Wikidata SPARQL |
| **Media & Storage** | MongoDB Atlas, Cloudinary API |

---

## 🏃 Run the Application Locally

### Prerequisite Environment Variables

#### Backend Server Config (`server/.env`)
Create a `.env` file in the `server` directory:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_signing_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

#### Frontend Client Config (`client/.env.local`)
Create a `.env.local` file in the `client` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

### Step-by-Step Launch

1. **Clone & Spin up Backend**:
   ```bash
   cd server
   npm install
   npm run dev
   ```

2. **Spin up Frontend**:
   ```bash
   cd client
   npm install
   npm run dev
   ```

3. Open `http://localhost:3000` in your web browser. Register an account, share your invite code with your partner, and begin exploring your shared universe! 🌌
