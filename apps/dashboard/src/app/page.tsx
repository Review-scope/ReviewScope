import { Github, CheckCircle2, ArrowRight, Key, Zap, Globe, Lock, MessagesSquare, Sparkles, X } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/authOptions";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="flex flex-col items-center pb-20 overflow-x-hidden bg-background">
      <section className="relative w-full pt-24 pb-12 px-6 md:px-12 flex flex-col items-center justify-start overflow-hidden">
        
        {/* DYNAMIC BACKGROUND */}
        <div className="absolute inset-0 -z-10 bg-background">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_70%_0%,#000_70%,transparent_100%)]"></div>
          <div className="absolute top-0 right-0 w-[1000px] h-[600px] bg-primary/10 blur-[120px] rounded-full opacity-40 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-[800px] h-[600px] bg-blue-500/5 blur-[120px] rounded-full opacity-30"></div>
        </div>

        <div className="max-w-[1400px] w-full grid lg:grid-cols-2 gap-12 lg:gap-20 items-center relative z-10">
          
          {/* LEFT COLUMN: PITCH */}
          <div className="flex flex-col items-start space-y-8 text-left">
            
            {/* BADGE */}
            <div className="animate-in fade-in slide-in-from-left-8 duration-1000">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-widest uppercase shadow-[0_0_20px_-5px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_-5px_rgba(var(--primary),0.5)] transition-all cursor-default">
                <Github className="w-3 h-3 animate-pulse" />
                <span>Open-Source</span>
              </div>
            </div>

            {/* HEADLINE */}
            <div className="space-y-2">
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] animate-in fade-in slide-in-from-left-12 duration-1000 delay-100">
                Code Reviews
              </h1>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] animate-in fade-in slide-in-from-left-12 duration-1000 delay-200">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-foreground/50">
                  On Autopilot.
                </span>
              </h1>
            </div>

            {/* SUBHEAD */}
            <p className="text-xl text-muted-foreground max-w-xl font-medium leading-relaxed animate-in fade-in slide-in-from-left-8 duration-1000 delay-300">
              Automated code reviews that go beyond the diff. Catch bugs and enforce standards with an AI that understands your <span className="text-foreground font-bold border-b-2 border-primary/50">entire repository context</span>.
            </p>

            {/* CTAS */}
            <div className="flex flex-col w-full sm:w-auto sm:flex-row items-center sm:items-start gap-4 pt-4 animate-in fade-in slide-in-from-left-8 duration-1000 delay-500">
              <Link 
                href={session ? "/dashboard" : "/signin"}
                className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:shadow-[0_0_40px_-10px_rgba(var(--primary),0.5)] transition-all hover:-translate-y-1 hover:scale-105 active:scale-95 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                {session ? "Go to Dashboard" : "Start for Free"}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/pricing" 
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-background border border-input rounded-full font-bold text-lg hover:bg-accent hover:text-accent-foreground transition-all hover:-translate-y-1"
              >
                View Pricing
              </Link>
            </div>

            {/* SOCIAL PROOF */}
            <div className="pt-4 flex items-center gap-6 animate-in fade-in slide-in-from-left-8 duration-1000 delay-700 opacity-80">
               <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
                 <div className="flex -space-x-3">
                   {[1,2,3,4].map(i => (
                     <div key={i} className="w-9 h-9 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] overflow-hidden shadow-sm">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} alt="User" />
                     </div>
                   ))}
                 </div>
                 <div className="flex flex-col">
                    <span className="text-foreground font-bold">1,000+ Developers</span>
                    <span className="text-xs">Trust ReviewScope</span>
                 </div>
               </div>
            </div>

          </div>

          {/* RIGHT COLUMN: VISUAL */}
          <div className="relative perspective-[2000px] group animate-in fade-in slide-in-from-right-12 duration-1000 delay-300 w-full max-w-[90vw] mx-auto lg:max-w-none">
            {/* Decorative Elements */}
            <div className="absolute -top-20 -right-20 w-[400px] h-[400px] bg-primary/20 blur-[100px] rounded-full opacity-40 pointer-events-none"></div>
            
            {/* Main Window */}
            <div className="relative bg-[#0d1117] border border-white/10 rounded-xl shadow-2xl overflow-hidden transform transition-all duration-700 hover:scale-[1.02] hover:-rotate-y-6 hover:rotate-x-2 shadow-primary/20">
              
              {/* Window Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                </div>
                <div className="text-xs font-mono text-gray-400">review_scope_demo.tsx</div>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-sky-500 animate-pulse shadow-[0_0_8px_rgba(14,165,233,0.6)]"></div>
                   <span className="text-[10px] text-sky-400 font-bold font-mono uppercase tracking-wider">Live Analysis</span>
                </div>
              </div>

              {/* Code Area */}
              <div className="p-6 pb-24 md:p-8 md:pb-28 font-mono text-[10px] sm:text-xs md:text-sm leading-relaxed text-left relative bg-linear-to-b from-[#0d1117] to-[#0d1117]/95 overflow-x-auto">
                
                <div className="flex gap-4 opacity-40 min-w-max">
                   <div className="text-muted-foreground select-none text-right w-6">1</div>
                   <div><span className="text-blue-400">import</span> <span className="text-white">React</span> <span className="text-blue-400">from</span> <span className="text-orange-300">'react'</span>;</div>
                </div>
                <div className="flex gap-4 opacity-40 min-w-max">
                   <div className="text-muted-foreground select-none text-right w-6">2</div>
                </div>
                <div className="flex gap-4 min-w-max">
                   <div className="text-muted-foreground select-none text-right w-6">3</div>
                   <div><span className="text-purple-400">export</span> <span className="text-blue-400">async</span> <span className="text-purple-400">function</span> <span className="text-yellow-300">processOrder</span><span className="text-white">(orderId) {'{'}</span></div>
                </div>
                
                {/* Buggy Line */}
                <div className="flex gap-4 relative bg-red-500/10 -mx-6 px-6 py-2 border-l-2 border-red-500 my-2 min-w-max">
                   <div className="text-muted-foreground select-none text-right w-6">4</div>
                   <div className="text-white">
                     <span className="text-blue-400">const</span> user <span className="text-blue-400">=</span> <span className="text-blue-400">await</span> db.<span className="text-yellow-300">getUser</span>(orderId); <span className="text-gray-500">// ⚠️ Bug</span>
                   </div>
                   
                   {/* AI Comment Popover - Positioned absolutely relative to this line */}
                   <div className="absolute top-full left-10 md:left-20 mt-4 w-70 md:w-87.5 z-30 transform origin-top-left animate-in fade-in zoom-in duration-500 delay-1000">
                      <div className="bg-[#1c1c1c] border border-primary/30 rounded-lg shadow-2xl p-4 relative backdrop-blur-xl">
                        <div className="absolute -top-2 left-4 w-4 h-4 bg-[#1c1c1c] border-t border-l border-primary/30 rotate-45"></div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="bg-primary/20 text-primary p-1 rounded-md">
                            <Sparkles className="w-3 h-3" />
                          </div>
                          <span className="text-xs font-bold text-primary">ReviewScope AI</span>
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed">
                          Type mismatch detected. <code className="bg-white/10 px-1 rounded text-white font-mono">getUser</code> expects an integer, but <code className="bg-white/10 px-1 rounded text-white font-mono">orderId</code> is likely a string from params.
                        </p>
                        <div className="mt-3 flex gap-2">
                           <button className="text-[10px] bg-primary text-primary-foreground px-3 py-1.5 rounded hover:bg-primary/90 transition-colors font-medium cursor-pointer shadow-lg shadow-primary/20">Fix it</button>
                           <button className="text-[10px] bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded transition-colors text-gray-400 cursor-pointer">Dismiss</button>
                        </div>
                      </div>
                   </div>
                </div>

                <div className="flex gap-4 opacity-40 min-w-max">
                   <div className="text-muted-foreground select-none text-right w-6">5</div>
                   <div className="text-white">
                     <span className="text-blue-400">if</span> (!user) <span className="text-blue-400">throw</span> <span className="text-blue-400">new</span> <span className="text-yellow-300">Error</span>(<span className="text-orange-300">'User not found'</span>);
                   </div>
                </div>
                <div className="flex gap-4 opacity-40 min-w-max">
                   <div className="text-muted-foreground select-none text-right w-6">6</div>
                   <div className="text-white">
                     <span className="text-blue-400">await</span> emailService.<span className="text-yellow-300">sendConfirmation</span>(user.email);
                   </div>
                </div>
                <div className="flex gap-4 opacity-40 min-w-max">
                   <div className="text-muted-foreground select-none text-right w-6">7</div>
                   <div className="text-white">{'}'}</div>
                </div>
              </div>
            </div>

            {/* Back Window Layer (Depth) */}
            <div className="absolute top-4 -right-4 w-full h-full bg-[#0d1117]/50 border border-white/5 rounded-xl -z-10 blur-[1px] transform rotate-3 scale-95 opacity-50"></div>
          </div>

        </div>
      </section>

      <section className="py-8 border-y border-white/5 bg-gradient-to-b from-background via-white/5 to-background relative overflow-hidden">
        {/* Background Noise/Grid */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-soft-light"></div>
        
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-primary/80 mb-2">Powering The Future</h2>
            <p className="text-muted-foreground text-sm">ReviewScope leverages top-tier infrastructure & models</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 items-center justify-items-center opacity-80">
            {/* Gemini */}
            <div className="flex flex-col items-center gap-4 group cursor-default transition-all duration-500 hover:scale-110 hover:opacity-100">
              <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-blue-500/50 group-hover:shadow-[0_0_30px_-10px_rgba(59,130,246,0.5)] transition-all duration-500">
                 <img src="/gemini-color.svg" alt="Gemini" className="w-10 h-10 grayscale group-hover:grayscale-0 transition-all duration-500" />
              </div>
              <span className="text-sm font-bold tracking-widest text-muted-foreground group-hover:text-blue-400 transition-colors">GEMINI</span>
            </div>

            {/* OpenAI */}
            {/* OpenAI */}
            <div className="flex flex-col items-center gap-4 group cursor-default transition-all duration-500 hover:scale-110 hover:opacity-100">
              <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-green-500/50 group-hover:shadow-[0_0_30px_-10px_rgba(34,197,94,0.5)] transition-all duration-500">
                 <img src="/openai.svg" alt="OpenAI" className="w-10 h-10 invert dark:invert-0 grayscale group-hover:grayscale-0 transition-all duration-500" />
              </div>
              <span className="text-sm font-bold tracking-widest text-muted-foreground group-hover:text-green-500 transition-colors">OPENAI</span>
            </div>

            {/* GitHub */}
            <div className="flex flex-col items-center gap-4 group cursor-default transition-all duration-500 hover:scale-110 hover:opacity-100">
              <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-gray-500/50 group-hover:shadow-[0_0_30px_-10px_rgba(107,114,128,0.5)] transition-all duration-500">
                 <Github className="w-10 h-10 text-foreground grayscale group-hover:grayscale-0 transition-all duration-500" />
              </div>
              <span className="text-sm font-bold tracking-widest text-muted-foreground group-hover:text-gray-500 transition-colors">GITHUB</span>
            </div>

            {/* Vercel (Simulated with text/icon since no svg) or generic "Cloud" */}
            <div className="flex flex-col items-center gap-4 group cursor-default transition-all duration-500 hover:scale-110 hover:opacity-100">
              <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-purple-500/50 group-hover:shadow-[0_0_30px_-10px_rgba(168,85,247,0.5)] transition-all duration-500">
                 <Globe className="w-10 h-10 text-foreground grayscale group-hover:grayscale-0 group-hover:text-purple-400 transition-all duration-500" />
              </div>
              <span className="text-sm font-bold tracking-widest text-muted-foreground group-hover:text-purple-400 transition-colors">GLOBAL</span>
            </div>

          </div>
        </div>
      </section>

      {/* Global Features Section */}
      <section className="w-full py-32 px-6 md:px-12 relative overflow-hidden bg-slate-50">
        {/* Subtle Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        
        {/* Ambient Glow - Toned Down */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[500px] bg-white blur-[120px] rounded-full pointer-events-none opacity-60"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-24 space-y-6">
             <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full border border-slate-200 bg-white text-slate-900 text-xs font-bold uppercase tracking-widest mb-4 shadow-sm">
               Capabilities
             </div>
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-slate-900 drop-shadow-sm">
              Everything you need to <br className="hidden md:block" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600">ship faster.</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">
              ReviewScope replaces the "LGTM" rubber stamp with intelligent, context-aware code analysis that actually understands your codebase.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[
              { 
                icon: <Key className="w-6 h-6" />, 
                title: "Your Keys, Your Costs", 
                desc: "We don't markup AI costs. Plug in your own OpenAI or Gemini API key and pay the provider directly. Zero middleman fees."
              },
              { 
                icon: <Sparkles className="w-6 h-6" />, 
                title: "Smart Context", 
                desc: "The AI doesn't just read the diff. It reads related files, type definitions, and imports to understand the full picture."
              },
              { 
                icon: <Zap className="w-6 h-6" />, 
                title: "Hybrid Engine", 
                desc: "Static analysis catches syntax and logic errors instantly. AI focuses on architecture, readability, and complex bugs."
              },
              { 
                icon: <Globe className="w-6 h-6" />, 
                title: "Private & Secure", 
                desc: "Your code never trains our models. We only process what's needed for the review and discard it immediately."
              },
              { 
                icon: <Lock className="w-6 h-6" />, 
                title: "Guardrails", 
                desc: "Define custom rules and instructions. Tell the AI to watch out for specific patterns or enforce your team's style guide."
              },
              { 
                icon: <MessagesSquare className="w-6 h-6" />, 
                title: "Interactive Chat", 
                desc: "Don't agree with a comment? Reply to the AI directly in the PR. It will explain its reasoning or adjust its feedback."
              }
            ].map((feat, i) => (
              <div 
                key={feat.title} 
                className="group relative p-8 rounded-3xl bg-white border border-slate-200 hover:border-slate-300 transition-all duration-500 hover:shadow-xl hover:-translate-y-2 overflow-hidden hover:shadow-slate-200/50"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10 flex flex-col h-full">
                  <div className="mb-6 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 text-slate-900 group-hover:scale-110 group-hover:bg-slate-100 transition-all duration-300 shadow-sm">
                    {feat.icon}
                  </div>
                  <h3 className="font-bold text-xl mb-3 text-slate-900 group-hover:text-slate-800 transition-colors">{feat.title}</h3>
                  <p className="text-slate-600 leading-relaxed text-sm group-hover:text-slate-700 transition-colors">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="w-full py-24 md:py-32 px-4 md:px-8 bg-white relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.03),transparent_50%)]"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20 space-y-6">
            <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-900 text-xs font-bold uppercase tracking-widest mb-4">
              The Pipeline
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900">
              From PR to Merged.
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              ReviewScope orchestrates a sophisticated analysis pipeline that combines speed with deep intelligence.
            </p>
          </div>

          <div className="relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-slate-200 via-slate-400 to-slate-200 -translate-y-1/2 z-0"></div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 relative z-10">
              {[
                { 
                  step: "01", 
                  title: "Static Analysis", 
                  desc: "AST-based detectors instantly flag syntax errors, security risks, and anti-patterns.",
                  icon: <Zap className="w-6 h-6 text-yellow-500" />
                },
                { 
                  step: "02", 
                  title: "Complexity Scoring", 
                  desc: "The diff is analyzed for size and risk to determine the optimal review depth.",
                  icon: <Sparkles className="w-6 h-6 text-blue-500" />
                },
                { 
                  step: "03", 
                  title: "Context Assembly", 
                  desc: "RAG engine fetches relevant files, types, and docs to give the AI full context.",
                  icon: <Globe className="w-6 h-6 text-purple-500" />
                },
                { 
                  step: "04", 
                  title: "AI Validation", 
                  desc: "Gemini or OpenAI validates findings and provides actionable, human-like feedback.",
                  icon: <CheckCircle2 className="w-6 h-6 text-green-500" />
                }
              ].map((item, i) => (
                <div key={item.step} className="group relative">
                  {/* Step Card */}
                  <div className="h-full bg-white border border-slate-200 rounded-3xl p-8 flex flex-col items-center text-center transition-all duration-500 hover:border-slate-300 hover:-translate-y-2 hover:shadow-[0_0_50px_-10px_rgba(0,0,0,0.1)] relative overflow-hidden">
                    
                    {/* Hover Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                    {/* Step Number Badge */}
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center font-mono font-bold text-slate-900 mb-6 group-hover:scale-110 group-hover:bg-slate-100 transition-all duration-300 shadow-sm relative z-10">
                      {item.icon}
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mb-3 relative z-10">{item.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed relative z-10">{item.desc}</p>

                    {/* Step Number Background */}
                    <div className="absolute -bottom-6 -right-6 text-8xl font-black text-slate-100 select-none pointer-events-none group-hover:text-slate-200 transition-colors duration-500">
                      {item.step}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>





      {/* Pricing Section */}
      <section className="w-full py-32 px-6 md:px-12 relative border-t border-slate-200 bg-slate-50 overflow-hidden">
         {/* Background Effects */}
         <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] opacity-100"></div>
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[500px] bg-white blur-[120px] rounded-full pointer-events-none opacity-60"></div>
         
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20 space-y-4">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900">Simple, transparent pricing.</h2>
            <p className="text-slate-600 max-w-xl mx-auto text-xl font-medium">
              Run on your own API keys. Pay only for what you use.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {[
              {
                name: "Free",
                price: "Free",
                period: "forever",
                description: "For individual developers & open-source projects.",
                features: [
                  "PR review on GitHub",
                  "AST-based analysis",
                  "Issue-to-PR validation",
                  "Suggested fixes",
                  "Bring your own API key",
                  "Basic noise control",
                  "Works with public & private repos"
                ],
                notIncluded: [],
                limits: [
                  "60 PR reviews / month",
                  "No persistent storage",
                  "No background indexing"
                ],
                cta: "Get Started",
                highlighted: false
              },
              {
                name: "Pro",
                price: "$15",
                period: "/month",
                description: "For serious developers & small teams requiring high-quality reviews.",
                features: [
                  "Everything in Free, plus:",
                  "Unlimited PR reviews",
                  "Smart multi-file batching",
                  "High-precision RAG (8 results)",
                  "Advanced model routing",
                  "Custom review guidelines",
                  "1-minute priority cooldown",
                  "Optional vector memory",
                  "Priority feature updates",
                ],
                notIncluded: [],
                cta: "Upgrade to Pro",
                highlighted: true
              },
              {
                name: "Enterprise",
                price: "Custom",
                period: "",
                description: "For organizations with strict compliance and scale needs.",
                features: [
                  "Everything in Pro, plus:",
                  "Team & org-level configuration",
                  "Shared review rules",
                  "Self-hosted or private deployment",
                  "Dedicated support channel",
                  "Custom usage limits",
                  "Security & compliance assistance",
                  "Audit-friendly setup",
                  "Optional SLA"
                ],
                notIncluded: [],
                cta: "Contact Sales",
                highlighted: false
              }
            ].map((plan, i) => (
              <div 
                key={plan.name} 
                className={`relative flex flex-col p-8 rounded-3xl border transition-all duration-300 h-full ${
                  plan.highlighted 
                    ? "bg-slate-900 border-slate-900 shadow-[0_0_50px_-10px_rgba(0,0,0,0.2)] z-10 scale-105 text-white" 
                    : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xl hover:-translate-y-1 text-slate-900"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold tracking-wide shadow-lg">
                    MOST POPULAR
                  </div>
                )}
                <div className="mb-8">
                  <h3 className={`text-xl font-bold mb-2 ${plan.highlighted ? "text-white" : "text-slate-900"}`}>
                    {plan.name}
                  </h3>
                  <p className={`text-sm leading-relaxed h-10 ${plan.highlighted ? "text-slate-400" : "text-slate-500"}`}>
                    {plan.description}
                  </p>
                </div>
                <div className="mb-8 flex items-baseline gap-1">
                  <span className={`text-4xl font-black tracking-tight ${plan.highlighted ? "text-white" : "text-slate-900"}`}>{plan.price}</span>
                  <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">
                    {plan.period}
                  </span>
                </div>
                
                {plan.limits && (
                   <div className={`mb-6 p-4 rounded-xl border ${plan.highlighted ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-100"}`}>
                      <h4 className="font-bold text-[10px] uppercase tracking-widest mb-3 text-slate-500">Limits</h4>
                      <ul className="space-y-2">
                        {plan.limits.map(limit => (
                          <li key={limit} className={`text-xs flex items-center gap-2 ${plan.highlighted ? "text-slate-400" : "text-slate-600"}`}>
                             <div className={`w-1.5 h-1.5 rounded-full ${plan.highlighted ? "bg-white/20" : "bg-slate-300"}`}></div>
                             {limit}
                          </li>
                        ))}
                      </ul>
                   </div>
                )}

                <ul className="space-y-3 mb-10 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-3">
                      <CheckCircle2 className={`w-5 h-5 shrink-0 ${plan.highlighted ? "text-white" : "text-blue-600"}`} />
                      <span className={`text-sm font-medium leading-relaxed ${plan.highlighted ? "text-slate-300" : "text-slate-600"}`}>{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.name === 'Enterprise' ? 'mailto:parasverma7454@gmail.com' : '/pricing'}
                  className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider text-center transition-all ${
                    plan.highlighted 
                      ? "bg-white text-slate-900 hover:bg-slate-100 shadow-lg shadow-white/10" 
                      : "bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-16 bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
            <p className="text-sm text-slate-600">
              <span className="font-bold text-slate-900">ReviewScope runs on your own API keys.</span> You pay for Gemini/OpenAI usage directly—we bill you for our platform orchestration.
            </p>
            <p className="text-xs text-slate-500">
              No hidden fees. Cancel anytime. Pricing updates available on <Link href="/pricing" className="text-slate-900 font-bold hover:underline">the pricing page</Link>.
            </p>
          </div>
        </div>
      </section>



      {/* CTA Section */}
      <section className="w-full bg-primary/5 border-t py-20 px-8">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold">Ready to level up your code reviews?</h2>
            <p className="text-lg text-muted-foreground">Join 1000+ developers using ReviewScope. Start for free—no credit card required.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href={session ? "/dashboard" : "/signin"}
              className="inline-flex items-center gap-3 px-10 py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-primary/30 transition-all hover:-translate-y-1 hover:scale-105 active:scale-95"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 animate-pulse" />
            </Link>
            <Link 
              href="/pricing" 
              className="inline-flex items-center gap-3 px-10 py-4 bg-card border-2 border-border rounded-2xl font-bold text-lg hover:border-primary/50 transition-colors"
            >
              View Plans
            </Link>
          </div>
        </div>
      </section>

      {/* Sponsors Section */}
      <section className="w-full py-24 px-8 border-t relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 -skew-y-3 transform origin-bottom-left scale-150 opacity-20 pointer-events-none"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="mb-12 space-y-4">
            <h2 className="text-4xl font-black tracking-tight">Backed by the Community</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              ReviewScope is made possible by these visionary supporters.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {/* Sponsor Card Placeholder */}
            <div className="group relative overflow-hidden rounded-3xl border border-dashed border-primary/30 bg-primary/5 p-8 transition-all hover:border-primary/60 hover:bg-primary/10 hover:shadow-[0_0_40px_-10px_rgba(var(--primary),0.2)] cursor-pointer">
               <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
               <div className="flex flex-col items-center justify-center h-40 gap-4">
                 <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                    <Sparkles className="w-8 h-8 text-primary/50 group-hover:text-primary transition-colors" />
                 </div>
                 <div className="space-y-1">
                   <p className="font-bold text-lg">Visionary Sponsor</p>
                   <p className="text-sm text-muted-foreground">Your Logo Here</p>
                 </div>
               </div>
            </div>

            {/* Individual Supporters Placeholder */}
             <div className="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 flex flex-col items-center justify-center h-full text-center hover:border-primary/30 transition-colors">
               <div className="flex -space-x-3 mb-6">
                 {[1,2,3,4,5].map(i => (
                   <div key={i} className="w-10 h-10 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[10px] overflow-hidden grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500 hover:scale-110 hover:z-10">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=sponsor${i}`} alt="Supporter" />
                   </div>
                 ))}
                 <div className="w-10 h-10 rounded-full border-2 border-card bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                   +12
                 </div>
               </div>
               <p className="font-medium text-foreground">Join our individual supporters</p>
             </div>
          </div>

          <Link 
            href="/sponsors" 
            className="inline-flex items-center gap-3 px-10 py-4 bg-foreground text-background rounded-full font-bold text-lg hover:shadow-2xl hover:-translate-y-1 transition-all group"
          >
            Become a Sponsor
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          
        </div>
      </section>
    </div>
  );
}
