export enum PlanTier {
  NONE = 'NONE',
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
  maxMonthlyActivations: number;
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
  // If no plan ID, return NONE
  if (!planId) return PlanTier.NONE;
  return PLAN_ID_MAP[planId] || PlanTier.FREE;
}

export function getPlanLimits(planId: number | null, expiresAt?: Date | null): PlanLimits {
  const tier = getTier(planId);

  // If plan has expired, downgrade to NONE
  if (expiresAt && expiresAt < new Date()) {
    return getPlanLimits(null, null); // Fallback to None
  }

  switch (tier) {
    case PlanTier.TEAM:
      return {
        tier,
        allowAI: true,
        allowRAG: true,
        ragK: 8,
        maxFiles: 999999, // Effectively unlimited (with batching)
        maxRepos: 999999,
        maxMonthlyActivations: 999999,
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
        maxMonthlyActivations: 20, // 5 active + 15 swaps
        allowCustomPrompts: true,
        chatPerPRLimit: 'unlimited',
        allowOrg: true,
      };
    case PlanTier.FREE:
      return {
        tier,
        allowAI: true, // Requires BYO key
        allowRAG: true,
        ragK: 2,
        maxFiles: 30,
        maxRepos: 3,
        maxMonthlyActivations: 5, // 3 active + 2 swaps
        allowCustomPrompts: false,
        chatPerPRLimit: 3,
        allowOrg: false,
      };
    case PlanTier.NONE:
    default:
      return {
        tier: PlanTier.NONE,
        allowAI: false,
        allowRAG: false,
        ragK: 0,
        maxFiles: 0,
        maxRepos: 0,
        maxMonthlyActivations: 0,
        allowCustomPrompts: false,
        chatPerPRLimit: 0,
        allowOrg: false,
      };
  }
}

