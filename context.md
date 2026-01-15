# ReviewScope Project Context

## Current Status
ReviewScope (formerly DiffMind/PullSentry) is an AI-powered GitHub PR Reviewer. The rebranding is complete across all packages, documentation, and logs.

## Recent Changes & Fixes

### 1. Rebranding & Architecture
- Successfully renamed the project from **DiffMind** to **ReviewScope**.
- Reverted from **Turborepo** to a **Standard npm Monorepo** due to execution issues with the Turbo binary in the local environment.
- Updated all workspace package names to `@reviewscope/*`.

### 2. Authentication & Security
- Implemented **GitHub Login** using `next-auth` (Stateless JWT strategy).
- Linked repositories to users via `github_account_id` in the `installations` table.
- Added server-side ownership verification to the Dashboard to ensure users can only view and configure their own installations.

### 3. Indexing & API Key Workflow
- **Deferred Indexing**: Automatic indexing on installation has been disabled. Indexing now only triggers after a user successfully configures their API key.
- **Verification**: Added a "Verify Key" button in the dashboard that tests the key against the provider (Gemini/OpenAI) before allowing a save.
- **UI Notifications**: Added warning banners and "Setup Required" badges to repositories missing an API key.
- **PR Feedback**: If a PR is opened without a configured API key, ReviewScope posts a comment explaining that the review was skipped.

### 4. Technical Bug Fixes
- **Auth Stability**: Added `NEXTAUTH_SECRET` to `.env` to fix `JWT_SESSION_ERROR` (decryption failures).
- **Environment Compatibility**: Switched from `tiktoken` to `js-tiktoken` to resolve `Missing tiktoken_bg.wasm` errors in the Next.js environment.
- **Network Resilience**: Added retries (3 attempts), exponential backoff, and increased timeouts (15s) to the GitHub client to handle `Connect Timeout` errors during large repo indexing.
- **Drizzle Relations**: Properly defined and exported Drizzle relations to fix `referencedTable` undefined errors during relational queries.

## Pending Issues
- **Invalid API Key Error**: Currently investigating a `[400] API key not valid` error during indexing. 
- **Debug Steps**: Added detailed logging to `apps/worker/src/lib/ai-review.ts` to confirm if the worker is correctly picking up the user's encrypted key from the database or incorrectly falling back to a server default.
