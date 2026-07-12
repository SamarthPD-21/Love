# 🌌 Our Little Universe — Couples' Workspace

A beautiful, premium, and highly interactive shared space for couples. Connect with your partner to calculate distance, share countdowns, exchange letters inside 3D animated envelopes, drop secret scrolls in a virtual memory jar, pin travels on an interactive map, and stream music globally in the background.

---

## 🎨 Premium Visual Experience
* **Ambient Time-of-Day Effects**: Floating hearts dance across your screen during the day, while gentle fireflies float across a night sky in dark mode.
* **Cozy Theme Switcher**: Seamless dark and light themes customized with sleek HSL tailored palettes and modern Outfit typography.
* **Haptic Audio Triggers**: Soft chimes, whooshes, and chaps trigger when unsealing envelopes, opening drawers, dropping notes, and playing audio.
* **Custom Toast Alert System**: Animated, glassmorphic toast notification cards replace standard browser popups.

---

## 🚀 Key Feature Rooms

### 1. 💌 Letters & Mood Cabinets ("Open When")
* **3D Envelope Unsealing**: Rebuilt letters detail page with a 3D animated envelope flap that flips 180° before the letter sheet slides out.
* **Cabinet Drawers**: Mood-based "Open When" cabinets (Happy, Sad, Angry, etc.) load letters within inline modal drawers without page redirects, supporting inline audio and photo attachments.
* **Companion Voice Notes**: Attaching audio recordings to letters automatically registers a standalone voice note pointing back to the letter with a clickable backlink.

### 2. 🫙 Secret Memory Jar
* **Surprise Protection**: Notes dropped into the jar are hidden from the history chest to protect the surprise.
* **Dynamic Visual Scrolls**: The count of floating scrolls inside the glass jar reflects the undrawn count. Drawing a scroll shakes the jar, pops a scroll, and adds it to the chest history.
* **Sync Refresh**: An inline header refresh control synchronizes notes instantly between partners.

### 3. 🗺️ Travel Pinboard (Interactive Leaflet Map)
* **Geographical Pinning**: Replaced percentage coordinate grids with a fully interactive Leaflet Map.
* **Adaptive Map Styling**: Automatically shifts map tiles (CartoDB dark-matter for dark theme, CartoDB voyager for light theme).
* **Google Maps URL Parser**: Paste a Google Maps place link to automatically parse the location name and extract coordinates.
* **Fly-to Zoom Transitions**: Selecting a pinned spot from the list pans and zooms the map smoothly to the target coordinate.

### 4. 🎵 The Lounge & Global Music Player
* **Spotify to YouTube Fallback**: Spotify track links are resolved on the server-side to YouTube video IDs, enabling full audio streaming instead of the standard 30-second Spotify preview.
* **Global Persistent Player Bar**: A glassmorphic player bar slides up in the bottom-right corner. It stays active as you navigate between pages, showing bouncing waveform equalizers, a spinning disc indicator, timeline seeking, and volume controls.

### 5. 🫂 Comfort Room & Milestones
* **Virtual Actions**: Send hugs and kisses that trigger fullscreen animations on your partner's screen.
* **Anniversary Tracker**: Computes days together and distance.
* **Milestone Countdowns**: Target date countdowns for upcoming anniversaries, trips, and visits.

---

## 🛠️ Technology Stack

### Frontend (`/client`)
* **Framework**: Next.js 16 (App Router, React 19)
* **Styling**: Tailwind CSS 4, Vanilla CSS
* **Animations**: Framer Motion
* **State Management**: Zustand
* **Data Fetching**: TanStack React Query (Axios client)
* **Maps**: Leaflet.js
* **Music Streaming**: YouTube IFrame Player API

### Backend (`/server`)
* **Runtime**: Node.js, Express, TypeScript
* **Database**: MongoDB (Mongoose ODM)
* **Object Schema Validation**: Zod
* **Media Uploads**: Cloudinary API

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
