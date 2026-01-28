'use client';

import { useState } from 'react';
import { Book, Server, GitPullRequest, ShieldCheck, Terminal, MessageSquare, Zap, Database, Layers, Cpu, Code2, Settings, HelpCircle, Check, Globe } from 'lucide-react';
import { clsx } from 'clsx';

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState('user-guide');

  const tabs = [
    { id: 'user-guide', label: 'User Guide', icon: Book },
    { id: 'architecture', label: 'Architecture', icon: Server },
    { id: 'contributing', label: 'Contributing', icon: GitPullRequest },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 min-h-screen">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl font-black uppercase tracking-tighter italic">Documentation</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Everything you need to know about using, building, and understanding ReviewScope.
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-border/50 pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex items-center gap-2 px-4 py-3 text-sm font-bold rounded-t-lg transition-all border-b-2",
              activeTab === tab.id
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-card border rounded-2xl p-6 md:p-10 shadow-sm">
        
        {/* USER GUIDE */}
        {activeTab === 'user-guide' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* 1. Intro */}
            <div className="space-y-4">
              <h2 className="text-3xl font-bold tracking-tight">User Guide</h2>
              <p className="text-lg text-muted-foreground">
                ReviewScope is an AI-powered code review assistant that integrates directly into your GitHub workflow. 
                It combines static analysis with LLM reasoning to catch bugs, security issues, and style violations.
              </p>
            </div>

            <hr className="border-border/50" />

            {/* 2. Getting Started */}
            <section className="space-y-6">
              <h3 className="text-2xl font-bold flex items-center gap-2 text-foreground">
                <Terminal className="w-6 h-6 text-blue-500" />
                Getting Started
              </h3>
              
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <h4 className="font-bold text-lg flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs">1</span>
                    Installation
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Install the <strong>ReviewScope GitHub App</strong> on your account or organization. 
                    You can grant access to all repositories or select specific ones.
                  </p>
                </div>
              </div>
            </section>

            {/* 3. Configuration */}
            <section className="space-y-6">
              <h3 className="text-2xl font-bold flex items-center gap-2 text-foreground">
                <Settings className="w-6 h-6 text-purple-500" />
                Configuration (BYOK)
              </h3>
              <div className="bg-muted/30 p-6 rounded-xl border space-y-6">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    ReviewScope uses a <strong>Bring Your Own Key (BYOK)</strong> model. We do not resell AI credits. 
                    You must configure a valid API key for each installation in the <strong>Settings</strong> tab.
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h5 className="font-bold text-sm mb-2 text-foreground flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-primary" />
                        Supported Providers
                      </h5>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> <strong>Google Gemini</strong> (Recommended for speed/cost)</li>
                        <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> <strong>OpenAI</strong> (GPT-5, GPT-3.5 Turbo)</li>
                        {/* <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> <strong>Anthropic Claude</strong> (Coming Soon)</li> */}
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-bold text-sm mb-2 text-foreground flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        Security & Privacy
                      </h5>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          <span>Keys are encrypted at rest using <strong>AES-256</strong>.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          <span>Code snippets are sent to LLMs <strong>ephemerally</strong> for analysis only.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          <span>We do <strong>not</strong> use your code to train models.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50">
                  <h5 className="font-bold text-sm mb-2 text-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    Smart Routing
                  </h5>
                  <p className="text-sm text-muted-foreground">
                    ReviewScope automatically analyzes the complexity of a PR (lines of code, file types) to choose the most cost-effective model if multiple keys are provided, or uses the configured default.
                  </p>
                </div>
              </div>
            </section>

            {/* 4. Supported Languages */}
            <section className="space-y-6">
              <h3 className="text-2xl font-bold flex items-center gap-2 text-foreground">
                <Globe className="w-6 h-6 text-green-500" />
                Supported Languages
              </h3>
              <p className="text-muted-foreground">
                We support AST-based static analysis and intelligent context retrieval for the following languages:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: 'JavaScript / TypeScript', ext: '.js, .ts, .jsx, .tsx' },
                  { name: 'Python', ext: '.py' },
                  { name: 'Go', ext: '.go' },
                  { name: 'Java', ext: '.java' },
                  { name: 'C / C++', ext: '.c, .cpp, .h' },
                ].map((lang) => (
                  <div key={lang.name} className="p-4 bg-card border rounded-lg hover:border-primary/50 transition-colors">
                    <div className="font-bold text-sm">{lang.name}</div>
                    <div className="text-xs text-muted-foreground mt-1 font-mono">{lang.ext}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* 5. Default Rules */}
            <section className="space-y-6">
              <h3 className="text-2xl font-bold flex items-center gap-2 text-foreground">
                <ShieldCheck className="w-6 h-6 text-blue-500" />
                Default Rules
              </h3>
              <p className="text-muted-foreground">
                ReviewScope runs these static analysis rules before the LLM review to catch common issues fast.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border rounded-xl bg-card">
                  <h4 className="font-bold flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    Missing Error Handling
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Flags empty <code>catch</code> blocks and async functions that use <code>await</code> without try/catch handling.
                  </p>
                </div>
                <div className="p-4 border rounded-xl bg-card">
                  <h4 className="font-bold flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                    Console Log Detection
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Identifies <code>console.log</code> statements in production code (ignores test files and debug contexts).
                  </p>
                </div>
                <div className="p-4 border rounded-xl bg-card">
                  <h4 className="font-bold flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    Unsafe Patterns
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Detects security risks like <code>eval()</code>, <code>innerHTML</code> assignments, and <code>document.write()</code>.
                  </p>
                </div>
                <div className="p-4 border rounded-xl bg-card">
                  <h4 className="font-bold flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    TODO/FIXME Tracker
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Highlights <code>TODO</code>, <code>FIXME</code>, <code>HACK</code> comments so they don't get merged unnoticed.
                  </p>
                </div>
              </div>
            </section>

            {/* 6. Commands & Workflow */}
            <section className="space-y-6">
              <h3 className="text-2xl font-bold flex items-center gap-2 text-foreground">
                <MessageSquare className="w-6 h-6 text-pink-500" />
                Commands & Workflow
              </h3>
              
              <div className="space-y-4">
                <div className="bg-zinc-950 text-zinc-100 p-6 rounded-xl font-mono text-sm space-y-8 overflow-x-auto border border-zinc-800 shadow-inner">
                  
                  {/* Auto */}
                  <div className="relative pl-6 border-l-2 border-zinc-800">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-zinc-800 border-2 border-zinc-950"></div>
                    <div className="text-zinc-400 font-sans text-xs uppercase tracking-wider font-bold mb-2">1. Automatic Review</div>
                    <p className="text-zinc-300">
                      Simply open a Pull Request. ReviewScope will post a review within seconds to minutes.
                    </p>
                  </div>

                  {/* Re-review */}
                  <div className="relative pl-6 border-l-2 border-zinc-800">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-zinc-800 border-2 border-zinc-950"></div>
                    <div className="text-zinc-400 font-sans text-xs uppercase tracking-wider font-bold mb-2">2. Trigger Manually</div>
                    <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50 inline-block mb-2">
                      <span className="text-purple-400">@Review-scope</span> re-review
                    </div>
                    <p className="text-zinc-500 text-xs">Use this if you pushed new commits and want an immediate re-scan.</p>
                  </div>

                  {/* Chat */}
                  <div className="relative pl-6 border-l-2 border-zinc-800">
                     <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-zinc-800 border-2 border-zinc-950"></div>
                    <div className="text-zinc-400 font-sans text-xs uppercase tracking-wider font-bold mb-2">3. Ask Questions</div>
                    <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50 inline-block mb-2">
                      <span className="text-purple-400">@Review-scope</span> Why is this variable nullable?
                    </div>
                    <p className="text-zinc-500 text-xs">ReviewScope will reply in a thread with context-aware answers.</p>
                  </div>

                </div>
              </div>
            </section>

            {/* 7. Troubleshooting */}
            <section className="space-y-6">
              <h3 className="text-2xl font-bold flex items-center gap-2 text-foreground">
                <HelpCircle className="w-6 h-6 text-orange-500" />
                Troubleshooting
              </h3>
              <div className="space-y-4">
                <details className="group border rounded-xl px-4 py-3 [&_summary::-webkit-details-marker]:hidden open:bg-muted/10">
                  <summary className="flex items-center justify-between font-bold cursor-pointer text-sm">
                    Why didn't I get a review?
                    <div className="transition-transform group-open:rotate-180">
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </summary>
                  <div className="pt-3 text-sm text-muted-foreground space-y-2">
                    <p>Check the following:</p>
                    <ul className="list-disc list-inside">
                      <li>Is the repository <strong>Active</strong> in the dashboard?</li>
                      <li>Do you have a valid <strong>API Key</strong> configured in Settings?</li>
                      <li>Are the changed files in a <a href="#" className="underline">supported language</a>?</li>
                    </ul>
                  </div>
                </details>

                <details className="group border rounded-xl px-4 py-3 [&_summary::-webkit-details-marker]:hidden open:bg-muted/10">
                  <summary className="flex items-center justify-between font-bold cursor-pointer text-sm">
                    "Verification Failed" error
                    <div className="transition-transform group-open:rotate-180">
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </summary>
                  <div className="pt-3 text-sm text-muted-foreground">
                    This usually means your API Key is incorrect or expired. Try generating a new key from your provider (OpenAI/Google) and updating it in the Settings tab.
                  </div>
                </details>
              </div>
            </section>

          </div>
        )}

        {/* ARCHITECTURE */}
        {activeTab === 'architecture' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">System Architecture</h2>
              <p className="text-muted-foreground">Deep dive into the microservices and data flow of ReviewScope.</p>
            </div>

            <hr className="border-border/50" />

            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-3 p-5 rounded-xl border bg-card shadow-sm">
                <div className="h-2 w-10 bg-blue-500 rounded-full"></div>
                <h3 className="text-lg font-bold">API Service</h3>
                <p className="text-sm text-muted-foreground">
                  Built with <strong>Hono</strong>. Handles GitHub Webhooks, verifies HMAC signatures, and manages the database.
                  Enqueues jobs to Redis for asynchronous processing.
                </p>
              </div>
              <div className="space-y-3 p-5 rounded-xl border bg-card shadow-sm">
                <div className="h-2 w-10 bg-purple-500 rounded-full"></div>
                <h3 className="text-lg font-bold">Worker Service</h3>
                <p className="text-sm text-muted-foreground">
                  <strong>Node.js</strong> worker using <strong>BullMQ</strong>. Processes `review-jobs`, `indexing-jobs`, and `chat-jobs`.
                  Executes the heavy lifting of AST parsing and LLM inference.
                </p>
              </div>
              <div className="space-y-3 p-5 rounded-xl border bg-card shadow-sm">
                <div className="h-2 w-10 bg-amber-500 rounded-full"></div>
                <h3 className="text-lg font-bold">Engines</h3>
                <p className="text-sm text-muted-foreground">
                  <strong>Context Engine:</strong> Multi-layered context assembly (Diff, RAG, Metadata).<br/>
                  <strong>Rules Engine:</strong> Regex and AST-based static analysis.
                </p>
              </div>
            </div>

            <section className="space-y-6">
               <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <Layers className="w-5 h-5 text-indigo-500" />
                Data Model
              </h3>
              <div className="bg-zinc-950 text-zinc-100 p-6 rounded-xl font-mono text-xs overflow-x-auto border border-zinc-800">
                <pre>{`
// Core Database Schema (Postgres + Drizzle)

Installations
  - id: uuid
  - github_installation_id: int
  - plan_id: int (Free/Pro)
  - settings: jsonb (API Keys, Rules Config)

Repositories
  - id: uuid
  - installation_id: uuid
  - is_active: boolean
  - indexed_at: timestamp (RAG status)

Reviews
  - id: uuid
  - pr_number: int
  - context_hash: text (Idempotency check)
  - status: pending | processing | completed
                `}</pre>
              </div>
            </section>

            <section className="bg-muted/30 p-8 rounded-xl border space-y-6">
              <h3 className="font-bold flex items-center gap-2 text-lg">
                <Zap className="w-5 h-5 text-yellow-500" />
                The Review Pipeline (Step-by-Step)
              </h3>
              <div className="space-y-6 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                
                <div className="relative pl-10">
                  <span className="absolute left-0 top-1 w-7 h-7 rounded-full bg-background border-2 border-primary text-primary flex items-center justify-center font-bold text-xs">1</span>
                  <h4 className="font-bold text-sm">Webhook Reception</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    GitHub sends `pull_request` event. API verifies signature `x-hub-signature-256`.
                    Checks plan limits (Daily Review Quota).
                  </p>
                </div>

                <div className="relative pl-10">
                  <span className="absolute left-0 top-1 w-7 h-7 rounded-full bg-background border-2 border-primary text-primary flex items-center justify-center font-bold text-xs">2</span>
                  <h4 className="font-bold text-sm">Job Enqueue</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Job added to `review-jobs` queue in Redis.
                  </p>
                </div>

                <div className="relative pl-10">
                  <span className="absolute left-0 top-1 w-7 h-7 rounded-full bg-background border-2 border-primary text-primary flex items-center justify-center font-bold text-xs">3</span>
                  <h4 className="font-bold text-sm">Worker Processing</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Worker picks up job.
                    <br/>- <strong>Rules Engine:</strong> Runs `todo-fixme`, `console-log`, `unsafe-patterns` rules.
                    <br/>- <strong>Context Engine:</strong> Fetches PR Diff, searches Qdrant for related code (RAG).
                  </p>
                </div>

                <div className="relative pl-10">
                  <span className="absolute left-0 top-1 w-7 h-7 rounded-full bg-background border-2 border-primary text-primary flex items-center justify-center font-bold text-xs">4</span>
                  <h4 className="font-bold text-sm">LLM Inference</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Constructs prompt with: Diff + Rule Violations + RAG Context.
                    Sends to Gemini/GPT.
                  </p>
                </div>

                 <div className="relative pl-10">
                  <span className="absolute left-0 top-1 w-7 h-7 rounded-full bg-background border-2 border-primary text-primary flex items-center justify-center font-bold text-xs">5</span>
                  <h4 className="font-bold text-sm">GitHub Comment</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Formats LLM response and posts as a PR Review or individual file comments.
                  </p>
                </div>

              </div>
            </section>
          </div>
        )}

        {/* CONTRIBUTING */}
        {activeTab === 'contributing' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">Contributing</h2>
              <p className="text-muted-foreground">Join the development of ReviewScope.</p>
            </div>

            <hr className="border-border/50" />

            <div className="prose prose-sm prose-invert max-w-none space-y-8">
              <section>
                <h3 className="text-lg font-bold mb-4">Local Development Setup</h3>
                <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800">
                  <pre className="text-xs font-mono text-zinc-300">
{`# 1. Clone the repository
git clone https://github.com/Review-scope/ReviewScope
cd ReviewScope

# 2. Install dependencies
npm install

# 3. Environment Variables
cp .env.example .env
# Fill in: DATABASE_URL, REDIS_URL, GITHUB_APP_ID, etc.

# 4. Start Development Server
npm run dev`}
                  </pre>
                </div>
                <p className="text-muted-foreground mt-4 text-xs">
                  This command starts the API (port 3001), Worker, and Dashboard (port 3000) concurrently using Turbo.
                </p>
              </section>
              
              <section>
                <h3 className="text-lg font-bold mb-4">Project Structure (Monorepo)</h3>
                <div className="grid md:grid-cols-2 gap-4 not-prose">
                  <div className="border rounded-lg p-4 bg-muted/20">
                    <h4 className="font-mono text-sm font-bold text-blue-400">apps/dashboard</h4>
                    <p className="text-xs text-muted-foreground mt-1">Next.js 14 App Router. Frontend UI.</p>
                  </div>
                  <div className="border rounded-lg p-4 bg-muted/20">
                    <h4 className="font-mono text-sm font-bold text-purple-400">apps/api</h4>
                    <p className="text-xs text-muted-foreground mt-1">Hono server. Webhooks & DB access.</p>
                  </div>
                  <div className="border rounded-lg p-4 bg-muted/20">
                    <h4 className="font-mono text-sm font-bold text-amber-400">apps/worker</h4>
                    <p className="text-xs text-muted-foreground mt-1">Background job processor.</p>
                  </div>
                  <div className="border rounded-lg p-4 bg-muted/20">
                    <h4 className="font-mono text-sm font-bold text-green-400">packages/context-engine</h4>
                    <p className="text-xs text-muted-foreground mt-1">RAG & Prompt assembly logic.</p>
                  </div>
                  <div className="border rounded-lg p-4 bg-muted/20">
                    <h4 className="font-mono text-sm font-bold text-pink-400">packages/rules-engine</h4>
                    <p className="text-xs text-muted-foreground mt-1">Static analysis rules.</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
