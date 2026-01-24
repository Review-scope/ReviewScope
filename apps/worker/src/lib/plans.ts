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
  maxMonthlyActivations: number;
  allowCustomPrompts: boolean;
  chatPerPRLimit: number | 'unlimited';
  allowOrg: boolean;
  
  // Rate Limits
  reviewsPerPR: number;
  dailyReviewsLimit: number;
  cooldownMinutes: number;
}

// Map GitHub Marketplace Plan IDs to our Tiers
// These IDs come from your GitHub App marketplace settings
const PLAN_ID_MAP: Record<number, PlanTier> = {
  3: PlanTier.FREE, // Free plan (default)
  7: PlanTier.PRO,  // Pro plan
  8: PlanTier.TEAM, // Team plan
};

export function getTier(planId: number | null): PlanTier {
  // Default to FREE if no plan ID or unknown
  if (!planId) return PlanTier.FREE;
  return PLAN_ID_MAP[planId] || PlanTier.FREE;
}

export function getPlanLimits(planId: number | null, expiresAt?: Date | null): PlanLimits {
  const tier = getTier(planId);

  // If plan has expired, we still default to FREE limits
  if (expiresAt && expiresAt < new Date()) {
    return getPlanLimits(null, null); // Fallback to Free
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
        reviewsPerPR: 50,
        dailyReviewsLimit: 500,
        cooldownMinutes: 1,
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
        reviewsPerPR: 20,
        dailyReviewsLimit: 100,
        cooldownMinutes: 5,
      };
    case PlanTier.FREE:
    default:
      return {
        tier: PlanTier.FREE,
        allowAI: true, // Requires BYO key
        allowRAG: true,
        ragK: 2,
        maxFiles: 30,
        maxRepos: 3,
        maxMonthlyActivations: 5, // 3 active + 2 swaps
        allowCustomPrompts: false,
        chatPerPRLimit: 3,
        allowOrg: false,
        reviewsPerPR: 5,
        dailyReviewsLimit: 20,
        cooldownMinutes: 10,
      };
  }
}

