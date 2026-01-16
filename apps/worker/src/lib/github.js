import { App } from '@octokit/app';
import { Octokit } from '@octokit/rest';
export class GitHubClient {
    app;
    constructor() {
        const appId = process.env.GITHUB_APP_ID;
        const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
        if (!appId || !privateKey) {
            throw new Error('GITHUB_APP_ID or GITHUB_APP_PRIVATE_KEY is missing');
        }
        this.app = new App({
            appId: parseInt(appId, 10),
            privateKey: privateKey.replace(/\\n/g, '\n'),
            Octokit: Octokit.defaults({
                request: {
                    timeout: 15000, // 15 seconds global timeout
                },
            }),
        });
    }
    async getInstallationClient(installationId) {
        return (await this.app.getInstallationOctokit(installationId));
    }
    /**
     * Fetch PR diff content
     */
    async getPullRequestDiff(installationId, owner, repo, pullNumber) {
        const octokit = await this.getInstallationClient(installationId);
        const { data } = await octokit.rest.pulls.get({
            owner,
            repo,
            pull_number: pullNumber,
            headers: {
                accept: 'application/vnd.github.v3.diff',
            },
        });
        return data;
    }
    async getPullRequest(installationId, owner, repo, pullNumber) {
        const octokit = await this.getInstallationClient(installationId);
        const { data } = await octokit.rest.pulls.get({
            owner,
            repo,
            pull_number: pullNumber,
        });
        return data;
    }
    async getIssue(installationId, owner, repo, issueNumber) {
        const octokit = await this.getInstallationClient(installationId);
        try {
            const { data } = await octokit.rest.issues.get({
                owner,
                repo,
                issue_number: issueNumber,
            });
            return {
                title: data.title,
                body: data.body || '',
                state: data.state,
            };
        }
        catch (e) {
            if (e.status === 404)
                return null;
            throw e;
        }
    }
    async getFileContent(installationId, owner, repo, path, ref) {
        const octokit = await this.getInstallationClient(installationId);
        try {
            const { data } = await octokit.rest.repos.getContent({
                owner,
                repo,
                path,
                ref,
            });
            if ('content' in data && !Array.isArray(data)) {
                return Buffer.from(data.content, 'base64').toString('utf-8');
            }
            return null;
        }
        catch (e) {
            if (e.status === 404)
                return null;
            throw e;
        }
    }
    async getRepositoryFiles(installationId, owner, repo, ref) {
        const octokit = await this.getInstallationClient(installationId);
        // 1. Get the latest commit or specific ref
        const { data: commit } = await octokit.rest.repos.getCommit({
            owner,
            repo,
            ref: ref || 'HEAD',
        });
        // 2. Get the full recursive tree
        const { data: tree } = await octokit.rest.git.getTree({
            owner,
            repo,
            tree_sha: commit.commit.tree.sha,
            recursive: 'true',
        });
        const files = [];
        // 3. Fetch content for each file (limit to common code files to avoid binary noise)
        const allowedExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.java', '.c', '.cpp', '.h', '.rb', '.rs', '.md'];
        // Process in small batches to avoid rate limits
        const treeFiles = tree.tree.filter(item => item.type === 'blob' &&
            item.path &&
            allowedExtensions.some(ext => item.path.endsWith(ext)));
        console.warn(`Found ${treeFiles.length} files to index in ${owner}/${repo}`);
        // Fetch contents in parallel batches to avoid hitting rate limits too fast
        const BATCH_SIZE = 5; // Reduced from 10
        for (let i = 0; i < treeFiles.length; i += BATCH_SIZE) {
            const batch = treeFiles.slice(i, i + BATCH_SIZE);
            const results = await Promise.all(batch.map(async (item) => {
                let retries = 3;
                while (retries > 0) {
                    try {
                        const { data: blob } = await octokit.rest.git.getBlob({
                            owner,
                            repo,
                            file_sha: item.sha,
                            request: {
                                timeout: 15000, // Increase timeout to 15s
                            }
                        });
                        if (!blob.content) {
                            console.warn(`[GitHub] Blob for ${item.path} has no content, skipping`);
                            return null;
                        }
                        return {
                            path: item.path,
                            content: Buffer.from(blob.content, 'base64').toString('utf-8'),
                        };
                    }
                    catch (e) {
                        retries--;
                        if (retries === 0) {
                            console.error(`Failed to fetch blob for ${item.path} after all retries:`, e.message);
                            return null;
                        }
                        console.warn(`Retrying blob fetch for ${item.path} (${3 - retries}/3)... Error: ${e.message}`);
                        await new Promise(resolve => setTimeout(resolve, 1000 * (3 - retries))); // Exponential-ish backoff
                    }
                }
                return null;
            }));
            files.push(...results.filter(f => f !== null));
            // Add a small breather between batches
            if (i + BATCH_SIZE < treeFiles.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        return files;
    }
    /**
     * List all repositories accessible by this installation
     */
    async listInstallationRepositories(installationId) {
        const octokit = await this.getInstallationClient(installationId);
        try {
            const { data } = await octokit.rest.apps.listReposAccessibleToInstallation();
            return data.repositories.map(repo => ({
                id: repo.id,
                full_name: repo.full_name,
                private: repo.private,
            }));
        }
        catch (e) {
            console.error(`[GitHub] Failed to list repos for installation ${installationId}:`, e.message);
            return [];
        }
    }
    async postReview(installationId, owner, repo, pullNumber, commitId, summary, comments) {
        const octokit = await this.getInstallationClient(installationId);
        // Create the review
        await octokit.rest.pulls.createReview({
            owner,
            repo,
            pull_number: pullNumber,
            commit_id: commitId, // Required to ensure we review the right commit
            body: summary,
            event: 'COMMENT', // or APPROVE/REQUEST_CHANGES, but we start with COMMENT
            comments: comments.map(c => {
                const comment = {
                    path: c.path,
                    line: c.line,
                    side: c.side || 'RIGHT',
                    body: c.body,
                };
                if (c.start_line) {
                    comment.start_line = c.start_line;
                    comment.start_side = c.side || 'RIGHT';
                }
                return comment;
            }),
        });
    }
}
//# sourceMappingURL=github.js.map