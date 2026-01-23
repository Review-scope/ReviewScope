import { pgTable, uuid, text, integer, timestamp, jsonb, uniqueIndex, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * GitHub App Installations
 * Stores installation ID and account details
 */
export const installations = pgTable('installations', {
  id: uuid('id').primaryKey().defaultRandom(),
  githubInstallationId: integer('github_installation_id').notNull().unique(),
  githubAccountId: integer('github_account_id'), // The ID of the user/org account
  accountType: text('account_type', { enum: ['User', 'Organization'] }).notNull(),
  accountName: text('account_name').notNull(),
  
  // Marketplace billing
  planId: integer('plan_id').default(3), // 3 = Free Plan
  planName: text('plan_name').default('Free'), // Default to Free
  billingCycle: text('billing_cycle'), // monthly, yearly
  expiresAt: timestamp('expires_at'), // Plan expiration date
  
  // Status tracking
  status: text('status', { enum: ['active', 'suspended', 'deleted', 'inactive'] }).default('active').notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  settings: jsonb('settings').default({}),

  // Limit enforcement
  swapCount: integer('swap_count').default(0).notNull(),
  lastSwapReset: timestamp('last_swap_reset').defaultNow(),
});

export const installationsRelations = relations(installations, ({ many }) => ({
  repositories: many(repositories),
}));

/**
 * Marketplace Events
 * Audit log for billing and plan changes
 */
export const marketplaceEvents = pgTable('marketplace_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  githubAccountId: integer('github_account_id').notNull(),
  action: text('action').notNull(), // purchased, cancelled, changed
  planId: integer('plan_id').notNull(),
  sender: text('sender'),
  payload: jsonb('payload'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * Repositories
 * Track which repos are active for each installation
 */
export const repositories = pgTable('repositories', {
  id: uuid('id').primaryKey().defaultRandom(),
  installationId: uuid('installation_id').references(() => installations.id, { onDelete: 'cascade' }).notNull(),
  githubRepoId: integer('github_repo_id').notNull().unique(),
  fullName: text('full_name').notNull(),
  isPrivate: integer('is_private').default(0), // 0 = public, 1 = private
  indexedAt: timestamp('indexed_at'), // Guard: skip RAG if null
  
  // Status tracking: active (normal), removed (from app), deleted (repo gone)
  status: text('status', { enum: ['active', 'removed', 'deleted'] }).default('active').notNull(),
  
  // Manual activation switch
  isActive: boolean('is_active').default(false).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  settings: jsonb('settings').default({}),
}, (table) => ({
  nameIdx: uniqueIndex('repo_name_idx').on(table.fullName),
}));

export const repositoriesRelations = relations(repositories, ({ one, many }) => ({
  installation: one(installations, {
    fields: [repositories.installationId],
    references: [installations.id],
  }),
  reviews: many(reviews),
}));

/**
 * PR Reviews
 * Tracks history, idempotency, and metadata
 */
export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  repositoryId: uuid('repository_id').references(() => repositories.id, { onDelete: 'cascade' }).notNull(),
  prNumber: integer('pr_number').notNull(),
  status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] }).default('pending').notNull(),
  
  // Track inputs for idempotency
  contextHash: text('context_hash'), // Same PR + Context = Same Review
  reviewerVersion: text('reviewer_version').notNull(), // Tracking model/prompt version
  
  // Job metadata
  jobId: text('job_id'),
  deliveryId: text('delivery_id'),
  
  result: jsonb('result'), // Final AI output (summary, comments, status)
  
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
}, (table) => ({
  repoPrIdx: uniqueIndex('repo_pr_idx').on(table.repositoryId, table.prNumber),
}));

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  repository: one(repositories, {
    fields: [reviews.repositoryId],
    references: [repositories.id],
  }),
  commentThreads: many(commentThreads),
}));

/**
 * PR Comment Threads
 * Tracks unique issues to avoid duplicate spam and enable auto-resolution
 */
export const commentThreads = pgTable('comment_threads', {
  id: uuid('id').primaryKey().defaultRandom(),
  reviewId: uuid('review_id').references(() => reviews.id, { onDelete: 'cascade' }).notNull(),
  
  // Deterministic identifier for this specific issue
  issueKey: text('issue_key').notNull(), 
  
  // GitHub-side metadata
  githubThreadId: text('github_thread_id'), // map to github's review_thread_id if needed
  lastCommentId: text('last_comment_id'),
  
  // Content
  filePath: text('file_path').notNull(),
  line: integer('line').notNull(),
  
  // State
  status: text('status', { enum: ['open', 'resolved', 'ignored'] }).default('open').notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  issueKeyIdx: uniqueIndex('issue_key_idx').on(table.issueKey),
}));

export const commentThreadsRelations = relations(commentThreads, ({ one }) => ({
  review: one(reviews, {
    fields: [commentThreads.reviewId],
    references: [reviews.id],
  }),
}));

/**
 * User/Repo Configurations
 * Stores encrypted API keys and custom prompts
 */
export const configs = pgTable('configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  installationId: uuid('installation_id').references(() => installations.id, { onDelete: 'cascade' }).notNull(),
  
  // LLM Settings
  provider: text('provider').default('gemini').notNull(),
  model: text('model').default('gemini-2.5-flash').notNull(),
  apiKeyEncrypted: text('api_key_encrypted'), 
  smartRouting: boolean('smart_routing').default(false).notNull(),
  
  // Review Customization
  customPrompt: text('custom_prompt'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * API Usage Logs
 * Tracks external API calls (npm registry, security advisories, etc.)
 * Used for rate limiting enforcement per plan tier
 */
export const apiUsageLogs = pgTable('api_usage_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  installationId: uuid('installation_id').references(() => installations.id, { onDelete: 'cascade' }).notNull(),
  repositoryId: uuid('repository_id').references(() => repositories.id, { onDelete: 'cascade' }),
  
  // Query details
  query: text('query').notNull(), // npm package name, etc.
  apiService: text('api_service').notNull(), // 'npm', 'security-advisory', 'github', etc.
  
  // Metrics
  tokensUsed: integer('tokens_used').default(0),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  installationDateIdx: uniqueIndex('api_usage_installation_date_idx').on(table.installationId, table.createdAt),
}));
