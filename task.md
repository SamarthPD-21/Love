# 🏠 Home — Task Tracker

## Phase 1 — Foundation & Shell
- [x] Initialize `server/` with package.json, tsconfig, dependencies
- [x] Express app entry point (`src/index.ts`)
- [x] MongoDB connection (`src/config/db.ts`)
- [x] Cloudinary config (`src/config/cloudinary.ts`)
- [x] JWT auth middleware (`src/middleware/auth.ts`)
- [x] Upload middleware (`src/middleware/upload.ts`)
- [x] User model (`src/models/User.ts`)
- [x] Relationship model (`src/models/Relationship.ts`)
- [x] Auth routes (`src/routes/auth.ts`)
- [x] User routes (`src/routes/users.ts`)
- [x] `.env.example`
- [x] Install all client dependencies (framer-motion, zustand, next-themes, react-hook-form, zod, date-fns)
- [x] Design token system in `globals.css`
- [x] App shell navigation (Sidebar, BottomNav, AppShell)
- [x] Page transition wrapper and particle background animations
- [x] Home page dashboard layout
- [x] Authenticated/Unauthenticated page layouts (Login, Invite)
- [x] State management & API clients (Zustand, React Query, Axios)

## Phase 2 — Memories & Gallery
- [x] Album Mongoose schema (`server/src/models/Album.ts`)
- [x] Memory Mongoose schema (`server/src/models/Memory.ts`)
- [x] Cloudinary multi-file upload route (`server/src/routes/upload.ts`)
- [x] Album CRUD routes (`server/src/routes/albums.ts`)
- [x] Memory CRUD & comment routes (`server/src/routes/memories.ts`)
- [x] Mount new routes in backend index.ts
- [x] MasonryGrid component for Pinterest gallery (`client/components/ui/MasonryGrid.tsx`)
- [x] ImageUpload file uploader component (`client/components/ui/ImageUpload.tsx`)
- [x] Polaroid memory card with spring tilts (`client/components/memories/MemoryCard.tsx`)
- [x] Horizontal scroll album selectors and dialog (`client/components/memories/AlbumTabs.tsx`)
- [x] Memories list page with search & filters (`client/app/(main)/memories/page.tsx`)
- [x] Create memory form page (`client/app/(main)/memories/new/page.tsx`)
- [x] Memory detail page with carousel & comments (`client/app/(main)/memories/[id]/page.tsx`)

## Verification
- [x] `server` compilation check passes (`npx tsc --noEmit`)
- [x] `client` compilation check passes (`next build`)
