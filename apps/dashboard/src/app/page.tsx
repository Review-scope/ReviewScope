import { Github, CheckCircle2, ArrowRight, Key, Zap, Globe, Lock, MessagesSquare, Sparkles } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/authOptions";
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="flex flex-col items-center pb-20 overflow-x-hidden">
      <section className="relative w-full pt-16 md:pt-32 pb-16 md:pb-24 px-4 md:px-8 flex flex-col items-center text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
        <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#8080800a_3px,transparent_3px),linear-gradient(to_bottom,#8080800a_3px,transparent_3px)] bg-size-[44px_44px] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

        <div className="animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] md:text-xs font-bold tracking-wider mb-8 uppercase">
            <Sparkles className="w-3 h-3" />
            Empowering 1000+ developers
          </div>
        </div>


        <div className="max-w-4xl space-y-6 md:space-y-8 relative">
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.1] md:leading-[1.05]">
            Engineering Quality <br className="hidden sm:block" />
            <span className="bg-clip-text text-transparent bg-linear-to-r from-primary via-blue-500 to-indigo-600 animate-gradient">
              on Autopilot.
            </span>
          </h1>
          <p className="text-lg md:text-2xl text-muted-foreground leading-relaxed max-w-2xl mx-auto font-medium px-4">
            Professional AI code reviews that understand your context. 
            Secure, logic-aware, and powered by <span className="text-foreground font-bold">your own API keys.</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 mt-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
          <Link 
            href={session ? "/dashboard" : "/signin"}
            className="group relative inline-flex items-center gap-3 px-10 py-5 bg-primary text-primary-foreground rounded-2xl font-black text-xl hover:shadow-[0_20px_50px_rgba(var(--primary),0.3)] transition-all hover:-translate-y-1 active:scale-[0.98]"
          >
            {session ? "Go to Dashboard" : "Get Started Now"}
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link 
            href="/pricing" 
            className="inline-flex items-center gap-3 px-10 py-5 bg-card text-foreground border-2 border-border/50 rounded-2xl font-black text-xl hover:bg-accent transition-all hover:border-primary/30"
          >
            View Pricing
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full">
          <div className="border border-border/60 rounded-2xl bg-card/80 px-4 py-3 text-left">
            <div className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-1">
              Production Teams
            </div>
            <div className="text-lg font-bold tracking-tight">
              30+ using ReviewScope
            </div>
          </div>
          <div className="border border-border/60 rounded-2xl bg-card/80 px-4 py-3 text-left">
            <div className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-1">
              Cost Savings
            </div>
            <div className="text-lg font-bold tracking-tight">
              30%+ vs naive AI usage
            </div>
          </div>
          <div className="border border-border/60 rounded-2xl bg-card/80 px-4 py-3 text-left">
            <div className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-1">
              Review Latency
            </div>
            <div className="text-lg font-bold tracking-tight">
              &lt; 60s for simple PRs
            </div>
          </div>
        </div>

        {/* Visual Mockup Section */}
        <div className="mt-24 w-full max-w-5xl relative animate-in fade-in zoom-in duration-1000 delay-500">
          <div className="absolute -inset-4 bg-primary/20 blur-3xl opacity-20 rounded-[3rem] -z-10"></div>
          <div className="bg-card border-8 border-background rounded-[2.5rem] shadow-2xl overflow-hidden aspect-video md:aspect-21/9 flex flex-col">
            <div className="bg-muted/50 border-b p-4 flex items-center gap-2">
              <div className="flex gap-1.5 leading-none">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/30"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/30"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/30"></div>
              </div>
              <div className="ml-4 h-6 w-48 bg-muted rounded-md animate-pulse"></div>
            </div>
            <div className="flex-1 p-8 text-left space-y-6 overflow-hidden">
               <div className="space-y-3">
                 <div className="h-4 w-[80%] bg-muted rounded animate-pulse"></div>
                 <div className="h-4 w-[60%] bg-muted rounded animate-pulse"></div>
               </div>
               
               <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 relative">
                 <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-primary/8 flex items-center justify-center text-primary-foreground">
                       <img src="/logo1.png" alt="ReviewScope" className="w-6 h-6 object-contain" />
                     </div>
                     <span className="font-bold text-sm">ReviewScope AI</span>
                     <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-black">
                       CRITICAL
                     </span>
                   </div>
                   <div className="flex items-center justify-start sm:justify-end gap-2 text-[10px] text-muted-foreground">
                     <span className="hidden sm:inline">Powered by</span>
                     <img src="/gemini-color.svg" alt="Gemini" className="w-4 h-4" />
                     <img src="/openai.svg" alt="OpenAI" className="w-4 h-4" />
                   </div>
                 </div>
                 <div className="space-y-2">
                    <p className="font-bold text-sm">Race condition detected in queue consumer.</p>
                    <p className="text-xs text-muted-foreground">The transaction boundary should wrap the visibility timeout update to prevent double processing...</p>
                 </div>
               </div>

               <div className="space-y-3 opacity-30">
                 <div className="h-4 w-[70%] bg-muted rounded"></div>
                 <div className="h-4 w-[90%] bg-muted rounded"></div>
               </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground">
            Built on trusted AI providers
          </p>
          <div className="flex flex-wrap justify-center gap-12 md:gap-16 items-center">
            <div className="flex items-center gap-3">
              <img src="/gemini-color.svg" alt="Gemini" className="w-8 h-8" />
              <span className="font-bold text-xl">Gemini</span>
            </div>
            <div className="flex items-center gap-3">
              <img src="/openai.svg" alt="OpenAI" className="w-8 h-8" />
              <span className="font-bold text-xl">OpenAI</span>
            </div>
          </div>
        </div>
      </section>

      {/* Global Features Section */}
      <section className="w-full bg-accent/30 py-16 md:py-24 border-y">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12 md:mb-16 space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Enterprise Features</h2>
            <p className="text-sm md:text-base text-muted-foreground px-4">The core features that make ReviewScope elite.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 text-left">
            {[
              { 
                icon: <Key className="w-6 h-6" />, 
                title: "BYO AI Key", 
                desc: "AI reviews run using your own API keys. You control the costs and choices." 
              },
              { 
                icon: <Sparkles className="w-6 h-6" />, 
                title: "Complexity-Aware Routing", 
                desc: "Smart model selection: trivial changes use flash models, complex reviews use advanced models. 30%+ cost savings." 
              },
              { 
                icon: <Zap className="w-6 h-6" />, 
                title: "AST-Based Static Rules", 
                desc: "High-signal AST checks for JavaScript, TypeScript, Go, Java, and more that flag risky patterns and logic bugs before AI runs." 
              },
              { 
                icon: <Globe className="w-6 h-6" />, 
                title: "Private & Public Repos", 
                desc: "Secure reviews for both internal company code and open-source projects." 
              },
              { 
                icon: <Lock className="w-6 h-6" />, 
                title: "AI + Deterministic Fusion", 
                desc: "Static rules feed into AI for validation—LLM judges each finding as valid, false-positive, or contextual." 
              },
              { 
                icon: <MessagesSquare className="w-6 h-6" />, 
                title: "Flexible Billing", 
                desc: "Seamless upgrades via secure payments. Plan expiration tracking with auto-downgrade to Free." 
              }
            ].map((feat) => (
              <div key={feat.title} className="group p-5 md:p-6 border rounded-2xl bg-card hover:border-primary/50 transition-colors shadow-sm">
                <div className="mb-4 text-primary bg-primary/10 w-fit p-3 rounded-xl group-hover:bg-primary group-hover:text-primary-foreground transition-colors transition-all duration-300">
                  {feat.icon}
                </div>
                <h3 className="font-bold text-base md:text-lg mb-2">{feat.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="w-full py-16 md:py-24 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16 space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">How ReviewScope Works</h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto px-4">A multi-layer review pipeline that combines static analysis, context awareness, and intelligent AI.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                step: "1", 
                title: "Static Rules Run", 
                desc: "AST-based detectors find logic errors, unsafe patterns, and anti-patterns instantly. No AI needed." 
              },
              { 
                step: "2", 
                title: "Complexity Scored", 
                desc: "The PR is scored (trivial/simple/complex) based on files changed, risk patterns, and impact." 
              },
              { 
                step: "3", 
                title: "Context Assembled", 
                desc: "RAG + web context layers provide the LLM with repo knowledge, security data, and related code." 
              },
              { 
                step: "4", 
                title: "AI Validates", 
                desc: "Your chosen model (Gemini/OpenAI) reviews the code, validates static findings, and reports holistically." 
              }
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="bg-card border rounded-2xl p-6 md:p-8 h-full flex flex-col items-center sm:items-start text-center sm:text-left">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-base md:text-lg mb-4 shrink-0 shadow-lg shadow-primary/20">
                    {item.step}
                  </div>
                  <h3 className="font-bold text-base md:text-lg mb-3">{item.title}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">{item.desc}</p>
                </div>
                {parseInt(item.step) < 4 && (
                  <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 transition-transform duration-500">
                    <ArrowRight className="w-6 h-6 text-primary/50" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why ReviewScope Section */}
      <section className="w-full bg-muted/30 py-24 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">Why Choose ReviewScope?</h2>
            <p className="text-muted-foreground">Built for teams that want intelligent, cost-effective code reviews.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { 
                title: "30%+ Cost Savings", 
                desc: "Smart routing uses cheaper flash models for trivial changes, reserves expensive models for complex logic. You control your AI spend." 
              },
              { 
                title: "Context Aware", 
                desc: "RAG retrieval + web context means fewer hallucinations. The AI understands your repo, not just the diff." 
              },
              { 
                title: "Hybrid Reviews", 
                desc: "Static rules catch obvious bugs instantly. AI validates and adds nuance. Best of both worlds." 
              },
              { 
                title: "No Vendor Lock-In", 
                desc: "Your API keys = your data. No secrets sent to us. Cancel anytime, your reviews stay yours." 
              },
              { 
                title: "Fast for Simple PRs", 
                desc: "Trivial changes reviewed in <30 seconds. Complex reviews get deep analysis—as fast as your model allows." 
              },
              { 
                title: "Transparent Pricing", 
                desc: "Free tier for individuals. Pro/Team tiers via GitHub Marketplace. No surprise charges." 
              }
            ].map((item) => (
              <div key={item.title} className="bg-card border rounded-2xl p-8 hover:border-primary/50 transition-colors">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="w-full bg-accent/30 py-24 px-8 border-y">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Pay only for what you use. All tiers include static analysis and RAG context. Your API keys = you control the costs.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Free",
                price: "$0",
                period: "forever",
                description: "Perfect for individual developers and open-source",
                features: [
                  "Up to 3 repositories",
                  "Reviews up to 30 files per PR",
                  "RAG enabled (2 snippets)",
                  "Static analysis always free",
                  "AI reviews via BYO key",
                  "3 PR follow-up questions"
                ],
                cta: "Get Started",
                highlighted: false
              },
              {
                name: "Pro",
                price: "$15",
                period: "/month",
                description: "For power users & serious developers",
                features: [
                  "Up to 5 repositories",
                  "Reviews up to 100 files per PR",
                  "RAG enabled (5 snippets)",
                  "Custom review prompts",
                  "Unlimited PR follow-up questions",
                  "Personal & Org accounts"
                ],
                cta: "Upgrade to Pro",
                highlighted: true
              },
              {
                name: "Team",
                price: "$50",
                period: "/month",
                description: "For organizations & growing companies",
                features: [
                  "Unlimited repositories",
                  "Unlimited files (Smart Batching)",
                  "RAG enabled (8 snippets)",
                  "Org-wide shared guidelines",
                  "Audit logs & Admin controls",
                  "Priority 24/7 support"
                ],
                cta: "Contact Sales",
                highlighted: false
              }
            ].map((plan) => (
              <div 
                key={plan.name} 
                className={`relative flex flex-col p-8 rounded-3xl border transition-all ${
                  plan.highlighted 
                    ? "bg-primary text-primary-foreground scale-105 border-primary shadow-lg z-10" 
                    : "bg-card border-border shadow-sm"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold">
                    MOST POPULAR
                  </div>
                )}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className={`text-sm ${plan.highlighted ? "opacity-90" : "text-muted-foreground"}`}>
                    {plan.description}
                  </p>
                </div>
                <div className="mb-8 flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold tracking-tight">{plan.price}</span>
                  <span className={`text-xl ${plan.highlighted ? "opacity-70" : "text-muted-foreground"}`}>
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-4 mb-10 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-3">
                      <CheckCircle2 className={`w-5 h-5 shrink-0 ${plan.highlighted ? "text-primary-foreground" : "text-primary"}`} />
                      <span className="text-sm font-medium leading-normal">{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/pricing"
                  className={`w-full py-4 rounded-xl font-bold text-base text-center transition-all ${
                    plan.highlighted 
                      ? "bg-white text-primary hover:bg-gray-100" 
                      : "bg-primary text-primary-foreground hover:opacity-90 shadow-lg"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-16 bg-card border rounded-2xl p-8 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-foreground">ReviewScope runs on your own API keys.</span> You pay for Gemini/OpenAI usage directly—we bill you for our platform orchestration.
            </p>
            <p className="text-xs text-muted-foreground">
              No hidden fees. Cancel anytime. Pricing updates available on <Link href="/pricing" className="text-primary font-bold hover:underline">the pricing page</Link>.
            </p>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="w-full py-24 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">Built for Your Team</h2>
            <p className="text-muted-foreground">ReviewScope adapts to how you work.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                persona: "Indie Developer", 
                use: "Free plan covers your needs. Static rules are always on. RAG context available for code understanding. Add an API key for AI reviews.",
                features: ["3 repos", "RAG enabled", "Static analysis", "BYO API key optional"]
              },
              { 
                persona: "Growing Team", 
                use: "Pro plan unlocks higher limits, full RAG context with 5 snippets, and custom prompts. Control your own costs.",
                features: ["5 repos", "Full RAG (5 snippets)", "Unlimited chat", "Custom guidelines"]
              },
              { 
                persona: "Enterprise", 
                use: "Team plan scales to unlimited repos, deep RAG with 8 snippets, org-wide rules, audit logs, and priority support.",
                features: ["Unlimited repos", "Deep RAG (8 snippets)", "Smart batching", "24/7 support"]
              }
            ].map((item) => (
              <div key={item.persona} className="bg-card border rounded-2xl p-8 space-y-6">
                <div>
                  <h3 className="font-bold text-xl mb-2">{item.persona}</h3>
                  <p className="text-sm text-muted-foreground">{item.use}</p>
                </div>
                <ul className="space-y-2">
                  {item.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
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
              className="inline-flex items-center gap-3 px-10 py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
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
      <section className="w-full py-20 px-8 border-t">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-2xl font-bold">Backed by</h2>
            <p className="text-muted-foreground">Thank you to our supporters and sponsors who believe in better code reviews.</p>
          </div>
          <div className="bg-card border rounded-2xl p-12 flex flex-col items-center justify-center min-h-[200px] text-center">
            <p className="text-muted-foreground text-lg mb-4">Your brand here</p>
            <p className="text-sm text-muted-foreground max-w-md">
              Interested in sponsoring ReviewScope? 
              <br />
              <Link href="/support" className="text-primary font-bold hover:underline">
                Get in touch with us
              </Link>
            </p>
          </div>
          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              Early supporters who helped shape ReviewScope will be featured here. 
              <br />
              <Link href="mailto:parasverma7454@gmail.com" className="text-primary font-bold hover:underline">
                Become a sponsor
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
