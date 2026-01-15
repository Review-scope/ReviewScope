# PullSentry Comment Interaction Guide

This document defines **how PullSentry behaves on pull requests** and which **comment-based commands** (if any) it responds to.

The goal is to keep PullSentry **quiet by default**, **useful on demand**, and **safe for GitHub Marketplace approval**.

---

## Default Behavior (Important)

PullSentry **does not reply** to normal comments such as:

* `ok`
* `thanks`
* `👍`
* general discussion replies

This is intentional to:

* avoid comment spam
* prevent infinite reply loops
* meet GitHub Marketplace guidelines

---

## Supported Commands (Explicit Only)

PullSentry responds **only when explicitly mentioned** using `@Reviewscope`.

### 1. `@Reviewscope explain`

**Purpose:**
Ask PullSentry to explain *why* it raised certain insights or suggestions.

**Example:**

```text
@Reviewscope explain
```

**Behavior:**

* PullSentry posts a follow-up comment
* Explains reasoning, risk assessment, and context
* Does NOT re-run the full review

---

### 2. `@Reviewscope re-review`

**Purpose:**
Trigger a fresh review after new commits are pushed.

**Example:**

```text
@Reviewscope re-review
```

**Behavior:**

* Enqueues a new review job
* Re-fetches PR diffs
* Posts a new review comment

---

### 3. `@Reviewscope summarize`

**Purpose:**
Get a concise summary of the PR without detailed inline comments.

**Example:**

```text
@Reviewscope summarize
```

**Behavior:**

* Posts a short, high-level summary
* No inline comments

---

### 4. `@Reviewscope ignore`

**Purpose:**
Tell PullSentry to ignore this PR permanently.

**Example:**

```text
@Reviewscope ignore
```

**Behavior:**

* Marks PR as ignored in the database
* No further reviews or comments

---

## Events That Are Ignored

PullSentry will always ignore:

* Draft pull requests
* Closed pull requests
* Bot-authored pull requests
* Comments without `@Reviewscope`

---

## Safety & Anti-Spam Rules

PullSentry will **never**:

* Reply to itself
* Reply to other bots
* Respond to short acknowledgements (`ok`, `thanks`)
* Re-run reviews automatically on comments

All actions are **explicit and user-triggered**.

---

## Marketplace Compliance Notes

This interaction model ensures:

* Minimal noise
* Predictable behavior
* Clear user intent
* Compliance with GitHub Marketplace review standards

---

## Future Extensions (Optional)

Possible future commands (not enabled by default):

* `@Reviewscope security-check`
* `@Reviewscope performance`
* `@Reviewscope config-review`

These should remain **opt-in only**.

---

**Status:** Approved for v1

**Remind later after this:** Since the dashboard is working, we can move to Step 3 (Authentication):
   * Implement GitHub Login using next-auth so users can only see their own
     repositories.
   * Alternatively, we can build the Review Details view to see AI feedback
     inside the dashboard.