# RelatioApp

> Interactive **family tree** and **org chart** builder — *one chart engine, many visual personalities.*

RelatioApp is a full-stack chart editor for organizing people and roles on a canvas. Build a family tree or an org chart, link people by dragging and dropping, restyle the entire chart through swappable themes, and export the result as a polished PNG.

---

## ✨ Features

**Chart editing**
- Two chart modes per chart: **Family tree** and **Org chart** (switch anytime).
- Drag cards to reposition; drop a card **onto** another to reparent, or **beside** a card in family mode to link a **partner/spouse**.
- Reconnect relationships by dragging the edge handles at a card's top/bottom.
- Double-click a name to rename inline; add roles/relationships, notes, levels, and photos.
- Auto layout (tiered Reingold–Tilford style with spouse alignment) and reset.

**Node cards**
- Relationship-aware cards in Cute Pastel: tinted card background + 4px accent strip per relationship type (grandparent, parent, spouse, child, sibling, manager, report).
- Circular avatars: show an **uploaded photo**, with colored-initials as the fallback — one renderer, consistent 44px treatment everywhere (canvas + exports).
- Three content lines: name, role/relationship with a persona icon, and a note/trait/level line.

**Themes ("one chart engine, many personalities")**
- Token-based theme layer (CSS custom properties) with six personalities: **Cute Pastel** (default), **Professional**, **Minimal**, **School / Playful**, **Project Team / Tech**, and **Dark Neon**.
- Slide-in **Appearance panel** with live per-theme previews.
- Per-theme canvas decorations (botanical leaves, doodles, circuit traces, neon glows, dot grid) that are **margin-safe** — they track the tree's bounding box and are excluded from exports.

**Export**
- Export the chart as **PNG** at 2× pixel density with a tight crop around the tree.
- Framed “card” output (rounded, soft shadow, chart title) or **transparent** background.
- File name follows the theme: `{chart-name}-{theme-name}.png`.

**Backend & data**
- Charts and nodes persisted via an ASP.NET Core API + PostgreSQL (soft-delete based).
- Reference org + family charts are auto-seeded on first load.
- Uploaded photos are stored and served by the API.

---

## 🧱 Tech stack

| Layer | Tech |
|---|---|
| API | .NET 10 / ASP.NET Core, Clean Architecture (Domain · Application · Infrastructure · API), EF Core + PostgreSQL, JWT auth, Swagger |
| Client | React 18, TypeScript, Tailwind CSS 4, Vite, Axios, `html-to-image` (PNG export) |
| Infra | Docker Compose (Postgres + API + client), Railway/Vercel deployment targets |

```
relatioapp/
├── api/        → ASP.NET Core API (Clean Architecture, src/RelatioApp.{Domain,Application,Infrastructure,API})
├── client/     → React 18 + TypeScript frontend (src/features/tree = chart engine & themes)
├── .clinerules → Cline rules (root scope)
├── .cline/ .claude/ agent_docs/ → coding standards & docs (Cline/Claude)
└── docker-compose.yml
```

---

## 🚀 Getting started

### 1. Configure environment
```bash
cp .env.example .env
```
Fill in the required values — at minimum `DB_PASSWORD`, `JWT_SECRET`, and the `BOOTSTRAP_ADMIN_*` account. Defaults: API on `8080`, client on `3000` (see `.env.example` for all keys).

### 2. Run everything (Docker)
```bash
docker compose up --build
```
- App: <http://localhost:3000>
- API / Swagger (dev): <http://localhost:8080/swagger>

On first load the API seeds a sample **org chart** and a sample **family tree**.

### 3. Local development (no Docker)
```bash
# API (needs a running Postgres and the .env connection values)
cd api
dotnet run --project src/RelatioApp.API

# Client (separate terminal)
cd client
npm install
npm run dev          # http://localhost:5173
```
For the client outside Docker, set `VITE_API_BASE_URL` to the API origin (e.g. `http://localhost:8080/api`) in `.env`/`.env.local`.

---

## 🛠 Daily commands

| Task | Command |
|---|---|
| Run everything | `docker compose up --build` |
| API only | `cd api && dotnet run --project src/RelatioApp.API` |
| Client only | `cd client && npm run dev` |
| Add an EF migration | `cd api && ./migrate.sh MyMigrationName` |
| Verify client | `cd client && npm run typecheck && npm run build` |
| Verify API | `cd api && dotnet build` |

---

## 🔐 Configuration & hygiene

- **Secrets live only in `.env`** — the file is gitignored and never committed. `.env.example` documents every key (leave values blank there).
- Local photo uploads are written to `uploads/` (gitignored); Docker uses the named `uploads_data` volume.
- Coding rules for the AI agents (Cline/Claude) live in `.clinerules`, `.cline/`, `.claude/`, and `agent_docs/`; they cover architecture, soft delete, pagination, searchable dropdowns, and git workflow.
