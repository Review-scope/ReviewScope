'use client';

import { useState } from 'react';
import { Book, Server, GitPullRequest, ShieldCheck, Terminal, MessageSquare, Zap, Database, Layers, Cpu, Code2, Settings, HelpCircle, Check, Globe, Layout, Command, AlertCircle, ChevronRight, FileCode } from 'lucide-react';
import { clsx } from 'clsx';
import Link from 'next/link';

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState('user-guide');

  const tabs = [
    { id: 'user-guide', label: 'User Guide', icon: Book, description: 'Getting started & configuration' },
    { id: 'architecture', label: 'Architecture', icon: Server, description: 'System design & data flow' },
    { id: 'contributing', label: 'Contributing', icon: GitPullRequest, description: 'Development workflow' },
  ];

  return (
    <div className="min-h-screen bg-zinc-50/50">
      {/* Hero Header */}
      <div className="bg-white border-b border-zinc-200 pt-12 pb-8 px-4 md:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
              <Book className="w-3 h-3" />
              Documentation
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-zinc-900">
              ReviewScope <span className="text-zinc-400">Docs</span>
            </h1>
            <p className="text-lg text-zinc-500 max-w-2xl font-medium leading-relaxed">
              Master the art of automated code reviews. Configure your engine, understand the architecture, and contribute to the core.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 pt-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "group relative flex items-center gap-3 px-5 py-4 rounded-xl text-left transition-all border-2",
                  activeTab === tab.id
                    ? "bg-zinc-900 border-zinc-900 text-white shadow-lg shadow-zinc-900/20"
                    : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
                )}
              >
                <div className={clsx(
                  "p-2 rounded-lg transition-colors",
                  activeTab === tab.id ? "bg-white/10 text-white" : "bg-zinc-100 text-zinc-500 group-hover:text-zinc-900"
                )}>
                  <tab.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm">{tab.label}</div>
                  <div className={clsx("text-xs font-medium", activeTab === tab.id ? "text-zinc-400" : "text-zinc-400")}>
                    {tab.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* USER GUIDE */}
        {activeTab === 'user-guide' && (
          <div className="grid md:grid-cols-[250px_1fr] gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Mobile Table of Contents */}
            <div className="md:hidden">
              <details className="bg-white border border-zinc-200 rounded-xl p-4 group [&_summary::-webkit-details-marker]:hidden">
                <summary className="font-bold text-zinc-900 flex items-center justify-between cursor-pointer list-none">
                  On this page
                  <ChevronRight className="w-5 h-5 text-zinc-400 transition-transform group-open:rotate-90" />
                </summary>
                <nav className="mt-4 pt-4 border-t border-zinc-100 space-y-2">
                  {[
                    'Getting Started',
                    'Configuration',
                    'Supported Languages',
                    'Default Rules',
                    'Commands',
                    'Troubleshooting'
                  ].map((item) => (
                    <a 
                      key={item} 
                      href={`#${item.toLowerCase().replace(' ', '-')}`}
                      className="block px-2 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg transition-colors"
                    >
                      {item}
                    </a>
                  ))}
                </nav>
              </details>
            </div>

            {/* Table of Contents (Sticky) */}
            <div className="hidden md:block space-y-1">
              <div className="sticky top-8">
                <h4 className="font-black text-xs uppercase tracking-widest text-zinc-400 mb-4 px-2">Contents</h4>
                <nav className="space-y-1 border-l border-zinc-200 ml-2">
                  {[
                    'Getting Started',
                    'Configuration',
                    'Supported Languages',
                    'Default Rules',
                    'Commands',
                    'Troubleshooting'
                  ].map((item) => (
                    <a 
                      key={item} 
                      href={`#${item.toLowerCase().replace(' ', '-')}`}
                      className="block px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:border-l-2 hover:border-zinc-900 -ml-[1px] transition-all"
                    >
                      {item}
                    </a>
                  ))}
                </nav>
              </div>
            </div>

            <div className="space-y-16 max-w-4xl">
              {/* Getting Started */}
              <section id="getting-started" className="scroll-mt-24 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <Terminal className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-zinc-900">Getting Started</h2>
                </div>
                
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
                  <div className="flex gap-4">
                    <div className="flex-none flex flex-col items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-sm shadow-md">1</div>
                      <div className="w-0.5 flex-1 bg-zinc-100"></div>
                    </div>
                    <div className="space-y-3 pb-8">
                      <h3 className="text-lg font-bold text-zinc-900">Install the GitHub App</h3>
                      <p className="text-zinc-600 leading-relaxed">
                        Install the <strong>ReviewScope GitHub App</strong> on your account or organization. 
                        You can grant access to all repositories or select specific ones.
                      </p>
                      <Link 
                        href="https://github.com/apps/review-scope" 
                        target="_blank"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white text-sm font-bold rounded-lg hover:bg-zinc-800 transition-colors"
                      >
                        Install App <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </section>

              {/* Configuration */}
              <section id="configuration" className="scroll-mt-24 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                    <Settings className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-zinc-900">Configuration (BYOK)</h2>
                </div>

                <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-6 md:p-8 space-y-6">
                    <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-900 text-sm">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="font-medium">
                        ReviewScope uses a <strong>Bring Your Own Key (BYOK)</strong> model. We do not resell AI credits. 
                        You must configure a valid API key for each installation in the Settings tab.
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 pt-4">
                      <div className="space-y-4">
                        <h5 className="font-bold text-sm uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                          <Cpu className="w-4 h-4" />
                          Supported Providers
                        </h5>
                        <ul className="space-y-3">
                          {[
                            { label: 'Google Gemini', sub: 'Recommended for speed/cost', recommended: true },
                            { label: 'OpenAI', sub: 'GPT-4o, GPT-3.5 Turbo' }
                          ].map((provider) => (
                            <li key={provider.label} className={clsx("flex items-start gap-3 p-3 rounded-lg border", provider ? "bg-zinc-50 border-zinc-100 opacity-60" : "bg-white border-zinc-100 shadow-sm")}>
                              <div className={clsx("mt-1 w-2 h-2 rounded-full", provider ? "bg-zinc-300" : "bg-green-500")} />
                              <div>
                                <div className="font-bold text-sm text-zinc-900">{provider.label}</div>
                                <div className="text-xs text-zinc-500 font-medium">{provider.sub}</div>
                              </div>
                              {provider.recommended && (
                                <span className="ml-auto text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">BEST</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-4">
                        <h5 className="font-bold text-sm uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" />
                          Security & Privacy
                        </h5>
                        <ul className="space-y-4">
                          {[
                            { text: 'Keys are encrypted at rest using AES-256.', icon: Check },
                            { text: 'Code snippets are sent to LLMs ephemerally for analysis only.', icon: Zap },
                            { text: 'We do not use your code to train models.', icon: ShieldCheck }
                          ].map((item, i) => (
                            <li key={i} className="flex items-center gap-3 text-sm text-zinc-600">
                              <div className="p-1.5 bg-zinc-100 rounded-md shrink-0">
                                <item.icon className="w-3.5 h-3.5 text-zinc-700" />
                              </div>
                              <span className="font-medium leading-relaxed">{item.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-zinc-50 border-t border-zinc-100 p-6 md:p-8">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-yellow-100 text-yellow-700 rounded-lg shrink-0">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-zinc-900 mb-1">Smart Routing</h4>
                        <p className="text-sm text-zinc-600 leading-relaxed">
                          ReviewScope automatically analyzes the complexity of a PR (lines of code, file types) to choose the most cost-effective model if multiple keys are provided, or uses the configured default.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Supported Languages */}
              <section id="supported-languages" className="scroll-mt-24 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                    <Globe className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-zinc-900">Supported Languages</h2>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { name: 'JavaScript / TS', ext: '.js, .ts, .tsx', color: 'bg-yellow-500' },
                    { name: 'Python', ext: '.py', color: 'bg-blue-500' },
                    { name: 'Go', ext: '.go', color: 'bg-cyan-500' },
                    { name: 'Java', ext: '.java', color: 'bg-red-500' },
                    { name: 'C / C++', ext: '.c, .cpp', color: 'bg-indigo-500' },
                  ].map((lang) => (
                    <div key={lang.name} className="group p-4 bg-white border border-zinc-200 rounded-xl hover:border-zinc-300 hover:shadow-md transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={clsx("w-2 h-2 rounded-full", lang.color)} />
                        <div className="font-bold text-sm text-zinc-900">{lang.name}</div>
                      </div>
                      <div className="text-xs text-zinc-400 font-mono bg-zinc-50 px-2 py-1 rounded inline-block group-hover:bg-zinc-100 transition-colors">
                        {lang.ext}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Default Rules */}
              <section id="default-rules" className="scroll-mt-24 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-zinc-900">Default Rules</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { title: 'Missing Error Handling', desc: 'Flags empty catch blocks and unhandled promises.', color: 'bg-red-500', icon: AlertCircle },
                    { title: 'Console Log Detection', desc: 'Identifies console.log statements in production code.', color: 'bg-yellow-500', icon: Terminal },
                    { title: 'Unsafe Patterns', desc: 'Detects eval(), innerHTML, and other security risks.', color: 'bg-orange-500', icon: ShieldCheck },
                    { title: 'TODO/FIXME Tracker', desc: 'Highlights technical debt markers.', color: 'bg-blue-500', icon: Check }
                  ].map((rule) => (
                    <div key={rule.title} className="p-5 bg-white border border-zinc-200 rounded-xl hover:shadow-sm transition-all">
                      <div className="flex items-start gap-3">
                        <div className={clsx("p-2 rounded-lg text-white shrink-0", rule.color)}>
                          <rule.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-zinc-900 text-sm mb-1">{rule.title}</h4>
                          <p className="text-sm text-zinc-500 leading-snug">{rule.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Commands & Workflow */}
              <section id="commands" className="scroll-mt-24 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">
                    <Command className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-zinc-900">Commands & Workflow</h2>
                </div>
                
                <div className="bg-zinc-900 rounded-2xl overflow-hidden shadow-xl border border-zinc-800">
                  <div className="flex items-center gap-2 px-4 py-3 bg-zinc-950 border-b border-zinc-800">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                    </div>
                    <div className="text-xs font-mono text-zinc-500 ml-2">review-workflow</div>
                  </div>
                  
                  <div className="p-6 space-y-8">
                    {/* Step 1 */}
                    <div className="relative pl-8 border-l border-zinc-800">
                      <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-zinc-900"></div>
                      <h4 className="text-sm font-bold text-zinc-100 mb-2">1. Automatic Review</h4>
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        Simply open a Pull Request. ReviewScope will post a review within seconds.
                      </p>
                    </div>

                    {/* Step 2 */}
                    <div className="relative pl-8 border-l border-zinc-800">
                      <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-purple-500 ring-4 ring-zinc-900"></div>
                      <h4 className="text-sm font-bold text-zinc-100 mb-3">2. Manual Trigger</h4>
                      <div className="bg-black/50 rounded-lg p-3 font-mono text-xs text-zinc-300 border border-zinc-800 inline-block mb-2">
                        <span className="text-purple-400">@Review-scope</span> re-review
                      </div>
                      <p className="text-xs text-zinc-500">Use this to force a re-scan after pushing commits.</p>
                    </div>

                    {/* Step 3 */}
                    <div className="relative pl-8 border-l-0 border-zinc-800">
                      <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-pink-500 ring-4 ring-zinc-900"></div>
                      <h4 className="text-sm font-bold text-zinc-100 mb-3">3. Interactive Chat</h4>
                      <div className="bg-black/50 rounded-lg p-3 font-mono text-xs text-zinc-300 border border-zinc-800 inline-block mb-2">
                        <span className="text-purple-400">@Review-scope</span> Why is this variable nullable?
                      </div>
                      <p className="text-xs text-zinc-500">ReviewScope replies with context-aware answers.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Troubleshooting */}
              <section id="troubleshooting" className="scroll-mt-24 space-y-6 pb-12">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-zinc-900">Troubleshooting</h2>
                </div>
                
                <div className="grid gap-4">
                  {[
                    { q: "Why didn't I get a review?", a: "Check if the repo is Active in the dashboard, if you have a valid API Key, and if the files are supported." },
                    { q: "'Verification Failed' error", a: "Your API Key is likely invalid or expired. Generate a new key from your provider and update Settings." },
                    { q: "Review is taking too long", a: "Large PRs (>50 files) may take up to 2 minutes. Feel free to contact support if it persists." }
                  ].map((item, i) => (
                    <details key={i} className="group bg-white border border-zinc-200 rounded-xl px-6 py-4 [&_summary::-webkit-details-marker]:hidden open:ring-2 open:ring-zinc-900/5 hover:border-zinc-300 transition-all cursor-pointer">
                      <summary className="flex items-center justify-between font-bold text-zinc-900">
                        {item.q}
                        <div className="transition-transform group-open:rotate-180 text-zinc-400">
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </summary>
                      <div className="pt-4 text-sm text-zinc-600 leading-relaxed border-t border-zinc-100 mt-4">
                        {item.a}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ARCHITECTURE */}
        {activeTab === 'architecture' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <h2 className="text-3xl font-black tracking-tight text-zinc-900">System Architecture</h2>
              <p className="text-zinc-500 text-lg">
                A deep dive into the microservices, event-driven design, and data flow that powers ReviewScope.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { title: 'API Service', icon: Server, color: 'text-blue-500', bg: 'bg-blue-50', desc: 'Built with Hono. Handles GitHub Webhooks, verifies HMAC signatures, and manages the database.' },
                { title: 'Worker Service', icon: Cpu, color: 'text-purple-500', bg: 'bg-purple-50', desc: 'Node.js worker using BullMQ. Processes jobs for analysis, indexing, and chat interactions.' },
                { title: 'Core Engines', icon: Layers, color: 'text-amber-500', bg: 'bg-amber-50', desc: 'Context Engine (Diff + RAG) and Rules Engine (AST Analysis) working in tandem.' }
              ].map((service) => (
                <div key={service.title} className="p-6 bg-white border border-zinc-200 rounded-2xl hover:shadow-lg transition-all group">
                  <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors", service.bg, service.color)}>
                    <service.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 mb-2">{service.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{service.desc}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <section className="space-y-6">
                <h3 className="text-xl font-bold flex items-center gap-2 text-zinc-900">
                  <Database className="w-5 h-5 text-zinc-500" />
                  Data Model
                </h3>
                <div className="bg-zinc-900 rounded-xl p-6 shadow-xl border border-zinc-800">
                  <pre className="font-mono text-xs text-zinc-300 overflow-x-auto custom-scrollbar">
{`// Core Schema (Postgres + Drizzle)

Installations
  ├── id: uuid
  ├── github_installation_id: int
  └── settings: jsonb (Keys, Config)

Repositories
  ├── id: uuid
  ├── installation_id: uuid
  ├── is_active: boolean
  └── indexed_at: timestamp

Reviews
  ├── id: uuid
  ├── pr_number: int
  ├── context_hash: text
  └── status: pending | completed`}
                  </pre>
                </div>
              </section>

              <section className="space-y-6">
                <h3 className="text-xl font-bold flex items-center gap-2 text-zinc-900">
                  <Zap className="w-5 h-5 text-zinc-500" />
                  The Pipeline
                </h3>
                <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-6">
                  {[
                    { step: 1, title: 'Webhook', desc: 'GitHub sends pull_request event. API verifies signature.' },
                    { step: 2, title: 'Queue', desc: 'Job added to Redis (BullMQ) with high priority.' },
                    { step: 3, title: 'Analysis', desc: 'Worker fetches context, runs static analysis, then LLM.' },
                    { step: 4, title: 'Response', desc: 'Review posted back to GitHub PR via API.' }
                  ].map((item) => (
                    <div key={item.step} className="flex gap-4 relative">
                      {item.step !== 4 && <div className="absolute left-[15px] top-8 bottom-[-24px] w-0.5 bg-zinc-100"></div>}
                      <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-xs shrink-0 z-10">
                        {item.step}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-zinc-900">{item.title}</h4>
                        <p className="text-xs text-zinc-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* CONTRIBUTING */}
        {activeTab === 'contributing' && (
          <div className="max-w-3xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 text-center py-12">
            <div className="w-20 h-20 bg-zinc-100 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3">
              <GitPullRequest className="w-10 h-10 text-zinc-900" />
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-black tracking-tight text-zinc-900">Become a Contributor</h2>
              <p className="text-lg text-zinc-500 max-w-xl mx-auto">
                We're building the future of code review together. Join our community and help us improve ReviewScope.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-left">
              <a href="https://github.com/Review-scope/ReviewScope/issues" target="_blank" className="group p-6 bg-white border border-zinc-200 rounded-2xl hover:border-zinc-300 hover:shadow-lg transition-all">
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl w-fit group-hover:scale-110 transition-transform">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-zinc-900 mb-2">Report Bugs</h3>
                <p className="text-sm text-zinc-500">Found an issue? Open a ticket on our issue tracker and we'll look into it.</p>
              </a>
              
              <a href="https://github.com/Review-scope/ReviewScope/pulls" target="_blank" className="group p-6 bg-white border border-zinc-200 rounded-2xl hover:border-zinc-300 hover:shadow-lg transition-all">
                <div className="mb-4 p-3 bg-blue-50 text-blue-600 rounded-xl w-fit group-hover:scale-110 transition-transform">
                  <FileCode className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-zinc-900 mb-2">Submit PRs</h3>
                <p className="text-sm text-zinc-500">Fix a bug or add a feature. We welcome all contributions!</p>
              </a>
            </div>

            <div className="pt-8 border-t border-zinc-200">
              <p className="text-sm text-zinc-400 font-medium">
                ReviewScope is open source under the MIT License.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}