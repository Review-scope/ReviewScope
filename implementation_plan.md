# Dashboard Overhaul and Plan Logic Implementation

This plan covers the transition of the navigation from a top-bar to a sidebar-centric layout, significant UI/UX improvements with a "premium" aesthetic, and the implementation of manual repository activation with plan-based limits and swapping.

## Proposed Changes

### [Component] Global Navigation & Layout
Group files by component (e.g., package, feature area, dependency layer) and order logically (dependencies first). Separate components with horizontal rules for visual clarity.

#### [NEW] [sidebar.tsx](file:///d:/code/ReviewScope/apps/dashboard/src/components/sidebar.tsx)
- Create a modern, slim sidebar for main navigation.
- Include links: Repositories, Pricing, Settings, Support.
- Support active state highlighting and hover effects.

#### [MODIFY] [layout.tsx](file:///d:/code/ReviewScope/apps/dashboard/src/app/layout.tsx)
- Restructure the layout to incorporate the `Sidebar`.
- Use a flex container: `Sidebar` (fixed/absolute) + `Main Content` (scrollable).

#### [MODIFY] [navbar.tsx](file:///d:/code/ReviewScope/apps/dashboard/src/components/navbar.tsx)
- Remove navigation links (already moved to Sidebar).
- Reposition elements for a cleaner look (Logo + User Profile).

---

### [Component] UI Improvements
Improving the visual appeal and interactivity of core pages.

#### [MODIFY] [dashboard/page.tsx](file:///d:/code/ReviewScope/apps/dashboard/src/app/dashboard/page.tsx)
- Apply "liquid glass" effect to repo cards.
- Improve the header with vibrant gradients and better typography.
- Add micro-animations for card transitions.
- Update repo list to show activation status.

#### [MODIFY] [repositories/[id]/page.tsx](file:///d:/code/ReviewScope/apps/dashboard/src/app/repositories/[id]/page.tsx)
- Improve table styling for a premium feel.
- Add better status indicators and action buttons.

#### [MODIFY] [settings/page.tsx](file:///d:/code/ReviewScope/apps/dashboard/src/app/settings/page.tsx)
- Revamp account cards with richer visuals.
- Improve layout and spacing.

---

### [Component] Plan & Repository Logic
Implementing manual activation, limits, and swapping.

#### [MODIFY] [schema.ts](file:///d:/code/ReviewScope/apps/api/src/db/schema.ts)
- Add `swap_count` (int, default 0) and `last_swap_reset` (timestamp) to `installations`.
- Add `isActive` (boolean, default false) to `repositories`.

#### [MODIFY] [plans.ts](file:///d:/code/ReviewScope/apps/worker/src/lib/plans.ts)
- Update default plan logic to handle "none" or "unactivated" state.

#### [MODIFY] [github.ts](file:///d:/code/ReviewScope/apps/api/src/webhooks/github.ts)
- Update webhook handler to insert repositories with `isActive: false` (or `status: 'inactive'`).

#### [NEW] [repoActions.ts](file:///d:/code/ReviewScope/apps/dashboard/src/lib/actions/repoActions.ts)
- Create server actions for activating/deactivating repositories.
- Implement quota checks and swap limit enforcement.

## Verification Plan

### Automated Tests
- I will attempt to add a unit test for the `swap_count` logic if a test framework is set up, otherwise I will rely on manual verification.

### Manual Verification
- **Navigation**: Verify that the Sidebar correctly links to all pages and highlights the active page.
- **UI**: Visually inspect Dashboard, Repositories, and Settings pages for "premium" look and feel.
- **Limits**: Attempt to activate more repositories than allowed by the plan and verify it's blocked.
- **Swapping**: Deactivate a repo, activate a new one, and verify the `swap_count` increment.
- **Free Plan**: Verify that a new user starts with no active repos and must activate them.
