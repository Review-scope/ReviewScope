import { App } from '@octokit/app';
import { Octokit } from '@octokit/rest';

export class GitHubClient {
  private app: App;

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

  async getInstallationClient(installationId: number): Promise<Octokit> {
    return (await this.app.getInstallationOctokit(installationId)) as unknown as Octokit;
  }

  /**
   * Fetch PR diff content
   */
  async getPullRequestDiff(
    installationId: number,
    owner: string,
    repo: string,
    pullNumber: number
  ): Promise<string> {
    const octokit = await this.getInstallationClient(installationId);
    
    const { data } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
      headers: {
        accept: 'application/vnd.github.v3.diff',
      },
    });

    return data as unknown as string;
  }

  async getPullRequest(
    installationId: number,
    owner: string,
    repo: string,
    pullNumber: number
  ) {
    const octokit = await this.getInstallationClient(installationId);
    const { data } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });
    return data;
  }

  async getIssue(
    installationId: number,
    owner: string,
    repo: string,
    issueNumber: number
  ): Promise<{ title: string; body: string; state: string } | null> {
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
    } catch (e: any) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  async getFileContent(
    installationId: number,
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<string | null> {
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
    } catch (e: any) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  async getRepositoryFiles(
    installationId: number,
    owner: string,
    repo: string,
    ref?: string
  ): Promise<Array<{ path: string; content: string }>> {
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

    const files: Array<{ path: string; content: string }> = [];

    // 3. Fetch content for each file (limit to common code files to avoid binary noise)
    const allowedExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.java', '.c', '.cpp', '.h', '.rb', '.rs', '.md'];
    
    // Process in small batches to avoid rate limits
    const treeFiles = tree.tree.filter(item => 
      item.type === 'blob' && 
      item.path && 
      allowedExtensions.some(ext => item.path!.endsWith(ext))
    );

    console.warn(`Found ${treeFiles.length} files to index in ${owner}/${repo}`);

    // Fetch contents in parallel batches to avoid hitting rate limits too fast
    const BATCH_SIZE = 5; // Reduced from 10
    for (let i = 0; i < treeFiles.length; i += BATCH_SIZE) {
      const batch = treeFiles.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (item) => {
          let retries = 3;
          while (retries > 0) {
            try {
              const { data: blob } = await octokit.rest.git.getBlob({
                owner,
                repo,
                file_sha: item.sha!,
                request: {
                  timeout: 15000, // Increase timeout to 15s
                }
              });
              if (!blob.content) {
                console.warn(`[GitHub] Blob for ${item.path} has no content, skipping`);
                return null;
              }
              return {
                path: item.path!,
                content: Buffer.from(blob.content, 'base64').toString('utf-8'),
              };
            } catch (e: any) {
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
        })
      );

      files.push(...(results.filter(f => f !== null) as Array<{ path: string; content: string }>));
      
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
  async listInstallationRepositories(installationId: number): Promise<Array<{ id: number; full_name: string; private: boolean }>> {
    const octokit = await this.getInstallationClient(installationId);
    try {
      const { data } = await octokit.rest.apps.listReposAccessibleToInstallation();
      return data.repositories.map(repo => ({
        id: repo.id,
        full_name: repo.full_name,
        private: repo.private,
      }));
    } catch (e: any) {
      console.error(`[GitHub] Failed to list repos for installation ${installationId}:`, e.message);
      return [];
    }
  }

  async postReview(
    installationId: number,
    owner: string,
    repo: string,
    pullNumber: number,
    commitId: string,
    summary: string,
    comments: Array<{ path: string; line: number; body: string; side?: 'LEFT' | 'RIGHT'; start_line?: number }>
  ): Promise<void> {
    console.warn(`[GitHub] Posting review to ${owner}/${repo}#${pullNumber} with ${comments.length} comments`);
    const octokit = await this.getInstallationClient(installationId);
    
    // Check for existing ReviewScope summary comment
    // We look for comments by the app bot that contain our signature
    const signature = 'Generated by [ReviewScope]';
    let existingCommentId: number | null = null;

    try {
      const { data: existingComments } = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: pullNumber,
        per_page: 50 // Check last 50 comments
      });

      // Find the last comment made by us with the signature
      const botComment = existingComments.reverse().find(c => 
        c.user?.type === 'Bot' && 
        c.body?.includes(signature) &&
        c.body?.includes('## ReviewScope Analysis')
      );

      if (botComment) {
        existingCommentId = botComment.id;
      }
    } catch (e) {
      console.warn('[GitHub] Failed to list existing comments', e);
    }

    // If we have comments to post, we MUST create a review (you can't add file comments via issue update)
    // BUT we can suppress the body in the review and just update the main summary comment
    
    if (existingCommentId) {
      // Strategy A: Update existing summary + Create Review for file comments
      console.warn(`[GitHub] Updating existing summary comment ${existingCommentId}`);
      
      // 1. Update the main summary
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingCommentId,
        body: summary
      });

      // 2. If there are file comments, post them in a "Quiet" review
      if (comments.length > 0) {
        await octokit.rest.pulls.createReview({
          owner,
          repo,
          pull_number: pullNumber,
          commit_id: commitId,
          body: '🔍 **ReviewScope** detected new findings. See comments below.', // Minimal body
          event: 'COMMENT',
          comments: comments.map(c => {
            const comment: any = {
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
    } else {
      // Strategy B: No existing summary, create full review
      await octokit.rest.pulls.createReview({
        owner,
        repo,
        pull_number: pullNumber,
        commit_id: commitId,
        body: summary,
        event: 'COMMENT',
        comments: comments.map(c => {
          const comment: any = {
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
}
