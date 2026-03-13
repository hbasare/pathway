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

### Theory of Change Platform

A full-stack platform for building and managing theories of change.

**Features:**
- Create and manage multiple theories of change (projects)
- Add components of 5 types: Input, Activity, Output, Outcome, Impact
- Connect components with arrows to show causal pathways
- Visual canvas showing the flow across all 5 stages
- Each component tracks: title, description, indicators (metrics), assumptions
- Sidebar navigation between theories

**Frontend artifact:** `artifacts/theory-of-change` (React + Vite, Tailwind, shadcn/ui, react-xarrows)
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

- Routes: `health.ts`, `theories.ts` (theories, components, connections CRUD)

### `artifacts/theory-of-change` (`@workspace/theory-of-change`)

React + Vite frontend for the Theory of Change platform. Uses shadcn/ui components, react-xarrows for connection arrows, framer-motion for animations.

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. 

**Schema:**
- `theoriesTable` — theories of change
- `componentsTable` — components (input/activity/output/outcome/impact) belonging to a theory
- `connectionsTable` — directed connections between components

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec (`openapi.yaml`) and Orval codegen config. 

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` + `lib/api-client-react`

Generated from OpenAPI spec. Zod schemas for backend validation, React Query hooks for frontend data fetching.
