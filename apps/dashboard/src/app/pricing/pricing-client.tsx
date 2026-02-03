'use client';

import { useState, useEffect } from "react";
import { Mail, Check, X, User, Building2, ChevronDown, CheckCircle2, CreditCard } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

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

  const paramId = searchParams.get("accountId") ? parseInt(searchParams.get("accountId")!) : null;
  const initialAccount = accounts.find(a => a.id === paramId) || accounts[0];

  const [selectedAccountId, setSelectedAccountId] = useState<number>(initialAccount?.id || 0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    if (paramId) {
      const account = accounts.find(a => a.id === paramId);
      if (account) {
        setSelectedAccountId(account.id);
      }
    }
  }, [paramId, accounts]);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  const handleAccountChange = (accountId: number) => {
    setSelectedAccountId(accountId);
    setIsDropdownOpen(false);
    router.replace(`/pricing?accountId=${accountId}`, { scroll: false });
  };

  const plans = [
    {
      name: "Free",
      price: "Free",
      period: "forever",
      description: "For individual developers & open-source projects. Try ReviewScope with zero risk.",
      features: [
        "Unlimited repositories",
        "PR review on GitHub",
        "AST-based analysis",
        "Issue-to-PR validation",
        "Suggested fixes",
        "Bring your own API key",
        "Basic noise control",
        "Works with public & private repos",
      ],
      notIncluded: [
        // "Cross-repo context",
        // "Vector memory",
        // "Review history",
        // "Team features",
        // "Priority support",
      ],
      limits: [
        "60 PR reviews / month",
        "No persistent storage",
        "No background indexing",
      ],
      highlighted: false,
      cta: "Get Started",
    },
    {
      name: "Pro",
      price: "$15",
      period: "/month",
      description: "For serious developers & small teams. Everything you need for high-quality PR reviews.",
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
      limits: [],
      highlighted: true,
      cta: "Upgrade to Pro",
    },
    {
      name: "Enterprise",
      price: "Contact Sales",
      period: "",
      description: "For teams that need control, security & scale. Built for organizations with compliance and scale needs.",
      features: [
        "Everything in Pro, plus:",
        "Team & org-level configuration",
        "Shared review rules",
        "Self-hosted or private deployment",
        "Dedicated support channel",
        "Custom usage limits",
        "Security & compliance assistance",
        "Audit-friendly setup",
        "Optional SLA",
      ],
      notIncluded: [],
      limits: [],
      highlighted: false,
      cta: "Contact Sales",
    },
  ];

  return (
    <div className="py-10 px-4 md:px-8 max-w-7xl mx-auto space-y-16">
      <div className="max-w-3xl mx-auto text-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Simple, Transparent <span className="text-primary">Pricing.</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
          Run ReviewScope on your own API keys. You control the AI spend; we provide the orchestration, context, and review engine.
        </p>
      </div>

      {accounts.length > 0 && selectedAccount && (
        <div className="flex justify-center">
          <div className="relative inline-block text-left z-20">
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Upgrading for:
              </span>
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
                  <span className="font-bold text-sm truncate w-full text-left">
                    {selectedAccount.name}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {selectedAccount.type} • {selectedAccount.planName}
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
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
                          <span className="font-medium truncate w-full text-left">
                            {account.name}
                          </span>
                          <span className="text-[10px] opacity-70 capitalize">
                            {account.planName} Plan
                          </span>
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
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`relative flex flex-col p-8 rounded-3xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
              plan.highlighted
                ? "bg-primary text-primary-foreground scale-[1.03] border-primary shadow-lg z-10"
                : "bg-card border-border shadow-sm"
            }`}
          >
            {plan.highlighted && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold tracking-wide">
                Most Popular
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">{plan.name}</h2>
              <p className={plan.highlighted ? "text-sm opacity-90" : "text-sm text-muted-foreground"}>
                {plan.description}
              </p>
            </div>

            <div className="mb-6 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
              {plan.period && (
                <span className={plan.highlighted ? "text-lg opacity-80" : "text-lg text-muted-foreground"}>
                  {plan.period}
                </span>
              )}
            </div>

            {plan.limits && plan.limits.length > 0 && (
              <div className={`mb-6 p-4 rounded-xl border ${plan.highlighted ? "border-white/20 bg-white/10" : "border-border/50 bg-muted/30"}`}>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 opacity-80">
                  Limits
                </h3>
                <ul className="space-y-1">
                  {plan.limits.map((limit) => (
                    <li key={limit} className="text-xs flex items-center gap-2 opacity-80">
                      <div className="w-1.5 h-1.5 rounded-full bg-current" />
                      {limit}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <ul className="space-y-3 mb-8 flex-1">
              {plan.features.map((feat) => (
                <li key={feat} className="flex items-start gap-3">
                  <Check
                    className={`w-5 h-5 shrink-0 ${
                      plan.highlighted ? "text-primary-foreground" : "text-primary"
                    }`}
                  />
                  <span className="text-sm font-medium leading-normal">{feat}</span>
                </li>
              ))}
              {plan.notIncluded &&
                plan.notIncluded.map((feat) => (
                  <li key={feat} className="flex items-start gap-3 opacity-50">
                    <X className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-medium leading-normal">{feat}</span>
                  </li>
                ))}
            </ul>

            <a
              href={
                plan.name === "Pro" && selectedAccount
                  ? getPaymentLink(dodoLinks.pro, selectedAccountId)
                  : plan.name === "Enterprise"
                  ? "mailto:parasverma7454@gmail.com"
                  : "/dashboard"
              }
              className={`w-full py-3.5 rounded-xl font-bold text-sm text-center transition-all flex items-center justify-center gap-2 ${
                plan.highlighted
                  ? "bg-white text-primary hover:bg-gray-100"
                  : "bg-primary text-primary-foreground hover:opacity-90 shadow-lg"
              } ${
                 selectedAccount && selectedAccount.planName === plan.name
                 ? "opacity-50 cursor-not-allowed pointer-events-none"
                 : ""
              }`}
            >
              {selectedAccount && selectedAccount.planName === plan.name ? "Current Plan" : (plan.name === "Enterprise" ? "Contact Sales" : plan.cta)}
            </a>
          </div>
        ))}
      </div>

      <div className="max-w-3xl mx-auto text-center space-y-3">
        <div className="inline-flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground bg-accent/50 py-2 px-4 rounded-full mx-auto mb-4">
          <CreditCard className="w-4 h-4" />
          <span>We accept both Card and UPI payments via Dodo Payments</span>
        </div>
        <p className="text-sm text-muted-foreground">
          ReviewScope runs on your own OpenAI or Gemini API keys. You pay them directly; we never mark up your AI usage.
        </p>
        <p className="text-xs text-muted-foreground">
          Questions about which plan is right for you?{" "}
          <a
            href="mailto:parasverma7454@gmail.com"
            className="text-primary font-semibold hover:underline"
          >
            Email us
          </a>
          .
        </p>
      </div>
    </div>
  );
}
