import { Check, X, Shield, Star, Building2, HelpCircle } from "lucide-react";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db, installations } from '@/lib/db';
import { eq, inArray } from 'drizzle-orm';
import { getUserOrgIds } from "@/lib/github";

export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  const customerAccountId = (session?.user as any)?.id || 'CUSTOMER_ACCOUNT_ID';

  // Fetch user's current installations/plans
  let activePlanIds: number[] = [];
  if (session?.user) {
    // @ts-expect-error session.accessToken exists
    const accessToken = session.accessToken;
    const orgIds = accessToken ? await getUserOrgIds(accessToken) : [];
    const allAccountIds = [parseInt(customerAccountId), ...orgIds];

    const currentInstallations = await db
      .select()
      .from(installations)
      .where(inArray(installations.githubAccountId, allAccountIds));
    
    activePlanIds = currentInstallations.map(inst => inst.planId || 0);
  }
  const tiers = [
    {
      name: "Free",
      id: "free",
      planId: 3,
      description: "Best for individual developers trying ReviewScope",
      price: "$0",
      upgradeUrl: `https://github.com/marketplace/review-scope/upgrade/3/${customerAccountId}`,
      features: [
        "Up to 3 repositories",
        "Reviews up to 30 files per PR",
        "RAG enabled (limited context)",
        "AI reviews via your own key",
        "Personal GitHub accounts only",
        "3 PR follow-up questions",
      ],
      notIncluded: [
        "Unlimited repos",
        "Large PR smart batching",
        "Custom review prompts",
        "Org-wide shared rules",
      ],
      cta: "Get Started",
      featured: false,
    },
    {
      name: "Pro",
      id: "pro",
      planId: 7,
      description: "Best for power users & serious developers",
      price: "$15",
      period: "/mo",
      upgradeUrl: `https://github.com/marketplace/review-scope/upgrade/7/${customerAccountId}`,
      features: [
        "Up to 5 repositories",
        "Reviews up to 100 files per PR",
        "Full RAG (all files context)",
        "Optional custom prompts",
        "Unlimited PR follow-up questions",
        "Personal or Org accounts",
        "Priority processing",
      ],
      notIncluded: [
        "Unlimited repos",
        "Large PR smart batching",
        "Audit logs & Admin controls",
      ],
      cta: "Upgrade to Pro",
      featured: true,
    },
    {
      name: "Team",
      id: "team",
      planId: 8,
      description: "Best for organizations & growing companies",
      price: "$50",
      period: "/mo",
      upgradeUrl: `https://github.com/marketplace/review-scope/upgrade/8/${customerAccountId}`,
      features: [
        "Unlimited repositories",
        "Unlimited files (Smart Batching)",
        "Full RAG + Historical Memory",
        "Org-wide shared guidelines",
        "Shared team dashboard",
        "Audit logs & controls",
        "Priority 24/7 support",
      ],
      notIncluded: [],
      cta: "Upgrade to Team",
      featured: false,
    },
  ];

  return (
    <div className="py-20 px-8 max-w-7xl mx-auto space-y-24">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-6">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Simple, Transparent <span className="text-primary">Pricing.</span>
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          ReviewScope runs on your own API keys. You pay for the platform's orchestration and advanced RAG features, while keeping total control over your AI spend.
        </p>
      </div>

      {/* Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {tiers.map((tier) => (
          <div 
            key={tier.id} 
            className={`relative flex flex-col p-8 rounded-3xl border transition-all hover:shadow-xl ${
              tier.featured 
                ? "bg-primary text-primary-foreground scale-105 border-primary shadow-lg z-10" 
                : "bg-card border-border shadow-sm"
            }`}
          >
            {tier.featured && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-bold tracking-wide flex items-center gap-1 shadow-md">
                <Star className="w-4 h-4 fill-white" />
                MOST POPULAR
              </div>
            )}

            {(activePlanIds.includes(tier.planId) || (activePlanIds.includes(0) && tier.planId === 3)) && (
              <div className="absolute top-0 right-4 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-md">
                ACTIVE PLAN
              </div>
            )}
            
            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
              <p className={`text-sm ${tier.featured ? "opacity-90" : "text-muted-foreground"}`}>
                {tier.description}
              </p>
            </div>

            <div className="mb-8 flex items-baseline gap-1">
              <span className="text-5xl font-extrabold tracking-tight">{tier.price}</span>
              {tier.period && (
                <span className={`text-xl ${tier.featured ? "opacity-70" : "text-muted-foreground"}`}>
                  {tier.period}
                </span>
              )}
            </div>

            <ul className="space-y-4 mb-10 flex-1">
              {tier.features.map((feat) => (
                <li key={feat} className="flex items-start gap-3">
                  <Check className={`w-5 h-5 shrink-0 ${tier.featured ? "text-primary-foreground" : "text-primary"}`} />
                  <span className="text-sm font-medium leading-normal">{feat}</span>
                </li>
              ))}
              {tier.notIncluded.map((feat) => (
                <li key={feat} className="flex items-start gap-3 opacity-40">
                  <X className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-medium leading-normal">{feat}</span>
                </li>
              ))}
            </ul>

            <a
              href={(activePlanIds.includes(tier.planId) || (activePlanIds.includes(0) && tier.planId === 3)) ? '#' : tier.upgradeUrl}
              target={(activePlanIds.includes(tier.planId) || (activePlanIds.includes(0) && tier.planId === 3)) ? undefined : '_blank'}
              rel={(activePlanIds.includes(tier.planId) || (activePlanIds.includes(0) && tier.planId === 3)) ? undefined : 'noopener noreferrer'}
              className={`w-full py-4 rounded-xl font-bold text-base text-center transition-all ${
                activePlanIds.includes(tier.planId) || (activePlanIds.includes(0) && tier.planId === 3)
                  ? 'bg-green-600 text-white cursor-default opacity-90 pointer-events-none'
                  : tier.featured 
                  ? "bg-white text-primary hover:bg-gray-100" 
                  : "bg-primary text-primary-foreground hover:opacity-90 shadow-lg"
              }`}
            >
              {activePlanIds.includes(tier.planId) || (activePlanIds.includes(0) && tier.planId === 3) ? 'Current Plan' : tier.cta}
            </a>
          </div>
        ))}
      </div>

      {/* FAQ / Notes Section */}
      <section className="bg-accent/30 rounded-3xl p-8 md:p-12 border border-dashed text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-background border rounded-full text-sm font-semibold shadow-sm">
          <HelpCircle className="w-4 h-4 text-primary" />
          Frequently Asked Questions
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-left max-w-4xl mx-auto">
          <div className="space-y-3">
            <h4 className="font-bold text-lg">Why do I need my own API Key?</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We want you to have 100% ownership of your AI costs and data. By using your own Gemini or OpenAI keys, you only pay for what you use at cost, while using our advanced RAG and integration engine.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-bold text-lg">How do upgrades work?</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Upgrades are seamless via GitHub Marketplace. When you purchase a plan, we automatically detect it and update your account within seconds. Your plan limits take effect immediately.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-bold text-lg">What happens when my plan expires?</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your account is automatically downgraded to Free when your plan expires. You'll retain access to your first 3 repositories and all static analysis features. You can re-upgrade anytime.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-bold text-lg">Does Static Analysis cost anything?</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              No. Our rule-based linting and pattern checks are always free to run on your registered repositories, even if you haven't added an AI key yet.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-bold text-lg">What are fair-use rate limits?</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              To ensure platform stability, we apply soft limits on the number of PRs reviewed per day. These aren't billing units—they're protection against abuse and typically won't affect standard development workflows.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-bold text-lg">Can I cancel anytime?</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Yes. You can manage your subscription directly from GitHub Marketplace or our dashboard. Cancellations take effect at the end of your billing cycle. You'll keep your account and data.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
