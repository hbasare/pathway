---
name: pathways-testing-standard
description: Testing guidelines and instructions for E2E and logical isolation verification on Pathways. Use this skill when implementing new features, API endpoints, or schema modifications to ensure correct multi-tenant scoping and test coverage.
---

# Pathways Testing Standard Skill

This skill outlines the standard operating procedures for writing and running automated unit and integration tests, as well as executing manual/visual E2E verification flows.

## Procedures

### 1. Automated Integration Tests (Vitest)
When developing new features:
1. Ensure schema modifications are pushed using `pnpm --filter @workspace/db run push-force`.
2. Open or create a test suite (such as `artifacts/api-server/src/lib/multitenancy.test.ts`).
3. Add cases testing access control under different roles:
   * Standard user (blocked from other tenants' resources)
   * System admin (unrestricted in global view)
   * System admin (restricted to active context when context-switched)
4. Execute tests by setting the database URL:
   `$env:DATABASE_URL="YOUR_NEON_DATABASE_URL" npx pnpm test`

### 2. E2E Browser Testing Flow
When verifying frontend user experience and context-switching:
1. Start the backend: `$env:DATABASE_URL="..." npx pnpm --filter @workspace/api-server dev`
2. Start the frontend: `$env:PORT="3000" $env:BASE_PATH="/" npx pnpm --filter @workspace/theory-of-change dev`
3. Launch a browser agent to verify:
   * Login credentials check (`admin-henry` / `Adminpassword123`).
   * Switch Context navigation to update session profile.
   * Scoped data verification on dashboard.
   * Context clearing and logout flow check.

### 3. Branching & Deployment Flow
All changes, updates, or enhancements must be implemented in the `feature/multi-tenancy` branch for review and approval before being merged to `main` and deployed to production:
1. Implement and test features entirely on the `feature/multi-tenancy` branch.
2. Verify all tests pass locally.
3. Submit changes to the user for review and explicit approval.
4. Only merge changes into `main` and push to remote `origin` after receiving approval.

