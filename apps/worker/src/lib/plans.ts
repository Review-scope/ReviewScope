export enum PlanTier {
  FREE = 'FREE',
  PRO = 'PRO',
  TEAM = 'TEAM',
}

export interface PlanLimits {
  tier: PlanTier;
  allowAI: boolean;
  allowRAG: boolean;
  ragK: number;
  maxFiles: number;
  maxRepos: number;
  allowCustomPrompts: boolean;
  chatPerPRLimit: number | 'unlimited';
  allowOrg: boolean;
}

// Map GitHub Marketplace Plan IDs to our Tiers
// These IDs come from your GitHub App marketplace settings
const PLAN_ID_MAP: Record<number, PlanTier> = {
  3: PlanTier.FREE, // Free plan (default)
  7: PlanTier.PRO,  // Pro plan
  8: PlanTier.TEAM, // Team plan
};

export function getTier(planId: number | null): PlanTier {
  // Default to Free plan (3) if not specified
  if (!planId) return PlanTier.FREE;
  return PLAN_ID_MAP[planId] || PlanTier.FREE;
}

export function getPlanLimits(planId: number | null): PlanLimits {
  const tier = getTier(planId);

  switch (tier) {
    case PlanTier.TEAM:
      return {
        tier,
        allowAI: true,
        allowRAG: true,
        ragK: 8,
        maxFiles: 999999, // Effectively unlimited (with batching)
        maxRepos: 999999,
        allowCustomPrompts: true,
        chatPerPRLimit: 'unlimited',
        allowOrg: true,
      };
    case PlanTier.PRO:
      return {
        tier,
        allowAI: true,
        allowRAG: true,
        ragK: 5,
        maxFiles: 100,
        maxRepos: 5,
        allowCustomPrompts: true,
        chatPerPRLimit: 'unlimited',
        allowOrg: true,
      };
    case PlanTier.FREE:
    default:
      return {
        tier,
        allowAI: true, // Requires BYO key
        allowRAG: true,
        ragK: 2,
        maxFiles: 30,
        maxRepos: 3,
        allowCustomPrompts: false,
        chatPerPRLimit: 3,
        allowOrg: false,
      };
  }
}

