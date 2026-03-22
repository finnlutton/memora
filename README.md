# Memora

Memora is a photo-memory app for preserving life in structured, story-led galleries instead of an endless camera roll.

Users create:

- top-level galleries for a trip, season, event, or chapter of life
- subgalleries for places, moments, or days inside that larger story
- visual journal entries with descriptions, metadata, and photographs

The MVP is designed to feel calm, premium, editorial, and revisit-worthy.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- Framer Motion
- lucide-react
- Radix UI primitives for dialogs

## Features Included

- premium landing page
- dashboard for browsing galleries
- create, edit, and delete galleries
- create, edit, and delete subgalleries
- multi-photo upload with drag-and-drop
- local image previews stored as data URLs
- cover photo selection
- photo caption editing
- photo reordering inside subgallery edit flow
- horizontal draggable subgallery carousel
- responsive subgallery detail page
- elegant lightbox with keyboard navigation
- preloaded demo content on first launch
- local persistence via `localStorage`

## Project Structure

```text
app/
  galleries/
    [galleryId]/
      edit/
      subgalleries/
  globals.css
  layout.tsx
  page.tsx
components/
  providers/
  ui/
  app-shell.tsx
  gallery-form.tsx
  subgallery-form.tsx
  subgallery-carousel.tsx
  photo-grid.tsx
  lightbox-viewer.tsx
hooks/
  use-memora-store.tsx
lib/
  demo-data.ts
  file.ts
  utils.ts
types/
  memora.ts
public/
  demo/
```

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Create a production build:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

## Persistence Model

This MVP uses browser `localStorage` for both:

- gallery and subgallery metadata
- uploaded images stored as base64 data URLs

That makes the app fully local and easy to demo without backend setup, but it is not intended for large real-world image libraries yet.

The storage key lives in the in-browser store:

- `memora::galleries:v1`

If the key does not exist on first launch, the app seeds demo content automatically.

## How To Swap To A Real Backend Later

The app is already separated so storage can be replaced without rewriting the UI.

Current boundaries:

- shared data types: [`types/memora.ts`](/Users/owner/Documents/memora-app/types/memora.ts)
- demo seed data: [`lib/demo-data.ts`](/Users/owner/Documents/memora-app/lib/demo-data.ts)
- client-side persistence and CRUD logic: [`hooks/use-memora-store.tsx`](/Users/owner/Documents/memora-app/hooks/use-memora-store.tsx)
- image file conversion helpers: [`lib/file.ts`](/Users/owner/Documents/memora-app/lib/file.ts)

To migrate to Supabase, Firebase, or another backend:

1. Replace the CRUD logic in [`hooks/use-memora-store.tsx`](/Users/owner/Documents/memora-app/hooks/use-memora-store.tsx) with API-backed queries and mutations.
2. Store uploaded files in object storage instead of base64 strings.
3. Keep the current components and route structure; they already consume a clean gallery/subgallery model.
4. Optionally move demo seeding to a server bootstrap or onboarding flow.

## Customization

Color palette and visual feel:

- update CSS variables in [`app/globals.css`](/Users/owner/Documents/memora-app/app/globals.css)

Typography:

- update the font stacks in [`app/globals.css`](/Users/owner/Documents/memora-app/app/globals.css)

Demo content:

- edit the seeded galleries in [`lib/demo-data.ts`](/Users/owner/Documents/memora-app/lib/demo-data.ts)

Illustration-style demo imagery:

- replace or expand the artwork in [`public/demo`](/Users/owner/Documents/memora-app/public/demo)

## Notes

- The `build` script uses Webpack for reliable offline builds in restricted environments.
- Uploaded images stay in the browser for the current device only.
- Resetting demo data from the dashboard replaces current local data with the seeded collections.
