# Pathways: Full-Stack Theory of Change & Systems Change Platform

Pathways is a full-stack monorepo application designed for planning, tracking, modeling, and reporting on complex market development and social impact interventions (Theories of Change). It incorporates frameworks like M4P (Making Markets Work for the Poor) and systemic change analysis (AAER, MSR, OH).

---

## 📑 Core Overview & Domain Concepts

The platform organizes data into high-level groupings and details them down to individual causal connections:

1. **Portfolio**: A collection of interventions grouped by donor, program, or geographic region. Offers rolled-up indicators, logframes, and map views.
2. **Theory of Change (Intervention)**: A single planning project that maps out expected social impacts. Contains the following sub-views and analytics:
   * **About**: Intervention metadata (manager, sector, strategy, partners, Women's Economic Empowerment (WEE) and climate-smart targets).
   * **Locations**: GIS-based map detailing coordinate pins, administrative levels, and gender-disaggregated beneficiary counts.
   * **Market System**: The M4P "doughnut" model mapping supporting functions, rules, and core functions.
   * **Business Model**: A grid analyzing private sector actors and their expected behavior changes.
   * **Canvas**: An interactive flowchart diagram where components (Inputs, Activities, Outputs, Outcomes, Impacts) are positioned and connected with causal arrows.
   * **Notes & Updates**: A manual, chronological journal kept by the project managers.
   * **Risk Analysis**: A risk register tracking risk descriptions, likelihoods, and mitigation strategies.
   * **Change Log**: A security-compliant audit trail logging every creation, modification, and deletion.

---

## 🛠️ Technology Stack

* **Monorepo Architecture**: `pnpm` workspaces
* **Runtime**: Node.js v24
* **Language**: TypeScript v5.9
* **Frontend**: React + Vite, Tailwind CSS, shadcn/ui components, `react-xarrows` (for canvas connections), `framer-motion` (animations), `wouter` (routing)
* **Backend**: Express 5
* **Database**: PostgreSQL (Neon Serverless) + Drizzle ORM
* **Validation**: Zod + `drizzle-zod`
* **API Code Generation**: Orval (generates React Query hooks and client types from `openapi.yaml`)
* **Build Engine**: `esbuild` (API server bundle), Vite (Frontend static compilation)

---

## 🏛️ Architecture & Component Design

### 1. Monorepo Project Structure
```text
pathway/
├── artifacts/              # Deployable Applications
│   ├── api-server/         # Express API Backend
│   └── theory-of-change/   # React + Vite Frontend
├── lib/                    # Shared Libraries
│   ├── api-spec/           # OpenAPI Specification (`openapi.yaml`)
│   ├── api-client-react/   # Generated React Query API hooks
│   ├── api-zod/            # Generated Zod verification schemas
│   └── db/                 # Drizzle ORM models, schemas, and DB pool
├── screenshots/            # Mockup assets and visual diagrams
└── package.json            # Root workspaces configuration
```

### 2. Frontend Routing & Auth Flow
* **Routing**: Managed in `App.tsx` via `wouter`. Routes are segmented by authentication status.
* **Authentication**: Managed via `auth-context.tsx` (`useAuth`). It queries the backend `/setup/status` first.
  * If the database has no organization records, the client is redirected to `/setup` to initialize the app.
  * If the user is unauthenticated, they are redirected to `/login`.
  * If authenticated, it loads the main layout and dashboard.

### 3. Backend Security & CORS
* **CORS Middleware**: Implemented in `app.ts` using `cors`. In production, it dynamically validates the `Origin` header. It permits:
  * Local hosts (`localhost`)
  * Replit preview domains (`.replit.dev`, `.repl.co`)
  * Vercel domains (`.vercel.app`)
* **Security Headers**: Managed by `helmet`. Content Security Policy (CSP) and Cross-Origin Embedder Policy (COEP) are disabled to support Vite Hot Module Replacement (HMR) and browser development tools.
* **Sessions**: Persistent user sessions are managed using `express-session` backed by a PostgreSQL session store (`connect-pg-simple`).

---

## 🚀 Production Deployment Configuration

Pathways is optimized for European deployment using the following free-tier cloud structure:

### 1. Database (Neon - Frankfurt)
Create a PostgreSQL database inside **Frankfurt (`eu-central-1`)** and run the Drizzle schema migrations from your developer console:
```powershell
$env:DATABASE_URL="YOUR_NEON_DATABASE_URL"; npx pnpm --filter @workspace/db run push
```

### 2. Backend Server (Render - Frankfurt)
Deploy the root repository as a **Node Web Service** in the **Frankfurt (EU)** region:
* **Build Command**: `pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server build`
* **Start Command**: `pnpm --filter @workspace/api-server start`
* **Required Environment Variables**:
  * `DATABASE_URL`: Connection string to Neon database.
  * `NODE_ENV`: `production`
  * `SESSION_SECRET`: A secure cryptographically random string.
  * `AI_INTEGRATIONS_OPENAI_BASE_URL`: `https://api.openai.com/v1`
  * `AI_INTEGRATIONS_OPENAI_API_KEY`: OpenAI API Key.

### 3. Frontend App (Vercel)
Deploy the root repository to **Vercel** with the root directory set to `artifacts/theory-of-change`:
* **Build Command**: `pnpm run build`
* **Output Directory**: `dist/public`
* **Environment Variables**: `PORT=3000`, `BASE_PATH=/`
* **API Proxy Rewrite (`vercel.json`)**:
  Vercel handles client-side routing and rewrites all API requests server-side to the live Render backend, bypassing CORS constraints:
  ```json
  {
    "rewrites": [
      {
        "source": "/api/:path*",
        "destination": "https://pathways-backend-sf1f.onrender.com/api/:path*"
      }
    ]
  }
  ```
