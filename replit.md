# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── theory-of-change/   # React + Vite frontend (Theory of Change platform)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Applications

### Theory of Change ("Pathways") Platform

A full-stack Theory of Change / M4P / Systems Change platform for planning, tracking, and reporting on interventions (theories), grouped into portfolios.

**Core concepts:**
- **Portfolio** — a grouping of theories/interventions (e.g. by donor, program, or region), with roll-up logframes and maps.
- **Theory (intervention)** — a single Theory of Change project. Has a canvas of components connected by causal arrows, plus a set of analysis tabs (see below).
- **Component** — a node on the canvas: one of Input, Activity, Output, Outcome, Impact (plus "Opportunity"), each with title, description, indicators, and assumptions.
- **Connection** — a directed arrow between two components showing a causal pathway.

**Roles:** Evaluation Manager (`manager`), `senior_manager`, `member`, `auditor`, `donor` — each with different read/write scope (see Auth system below). Donors are redirected to a summary-only view.

#### Theory detail page — tabs

`artifacts/theory-of-change/src/pages/theory-detail.tsx` (`/theory/:id`) hosts a tab bar with:

1. **About** (`about-intervention.tsx`) — manager, sector, strategy, partners, WEE (Women's Economic Empowerment) and climate-smart targets, and other descriptive metadata for the intervention.
2. **Locations** (`locations-map.tsx`) — GIS mapping of activity/beneficiary locations (admin levels, coordinates, gender-disaggregated beneficiary counts).
3. **Market System** (`market-system.tsx`) — M4P "doughnut" model analysis: Core function, Supporting Functions, and Rules, each with editable elements.
4. **Business Model** (`business-model.tsx`) — private-sector actors and their expected behavior changes.
5. **Canvas** (`theory-canvas.tsx`) — the interactive Theory of Change diagram: components positioned on a canvas, connected with arrows (`react-xarrows`) across the 5 stages.
6. **Notes & Updates** (`notes-updates.tsx`) — a chronological, freeform log of activity changes/updates (manually entered by users, separate from the automatic Change Log).
7. **Risk Analysis** (`risk-analysis.tsx`) — a risk register: risk description, likelihood (%), mitigation strategy, notes.
8. **Change Log** (`change-log.tsx`) — **automatic audit trail** of every create/update/delete made anywhere within this intervention (see "Change Log feature" below).

Other intervention-scoped pages (linked from the detail page or sidebar): `measurement-plan.tsx` (indicator targets/actuals/baselines per component), `support-calculations.tsx` (multi-year indicator breakdowns), `systemic-change.tsx` (AAER / MSR / OH / MSC framework entries, with AI-assisted analysis via `chat.ts`), `summary.tsx` (read-only/donor-facing executive summary).

Portfolio-level pages: `dashboard.tsx` (list of portfolios/theories, create new theory/portfolio), `portfolio-logframe.tsx` / `program-logframe.tsx` (roll-up logframes across theories in a portfolio), `portfolio-locations.tsx` (map aggregating all theories' locations in a portfolio).

Admin/auth pages: `login.tsx`, `signup.tsx`, `setup.tsx` (first-run org + manager account creation), `user-management.tsx` (add/remove members, reset passwords, promote/demote roles, assign members to specific theories).

#### Change Log feature

Tracks every edit made by any user, across the whole app, and displays the history per-intervention.

- **Schema** — `changeLogTable` (`lib/db/src/schema/theories.ts`): `id`, `theoryId`, `userId`, `username`, `displayName`, `action` (`create`/`update`/`delete`), `entityType` (e.g. `theory`, `component`, `connection`, `indicator`, `note`, `risk`, `location`, `market_system`, `market_system_element`, `business_model_actor`, `systemic_change`, `document`), `entityLabel` (human-readable label of the affected record), `summary` (optional freeform description), `createdAt`.
- **Backend** — `artifacts/api-server/src/lib/changelog.ts` exports `logChange(req, params)`, a fire-and-forget helper (never throws — wraps its insert in try/catch so a logging failure never breaks the underlying request) that all write routes call after a successful create/update/delete. It reads the acting user from `req.session` to populate `userId`/`username`/`displayName`.
- Wired into every mutating route: theories, components, indicators, connections, risk analyses, notes/updates (`theories.ts`), locations (`locations.ts`), market systems + elements (`market-systems.ts`), systemic change entries (`systemic-change.ts`), business model actors (`business-model.ts`), documents (`theory-documents.ts`).
- **API** — `GET /theories/:theoryId/change-log` (in `theories.ts`) returns entries newest-first (`ORDER BY created_at DESC`). Defined in `lib/api-spec/openapi.yaml` (`ChangeLogEntry` schema, operation `listTheoryChangeLog`); frontend hook `useListTheoryChangeLog` generated via Orval.
- **Frontend** — `artifacts/theory-of-change/src/components/theory/change-log.tsx` renders entries grouped by day, each showing the actor's display name, an action description (uses `entry.summary` if present, otherwise falls back to `"<actor> <action> <entityType> \"<entityLabel>\""`), and a formatted timestamp. Shows an empty state when no changes have been recorded yet.
- **Note:** the Change Log is distinct from the manual "Notes & Updates" tab — the Change Log is automatically generated and cannot be edited or deleted by users; Notes & Updates is a freeform log users write themselves.

**Auth system:**
- Routes: `GET /api/setup/status`, `POST /api/setup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- Users CRUD: `GET /api/users`, `POST /api/users`, `PATCH /api/users/:id`, `DELETE /api/users/:id`, `PATCH /api/users/:id/password`
- Sessions via `express-session` + `connect-pg-simple` (PostgreSQL session store), cookie name `pathways.sid`
- `SESSION_SECRET` stored as a Replit secret
- Middleware: `requireAuth` + `requireManager` in `src/middleware/auth.ts`
- All portfolio/theory routes scoped by `req.session.orgId` (multi-tenant by organization)
- `theory_assignments` table maps `member`-role users to the specific theories they're allowed to edit
- Frontend pages: `Login`, `Setup`, `Signup`, `UserManagement` in `artifacts/theory-of-change/src/pages/`
- Auth context: `artifacts/theory-of-change/src/contexts/auth-context.tsx`

**Frontend artifact:** `artifacts/theory-of-change` (React + Vite, Tailwind, shadcn/ui, react-xarrows for canvas connections, framer-motion for animation)
**Backend:** `artifacts/api-server` (Express 5 + Drizzle ORM + PostgreSQL)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request/response validation and `@workspace/db` for persistence.

- `health.ts` — health check
- `auth.ts` / `users.ts` — authentication, sessions, user CRUD, role management
- `theories.ts` — theories, components, connections, indicators, risk analyses, notes/updates CRUD + change-log listing
- `portfolios.ts` — portfolio groupings and logframe aggregation
- `locations.ts` — GIS data for theory and portfolio maps
- `market-systems.ts` — M4P doughnut model (market systems + elements)
- `business-model.ts` — business model actors and behavior-change tracking
- `systemic-change.ts` — AAER/MSR/OH/MSC framework entries, AI-assisted analysis
- `theory-documents.ts` — strategy document/attachment metadata
- `storage.ts` — object storage integration for file uploads
- `chat.ts` — AI chatbot for querying theory data
- `src/lib/changelog.ts` — `logChange()` helper used by all the above routes to record edits

### `artifacts/theory-of-change` (`@workspace/theory-of-change`)

React + Vite frontend for the Theory of Change platform. Uses shadcn/ui components, react-xarrows for connection arrows, framer-motion for animations. See "Theory detail page — tabs" above for the main feature breakdown.

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

**Schema (`lib/db/src/schema/`):**
- `theoriesTable` — theories of change (interventions)
- `portfoliosTable` — groupings of theories
- `componentsTable` — components (opportunity/input/activity/output/outcome/impact) belonging to a theory, with canvas position
- `connectionsTable` — directed connections between components
- `componentIndicatorsTable` — indicators per component (`name`, targetDate, targetFigure, actualDate, actualFigure, position)
- `indicatorScYearsTable` — multi-year target/actual breakdowns for support calculations
- `theoryLocationsTable` — GIS + beneficiary data (`displayName`, admin levels, coordinates, gender-disaggregated counts)
- `marketSystemsTable` / `marketSystemElementsTable` — M4P doughnut data (`title` field)
- `businessModelActorsTable` — private-sector actors (`actorName` field) and behavior changes
- `systemicChangesTable` — AAER/MSR/OH/MSC framework entries (`dimension` field)
- `theoryDocumentsTable` — file attachments (`name` field)
- `theoryRiskAnalysesTable` — risk register entries (`risk` field)
- `changeLogTable` — automatic audit trail of edits (see "Change Log feature" above)
- `usersTable` / `organizationsTable` — auth and multi-tenant structure
- `theoryAssignmentsTable` — maps `member` users to theories they may edit

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec (`openapi.yaml`) and Orval codegen config.

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` + `lib/api-client-react`

Generated from OpenAPI spec. Zod schemas for backend validation, React Query hooks for frontend data fetching.
