# Main Menu

**Affordable, intuitive restaurant menu design for everyone — no Photoshop prick required.**

## The Problem

Restaurant owners need to update their menus frequently (prices change, items rotate, specials come and go), but the current process is expensive, slow, and dependent on designers. Main Menu puts the power back in their hands with an intuitive builder that outputs beautiful, custom-sized HTML menus displayed on in-house TVs and monitors.

## The Vision

A SaaS platform where restaurant subscribers can **create, customize, and publish digital menu pages** through an intuitive web interface. The output is a styled HTML page tailored to their display's exact dimensions — hosted on our platform, rendered on their screens.

### Two Workflows

- **Wizard Mode** — A step-by-step guided flow for non-technical users ("luddites"). Walk them through choosing a template, setting dimensions, adding categories and items, customizing colors/fonts, and publishing.
- **Pro Mode** — A more direct, dashboard-style editor for power users who want full control and faster iteration.

## Core Features

### Menu Content
- **Categories & Sections** — Appetizers, Entrees, Desserts, Drinks, etc.
- **Menu Items** — Name + price, with optional descriptions
- **Food Photos & Images** — Upload and position images for items or sections
- **Restaurant Branding** — Logo, custom colors, fonts
- **Dietary Icons** — Vegan, gluten-free, spicy, nut-free, etc.
- **Daily Specials / Rotating Items** — Easy to swap in and out
- **QR Codes** — Link to online ordering, website, socials, etc.
- **Animations** — Optional transitions and effects for digital displays

### Display & Output
- **Custom Dimensions** — Fit any TV or monitor (16:9, 4:3, portrait, landscape, custom resolution)
- **Multi-Page Support** — Multiple pages/slides with auto-rotation for larger menus
- **Platform-Hosted** — Subscribers get a URL; menus are served from our infrastructure
- **Subscription-Gated** — Menu URLs are tied to active subscriptions to prevent self-hosting bypass

### Templates & Theming
- **Pre-built Starter Templates** — Professional designs to start from
- **Full Customization** — Colors, fonts, layouts, backgrounds
- **Live Preview** — See changes in real time before publishing

### Subscription & Auth
- **User Authentication** — Sign up, log in, manage account
- **OAuth (Planned)** — Google, Facebook, Microsoft, Apple login via Passport.js
- **Stripe Integration** — Subscription tiers with payment processing
- **Tier-Based Features** — Free trial → paid tiers with increasing capabilities

## Prerequisites

- **Node.js ≥ 20** — Required by Vite and better-sqlite3. Check with `node --version`.

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | Vue.js                              |
| Backend     | Node.js + Express                   |
| Payments    | Stripe                              |
| Database    | SQLite (simple, zero-cost, portable)|
| Hosting     | Self-hosted (to start)              |

### Why SQLite?
Zero infrastructure cost, no separate database server, single-file database that's easy to back up and migrate. When the subscriber base outgrows it, we can migrate to Postgres with minimal changes.

### Self-Hosting Strategy
Run the full stack on a single machine (or cheap VPS) to start. Node.js serves both the builder UI and the published menu URLs. No cloud services beyond Stripe for payments.

## Architecture

### Key Design Decisions

1. **Published Snapshot Model** — Editors work on draft data. On publish, the system compiles a versioned snapshot (HTML/CSS + asset refs). Displays serve the frozen snapshot, not live editor tables — so editing never breaks a running screen.

2. **Templates as Files** — Template HTML/CSS lives on disk in source control. The database stores only template metadata and per-menu customization JSON. Easy to version, test, and diff.

3. **Local Entitlement Checks** — Stripe webhooks update a local `subscriptions` table. Menu serving checks local status — no runtime Stripe API calls, no fragile JS heartbeats.

4. **Prices as Integer Cents** — Stored as integers to avoid floating-point issues.

5. **Image Security Pipeline** — Validate actual file type (not just extension), re-encode server-side, strip EXIF metadata, randomize filenames, enforce size/dimension limits and per-account quotas.

### Server Routes

| Route | Purpose |
|---|---|
| `/api/auth` | Registration, login, JWT sessions |
| `/api/menus` | Draft CRUD (restaurants, menus, pages, categories, items) |
| `/api/publish` | Compile draft → published snapshot |
| `/api/templates` | List and preview templates |
| `/api/uploads` | Image uploads (re-encoded, EXIF-stripped) |
| `/api/stripe` | Stripe webhooks for subscription events |
| `/menu/:slug` | Serve published snapshot (subscription-gated) |

### Server Directories

| Directory | Purpose |
|---|---|
| `/uploads/` | User images (re-encoded server-side) |
| `/templates/` | Template files (source-controlled) |
| `/published/` | Compiled menu snapshots |

### Database Schema

- **users** — id, email, password_hash, stripe_customer_id, created_at
- **subscriptions** — id, user_id, stripe_subscription_id, plan, status, current_period_end
- **restaurants** — id, user_id, name, logo_url, slug (globally unique)
- **menus** — id, restaurant_id, name, template_id, width_px, height_px, settings_json, status (draft/published)
- **menu_pages** — id, menu_id, page_order, transition_type, duration_seconds
- **menu_categories** — id, menu_page_id, name, sort_order, style_json
- **menu_items** — id, category_id, name, description, price_cents (integer), image_url, dietary_tags, is_special, sort_order
- **templates** — id, name, description, thumbnail_url, file_path, default_settings_json
- **published_snapshots** — id, menu_id, version, html_content, assets_json, published_at

## Roadmap

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Foundation — scaffolding, DB schema, auth | 🚧 In Progress |
| 2 | Basic builder + first template + publish flow | ⬚ Planned |
| 3 | Stripe + subscription gating | ⬚ Planned |
| 4 | Rich content — images, icons, specials, QR | ⬚ Planned |
| 5 | Wizard + Pro mode workflows | ⬚ Planned |
| 6 | Advanced — animations, multi-page rotation, more templates | ⬚ Planned |

## Project Status

🚧 **Phase 1** — Building foundation (scaffolding, database, auth).