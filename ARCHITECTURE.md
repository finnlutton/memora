# Memora Architecture

> **Purpose:** This file is the future product and backend reference only.
>
> - Do **not** broadly rename or refactor the current frontend implementation.
> - Do **not** change existing routes, components, store shape, or internal terminology unless explicitly instructed.
>
> Use this document to: (1) document the target model, (2) create future-facing backend/domain types (see `lib/domain-types.ts`), and (3) guide future backend work.

---

## Overview

Memora is a photo-memory app designed to help people organize meaningful experiences into a clear hierarchy:

- **Gallery** → the broader experience, trip, life period, or event
- **Scene** → a specific part of that broader context
- **Photo** → the individual images within a scene

A Gallery can represent anything composed of multiple Scenes, such as:
- a trip
- a semester abroad
- a season of life
- a year
- a wedding
- a summer
- a broader event made up of distinct parts

A Scene represents a distinct segment within that broader context. For example:
- if the Gallery is **Abroad**, the Scenes might be different weekends or places visited
- if the Gallery is **Summer 2026**, the Scenes might be beach weekends, birthdays, or specific trips
- if the Gallery is **Olympics Trip**, the Scenes might be different cities, days, or major experiences

Photos are the actual image files contained within each Scene.

The product is designed to preserve context, not just store files.

---

## Core Product Principles

- Memories should be organized by context, not dumped into an endless feed
- Galleries are broad containers for meaningful experiences
- Scenes break a Gallery into understandable parts
- Photos live inside Scenes
- Metadata is optional, but available wherever it adds meaning
- User content is private by default
- Shared access is view-only unless explicitly expanded later
- Users should always be able to view their own existing content, even after cancellation
- The product should remain simple and focused; overbuilt features should be avoided early

---

## Core Hierarchy

### 1. Gallery
A Gallery is the highest-level container in Memora.

It represents the full experience or broader context and may include:
- a trip
- a season
- a year
- a major event
- a chapter of life

A Gallery contains multiple Scenes.

### 2. Scene
A Scene is a distinct part of a Gallery.

A Scene may represent:
- a place
- a weekend
- a day
- a part of a trip
- a specific event within a larger event
- any meaningful segment of the broader Gallery

A Scene belongs to exactly one Gallery.

A Scene contains multiple Photos.

### 3. Photo
A Photo is the lowest-level media object in Memora.

A Photo belongs to exactly one Scene.

Photos are ordered within a Scene.

---

## Data Model

## User

A User represents a Memora account holder.

### User fields
- `id`
- `email`
- `display_name`
- `created_at`
- `updated_at`
- `auth_provider`
- `plan_tier`
- `active_gallery_limit`
- `active_gallery_count`
- `credits_balance`
- `subscription_status`

### Notes
- A User can authenticate via email/password
- A User can also authenticate via Google or Apple
- A User owns their Galleries
- A User may have a paid plan and/or credits
- A User may continue to view existing content after cancellation, but may lose editing and sharing capability depending on status

---

## Gallery

A Gallery is the top-level memory container.

### Gallery fields
- `id`
- `user_id`
- `title`
- `description`
- `cover_image_url`
- `start_date`
- `end_date`
- `locations`
- `people`
- `mood_tags`
- `privacy`
- `created_at`
- `updated_at`
- `archived_at` (optional, if used later)
- `share_status`

### Gallery rules
- Each Gallery belongs to exactly one User
- Each Gallery contains many Scenes
- Galleries are private by default
- Galleries may later be shared through invitation links
- If a Gallery is shared, invited viewers can view all Scenes and Photos within it
- Shared viewers cannot edit any part of the Gallery

### Notes
All Gallery metadata should be optional except for the minimum required fields to create one.

---

## Scene

A Scene is a distinct segment of a Gallery.

### Scene fields
- `id`
- `gallery_id`
- `title`
- `location`
- `date_label`
- `description`
- `cover_image_url`
- `sort_order`
- `created_at`
- `updated_at`

### Scene rules
- Each Scene belongs to exactly one Gallery
- Each Scene contains many Photos
- Scenes should be ordered within a Gallery using `sort_order`
- Scene metadata should be optional except for the minimum required fields to create one

### Notes
A Scene is intended to represent a meaningful piece of the larger Gallery, not just a folder.

---

## Photo

A Photo is an image within a Scene.

### Photo fields
- `id`
- `scene_id`
- `image_url`
- `sort_order`
- `created_at`
- `updated_at`

### Photo rules
- Each Photo belongs to exactly one Scene
- Photos should be ordered within a Scene using `sort_order`
- Photos are images only for the current version of Memora
- Video is not part of the current architecture and should not be built into the initial product

