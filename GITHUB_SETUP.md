# GitHub App Setup for ReviewScope

To set up your development GitHub App, follow these steps:

## 1. Create the App
- Go to [GitHub Developer Settings](https://github.com/settings/apps)
- Click **New GitHub App**
- **App Name**: `ReviewScope (Dev)`
- **Homepage URL**: `https://localhost:3000` (Placeholder)
- **Webhook URL**: Your local proxy URL (e.g., from `ngrok` or `localtunnel`)
- **Webhook Secret**: Generate a strong secret and add it to your app's `.env` file (e.g., `apps/api/.env`) as `GITHUB_WEBHOOK_SECRET`

## 2. Permissions
Set the following permissions:
- **Repository permissions**:
  - `Pull requests`: Read & write
  - `Contents`: Read (to fetch diffs)
  - `Issues`: Read (to fetch linked issues)
  - `Metadata`: Read-only (required)
- **Subscribe to events**:
  - `Pull request`
  - `Installation`

## 3. Identification
- Note the **App ID** and add it to your app's `.env` as `GITHUB_APP_ID`.
- Generate a **Private key**, download it, and add its contents to your app's `.env` as `GITHUB_APP_PRIVATE_KEY` (use literal newlines `\n` if putting it in a single line).

## 4. Installation
- Click **Install App** in the sidebar.
- Install it on a test repository.
- Opening a PR on that repo will now trigger webhooks to your local environment.

---

## Environment Variables Checklist
```dotenv
GITHUB_APP_ID=...
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=...
DATABASE_URL=...
REDIS_URL=...
```
