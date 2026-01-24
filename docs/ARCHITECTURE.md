# ReviewScope Architecture

This document describes the high-level architecture and data flow of ReviewScope.

## System Overview

ReviewScope is a distributed system designed to provide AI-powered code reviews. It consists of three main deployable applications and several shared packages.

### Components

1.  **Dashboard (`apps/dashboard`)**:
    -   **Tech**: Next.js (React), Tailwind CSS, NextAuth.
    -   **Purpose**: User interface for configuration, billing, viewing review history, and repository management.
    -   **Key Features**:
        -   GitHub OAuth authentication.
        -   Stripe/Dodo Payments integration for billing.
        -   Project-specific settings (custom prompts, enabled rules).

2.  **API (`apps/api`)**:
    -   **Tech**: Node.js, Hono (or Express/Fastify equivalent), Drizzle ORM.
    -   **Purpose**: Handles incoming webhooks from GitHub and exposes REST endpoints for the dashboard.
    -   **Key Features**:
        -   Receives `pull_request` events.
        -   Validates payloads and signatures.
        -   Enqueues review jobs to Redis.

3.  **Worker (`apps/worker`)**:
    -   **Tech**: Node.js, BullMQ.
    -   **Purpose**: Processes background jobs. This is where the core logic lives.
    -   **Key Features**:
        -   Consumes jobs from the Redis queue.
        -   Orchestrates the review process (Fetch Diff -> Static Analysis -> AI Review -> Post Comment).
        -   Manages rate limits and plan quotas.

### Shared Packages

-   **Context Engine (`packages/context-engine`)**: Handles RAG (Retrieval-Augmented Generation). It indexes codebases and retrieves relevant context for the AI.
-   **LLM Core (`packages/llm-core`)**: Wrapper around AI providers (Gemini, OpenAI). Handles prompt construction, model selection, and response parsing.
-   **Rules Engine (`packages/rules-engine`)**: AST-based static analysis tool. Runs fast, deterministic checks (e.g., "no console.log") before the AI is invoked.
-   **Security (`packages/security`)**: Utilities for encryption and data masking.

## The Review Process (Data Flow)

1.  **Trigger**: A developer opens or updates a Pull Request on GitHub.
2.  **Webhook**: GitHub sends a `pull_request` webhook to `apps/api`.
3.  **Queue**: The API validates the webhook and adds a job to the Redis queue (`review-queue`).
4.  **Processing (Worker)**:
    -   **Fetch Diff**: The worker uses the GitHub API to fetch the file changes.
    -   **Complexity Score**: The diff is analyzed to determine complexity (files changed, lines of code).
    -   **Static Analysis**: The `rules-engine` scans the changed files for common issues.
    -   **Context Retrieval**: The `context-engine` fetches relevant code snippets from the repo (using vector search if configured) to give the AI context.
    -   **AI Review**: The `llm-core` constructs a prompt containing the diff, static analysis results, and context. It sends this to the LLM (Gemini or GPT-4).
    -   **Response Parsing**: The AI's response is parsed into structured comments.
5.  **Output**: The worker posts the review comments back to the GitHub PR.

## Database Schema

We use PostgreSQL with Drizzle ORM. Key tables include:

-   `users`: System users (linked to GitHub accounts).
-   `repositories`: Managed repositories and their settings.
-   `reviews`: History of performed reviews and their results.
-   `subscriptions`: Billing and plan information.

## Infrastructure

-   **Database**: PostgreSQL (persists user/repo data).
-   **Queue**: Redis (BullMQ for job management).
-   **Vector DB**: Qdrant (optional, for RAG context).
-   **Deployment**: Docker containers for API, Worker, and Dashboard.

## Key Design Decisions

-   **"Bring Your Own Key" (BYOK)**: Users provide their own OpenAI/Gemini keys. We don't act as a middleman for AI costs.
-   **Hybrid Analysis**: We combine static analysis (cheap, fast, accurate for syntax) with AI (smart, contextual, good for logic).
-   **Monorepo**: Using npm workspaces to share code (types, utilities) between the backend and frontend easily.
