# ReviewScope User Guide

Welcome to ReviewScope! This guide will help you set up and use ReviewScope for your projects.

## Getting Started

### 1. Installation

ReviewScope runs as a GitHub App. To install it:

1.  Go to the [ReviewScope GitHub App page](#) (Link to your app).
2.  Click **Install**.
3.  Select the repositories you want ReviewScope to access.
4.  You will be redirected to the ReviewScope Dashboard.

### 2. Configuration

Once installed, you need to configure the AI provider:

1.  Log in to the **ReviewScope Dashboard**.
2.  Navigate to **Settings** for your repository.
3.  Enter your **OpenAI API Key** or **Gemini API Key**.
    -   *Note: Your keys are encrypted and stored securely. We do not use them for anything other than reviewing your code.*
4.  (Optional) Customize the **System Prompt** to define the persona or specific focus areas for the AI (e.g., "Focus on security", "Be concise").

## How to Use

ReviewScope works automatically in the background.

### Automatic Reviews

1.  **Open a Pull Request**: Simply create a new PR in your repository.
2.  **Wait for Review**: ReviewScope will pick up the changes, analyze them, and post comments directly on the PR lines.
3.  **Fix Issues**: Address the comments as you would with a human reviewer.
4.  **Push Updates**: When you push new commits to the same PR, ReviewScope will re-evaluate the changes.

### Manual Triggers & Chat

You can interact with ReviewScope by commenting on the Pull Request. You must mention **@reviewscope** for the bot to respond.

-   **Trigger a Re-review**:
    ```text
    @reviewscope re-review
    ```
    This forces ReviewScope to re-analyze the current state of the PR, even if no new code has been pushed.

-   **Ask Questions (Chat Mode)**:
    You can ask questions about the code or the review. ReviewScope uses the PR context to answer.
    ```text
    @reviewscope Why is this change necessary?
    @reviewscope Can you explain the logic in the auth module?
    ```

## Understanding the Feedback

ReviewScope provides two types of feedback:

1.  **Static Analysis**: These are deterministic checks (like linting errors).
    -   *Example*: "Console.log left in production code."
2.  **AI Insights**: These are logic and design suggestions.
    -   *Example*: "This function might cause a race condition because..."

## Troubleshooting

-   **No review posted?** Check the Dashboard to see if the job failed or if your API key quota is exceeded.
-   **Too many comments?** Adjust the "Severity Level" in the Repository Settings to only show "High" or "Critical" issues.

## Support

If you encounter any issues, please reach out to our support team or open an issue in our [Support Repository](#).
