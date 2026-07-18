# Project Rules & Customizations

## 🧪 E2E & Integration Testing Standards

To maintain high stability and data isolation standards within the Pathways multi-tenant architecture, the following testing rules must be strictly adhered to:

1. **Logical Isolation Testing**: Any new API endpoint, database schema modification, or feature change must be covered by automated integration tests (using Vitest) verifying data isolation boundaries. Users must never be able to access or mutate records belonging to other tenants.
2. **Global Admin Context Switching**: Features introducing role-based capabilities must be validated for all user profiles:
   * **Tenant Manager/Members**: Verified to operate only within their assigned `orgId`.
   * **System Admin (Master View)**: Verified to bypass scoping filters and operate globally across all database records when no organization context is active.
   * **System Admin (Switched View)**: Verified to switch context and restrict operations specifically to the active tenant's context boundaries.
3. **Continuous Execution**: The test suite must be kept clean, and all tests must be run using `$env:DATABASE_URL="..." npx pnpm test` before committing any changes.

## 🌿 Branching & Deployment Strategy

To ensure safe review, manual alignment, and validation before pushing to production:

1. **Development Branch**: All new features, changes, updates, or enhancements must be implemented on the `feature/multi-tenancy` branch.
2. **Review & Approval**: Once changes are implemented, they must be tested and verified locally for review and user approval.
3. **Merging & Deployment**: Changes must **never** be committed or pushed directly to `main`. After receiving explicit user approval, changes can be merged into `main` and pushed to the remote repository to trigger deployment to Germany production.
