'use client';

import { useState, useEffect } from 'react';
import { Check, X, Star, HelpCircle, User, Building2, ChevronDown, CheckCircle2 } from "lucide-react";
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type Account = {
  id: number;
  name: string;
  type: 'User' | 'Organization';
  avatarUrl?: string;
  planId: number;
  planName: string;
};

type PricingClientProps = {
  accounts: Account[];
  dodoLinks: {
    free: string | undefined;
    pro: string | undefined;
    team: string | undefined;
  };
};

function getPaymentLink(baseUrl: string | undefined, accountId: number) {
  if (!baseUrl) return '#';
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}metadata_client_reference_id=${accountId}&client_reference_id=${accountId}`;
}

export function PricingClient({ accounts, dodoLinks }: PricingClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Default to the first account (usually User) if no param or invalid param
  const paramId = searchParams.get('accountId') ? parseInt(searchParams.get('accountId')!) : null;
  const initialAccount = accounts.find(a => a.id === paramId) || accounts[0];

  const [selectedAccountId, setSelectedAccountId] = useState<number>(initialAccount?.id || 0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Update selection if URL param changes (e.g. navigation)
  useEffect(() => {
    if (paramId) {
      const account = accounts.find(a => a.id === paramId);
      if (account) {
        setSelectedAccountId(account.id);
      }
    }
  }, [paramId, accounts]);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId) || accounts[0];

  // Sync URL when selection changes
  const handleAccountChange = (accountId: number) => {
    setSelectedAccountId(accountId);
    setIsDropdownOpen(false);
    router.replace(`/pricing?accountId=${accountId}`, { scroll: false });
  };

  const tiers = [
    {
      name: "Free",
      id: "free",
      planId: 3,
      description: "Best for individual developers trying ReviewScope",
      price: "$0",
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

  if (!selectedAccount) {
    return <div className="text-center py-20">Please log in to view pricing for your account.</div>;
  }

  const currentPlanId = selectedAccount.planId;

  return (
    <div className="py-20 px-4 md:px-8 max-w-7xl mx-auto space-y-16">
      {/* Header & Account Selector */}
      <div className="text-center max-w-3xl mx-auto space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Simple, Transparent <span className="text-primary">Pricing.</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            ReviewScope runs on your own API keys. You pay for the platform's orchestration and advanced RAG features.
          </p>
        </div>

        {/* Account Selector */}
        {accounts.length > 0 && (
          <div className="relative inline-block text-left z-20">
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Upgrading for:</span>
            </div>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="inline-flex items-center justify-between gap-3 w-[280px] px-4 py-3 bg-card border border-border rounded-xl shadow-sm hover:border-primary/50 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                {selectedAccount.type === 'Organization' ? (
                  <Building2 className="w-5 h-5 text-orange-600 shrink-0" />
                ) : (
                  <User className="w-5 h-5 text-blue-600 shrink-0" />
                )}
                <div className="flex flex-col items-start truncate">
                  <span className="font-bold text-sm truncate w-full text-left">{selectedAccount.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">{selectedAccount.type} • {selectedAccount.planName}</span>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-[280px] bg-card border border-border rounded-xl shadow-xl z-20 max-h-[300px] overflow-y-auto">
                  <div className="p-1">
                    {accounts.map((account) => (
                      <button
                        key={account.id}
                        onClick={() => handleAccountChange(account.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          selectedAccountId === account.id 
                            ? 'bg-primary/10 text-primary' 
                            : 'hover:bg-accent text-foreground'
                        }`}
                      >
                        {account.type === 'Organization' ? (
                          <Building2 className="w-4 h-4 shrink-0" />
                        ) : (
                          <User className="w-4 h-4 shrink-0" />
                        )}
                        <div className="flex flex-col items-start truncate flex-1">
                          <span className="font-medium truncate w-full text-left">{account.name}</span>
                          <span className="text-[10px] opacity-70 capitalize">{account.planName} Plan</span>
                        </div>
                        {selectedAccountId === account.id && (
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {tiers.map((tier) => {
          const isCurrentPlan = currentPlanId === tier.planId || (currentPlanId === 0 && tier.planId === 3); // 0 (missing) defaults to Free (3)
          const upgradeUrl = tier.id === 'free' 
            ? getPaymentLink(dodoLinks.free, selectedAccountId)
            : tier.id === 'pro'
            ? getPaymentLink(dodoLinks.pro, selectedAccountId)
            : getPaymentLink(dodoLinks.team, selectedAccountId);

          return (
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

              {isCurrentPlan && (
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
                href={isCurrentPlan ? '#' : upgradeUrl}
                target={isCurrentPlan ? undefined : (tier.planId === 3 ? '_self' : '_blank')}
                rel={isCurrentPlan ? undefined : (tier.planId === 3 ? undefined : 'noopener noreferrer')}
                className={`w-full py-4 rounded-xl font-bold text-base text-center transition-all ${
                  isCurrentPlan
                    ? 'bg-green-600 text-white cursor-default opacity-90 pointer-events-none'
                    : tier.featured 
                    ? "bg-white text-primary hover:bg-gray-100" 
                    : "bg-primary text-primary-foreground hover:opacity-90 shadow-lg"
                }`}
              >
                {isCurrentPlan ? 'Current Plan' : (tier.planId === 3 ? 'Downgrade to Free' : tier.cta)}
              </a>
            </div>
          );
        })}
      </div>

      {/* FAQ Section */}
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
              Upgrades are seamless via our secure payment provider. Select the account you want to upgrade above, and the changes will apply immediately after payment.
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
              To ensure platform stability, we apply soft limits on the number of PRs reviewed per day. These aren't billing units—they're protection against abuse.
            </p>
          </div>
          <div className="space-y-3">
            <h4 className="font-bold text-lg">Can I cancel anytime?</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Yes. You can manage your subscription directly from our dashboard. Cancellations take effect at the end of your billing cycle.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
