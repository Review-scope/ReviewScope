# Deployment Guide

## 1. Railway Deployment (Recommended)

Railway is ideal because it supports monorepos and Dockerfiles out of the box.

### Prerequisites
- Push your code to GitHub.
- Sign up at [railway.app](https://railway.app).

### Step-by-Step Setup

1.  **Create a New Project**
    - Click "New Project" -> "Provision PostgreSQL".
    - Right-click the canvas -> "Add Service" -> "Redis".

2.  **Deploy the API**
    - Click "New" -> "GitHub Repo" -> Select `ReviewScope`.
    - **Important:** Click the service card -> **Settings**.
    - Scroll to **Service Integration** / **Build**:
        - **Root Directory**: `/` (Leave as default)
        - **Dockerfile Path**: `apps/api/Dockerfile`
    - Go to **Variables**:
        - Add `REDIS_URL` (Reference the Redis service variable).
        - Add `DATABASE_URL` (Reference the Postgres service variable).
        - Add other secrets from your `.env` (`GITHUB_APP_ID`, `OPENAI_API_KEY`, etc.).

3.  **Deploy the Worker**
    - Click "New" -> "GitHub Repo" -> Select `ReviewScope` (Again).
    - **Settings**:
        - **Dockerfile Path**: `apps/worker/Dockerfile`
    - **Variables**: Same as API (needs `REDIS_URL`, `DATABASE_URL`, `OPENAI_API_KEY`).

4.  **Deploy the Dashboard**
    - Click "New" -> "GitHub Repo" -> Select `ReviewScope` (Again).
    - **Settings**:
        - **Dockerfile Path**: `apps/dashboard/Dockerfile`
    - **Variables**:
        - `NEXTAUTH_URL`: Your Railway domain (e.g., `https://dashboard-production.up.railway.app`).
        - `NEXTAUTH_SECRET`: Generate a random string.
        - `NEXT_PUBLIC_API_URL`: The URL of your **API** service deployed in Step 2.

---

## 2. Heroku Deployment (Future)

Since we are using Docker, moving to Heroku is easy using `heroku.yml`.

1.  Create a file named `heroku.yml` in the root:
    ```yaml
    build:
      docker:
        web: apps/dashboard/Dockerfile
        api: apps/api/Dockerfile
        worker: apps/worker/Dockerfile
    ```

2.  Heroku requires separate apps for each component or a "formation" scale if using a single slug (complex).
    - **Easier Path**: Create 3 separate Heroku apps.
    - **Deploy**:
      ```bash
      heroku container:push web -a reviewscope-dashboard
      heroku container:release web -a reviewscope-dashboard
      ```

## 3. Environment Variables
Ensure these are set in your cloud provider:

| Variable | Description |
|----------|-------------|
| `REDIS_URL` | Connection string for Redis |
| `DATABASE_URL` | Connection string for Postgres |
| `NEXTAUTH_URL` | The public URL of the dashboard |
| `GITHUB_APP_PRIVATE_KEY` | Your GitHub App Private Key (PEM format) |
