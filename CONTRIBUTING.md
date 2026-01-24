# Contributing to ReviewScope

We love your input! We want to make contributing to ReviewScope as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## We Develop with Github

We use github to host code, to track issues and feature requests, and to accept pull requests.

## Development Workflow

1.  **Fork the repo** and create your branch from `main`.
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Set up environment variables**:
    - Copy `.env.example` to `.env` in the root and relevant app directories (`apps/api`, `apps/worker`, `apps/dashboard`).
    - Fill in the required keys (see `README.md` for details).
4.  **Run the development environment**:
    ```bash
    npm run dev
    ```
    This will start all services (API, Worker, Dashboard) concurrently.

## Pull Request Process

1.  Update the `README.md` with details of changes to the interface, this includes new environment variables, exposed ports, useful file locations and container parameters.
2.  Increase the version numbers in any examples files and the README.md to the new version that this Pull Request would represent. The versioning scheme we use is [SemVer](http://semver.org/).
3.  Run the test suite and ensure all tests pass:
    ```bash
    npm run test
    ```
4.  Format your code to ensure consistency:
    ```bash
    npm run format
    ```
5.  Lint your code to catch any potential issues:
    ```bash
    npm run lint
    ```
6.  You may merge the Pull Request in once you have the sign-off of two other developers, or if you do not have permission to do that, you may request the second reviewer to merge it for you.

## Coding Style

- **TypeScript**: We use TypeScript for type safety. Please ensure all new code is typed.
- **Formatting**: We use Prettier for code formatting. Run `npm run format` before committing.
- **Linting**: We use ESLint. Run `npm run lint` to check for issues.
- **Commit Messages**: Write clear, descriptive commit messages.

## Project Structure

- `apps/`: Contains the deployable applications (API, Dashboard, Worker).
- `packages/`: Contains shared libraries and internal packages (Context Engine, LLM Core, Rules Engine, Security).

## Report bugs using Github's [issue tracker](https://github.com/Review-scope/ReviewScope/issues)

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/Review-scope/ReviewScope/issues/new); it's that easy!

## License

By contributing, you agree that your contributions will be licensed under its MIT License.