---

## Sharing Model

### Default behavior
- All user content is private by default

### Shared Gallery behavior
- Users may share specific Galleries using invitation links
- Shared viewers can view the full contents of that Gallery:
  - Gallery metadata
  - all Scenes
  - all Photos
- Shared viewers cannot:
  - edit Gallery metadata
  - create Scenes
  - edit Scenes
  - reorder content
  - upload Photos
  - delete anything

### Ownership and permissions
- Only the owner of a Gallery can edit it
- Only the owner of a Gallery can create or modify Scenes and Photos within it
- View access does not imply edit access

---

## Authentication Model

Memora should support the following authentication methods:

- Email and password
- Google login
- Apple login

### Authentication requirements
- Users must be able to sign up
- Users must be able to sign in
- Users must be able to sign out
- Users must be able to reset passwords for email/password accounts
- Authentication must map each Gallery, Scene, and Photo to the correct User

---

## Monetization Model

Memora uses an annual plan structure based on the number of **active Galleries** a user can maintain.

### Plan tiers
- **5 active galleries** — `$19/year`
- **20 active galleries** — `$49/year`
- **35 active galleries** — `$79/year`

### Effective annual price per active gallery
- 5 for $19 → `$3.80 per gallery/year`
- 20 for $49 → `$2.45 per gallery/year`
- 35 for $79 → `$2.26 per gallery/year`

### Product logic
- Users pay for the number of active Galleries they can maintain
- Lower tiers support fewer active Galleries
- Higher tiers reduce the effective per-gallery cost
- Credits may be used in the future to:
  - maintain existing Galleries as active
  - unlock new Galleries
  - preserve edit/share capability on specific Galleries

### Important note
Detailed payment integration and billing implementation are future work. This architecture defines the intended product behavior, not the full billing system design.

---

## Active vs Inactive Gallery State

Memora should distinguish between:
- **active galleries**
- **inactive galleries**

### Active Gallery
An active Gallery can be:
- viewed
- edited
- shared
- updated with new Scenes and Photos

### Inactive Gallery
An inactive Gallery can be:
- viewed by the owner

An inactive Gallery cannot be:
- edited
- shared
- updated

### Why this matters
This allows pricing and credits to be tied to maintaining a Gallery as “active,” while still preserving access to old memories.

---

## Cancellation Rules

If a user cancels their plan:

### They should still be able to:
- log into their account
- view their existing Galleries, Scenes, and Photos
- maintain their account identity

### They should not be able to:
- edit their content
- share their Galleries
- create new active Galleries beyond what their current account state allows

### Product intention
Memora should never hold memories hostage, but it should reserve editing and sharing functionality for active paid usage.

---

## Metadata Rules

Memora should support rich optional metadata, without requiring all users to fill everything in.

### Gallery-level metadata
Optional:
- title
- description
- cover image
- start date
- end date
- locations
- people
- mood tags
- privacy

### Scene-level metadata
Optional:
- title
- location
- date label
- description
- cover image
- sort order

### Photo-level metadata
Required / core:
- image file
- sort order

No additional Photo metadata is required in the current version.

---

## Ownership Rules

- Every Gallery belongs to one User
- Every Scene belongs to one Gallery
- Every Photo belongs to one Scene
- Users can only edit their own content
- Shared viewers can only view content, never edit it
- All data relationships should enforce ownership and access rules

---

## Product Scope for Initial Real Version

The initial real version of Memora should support:

- user accounts
- login/signup
- email/password + Google/Apple sign-in
- Gallery creation
- Scene creation
- Photo upload
- Photo ordering within a Scene
- Scene ordering within a Gallery
- optional metadata at Gallery and Scene levels
- private-by-default content
- invitation-link sharing for specific Galleries
- view-only shared access
- annual plan tiers based on active Gallery count
- cancellation behavior that preserves view access but removes edit/share capability

---

## Non-Goals for the Initial Real Version

The initial real version should **not** overbuild beyond the core product.

Not required yet:
- video support
- comments
- collaborative editing
- public discovery feed
- social networking features
- AI-generated captions
- advanced analytics dashboards
- complex role-based team permissions
- overcomplicated billing logic beyond plan tiers and future credit compatibility

---

## Summary

Memora is a structured memory product built around three levels:

- **Gallery** = the broader context
- **Scene** = the meaningful parts within that context
- **Photo** = the actual images inside each Scene

The product should prioritize:
- context
- clarity
- privacy
- thoughtful organization
- simple, durable ownership rules

The architecture should support a real product with:
- authenticated users
- persistent storage
- optional metadata
- private-by-default content
- simple sharing
- annual plans based on active Galleries
- the ability to view memories even after cancellation