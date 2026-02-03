export enum PlanTier {
  FREE = 'FREE',
  PRO = 'PRO',
}

export interface PlanLimits {
  tier: PlanTier;
  allowAI: boolean;
  allowRAG: boolean;
  ragK: number;
  allowCustomPrompts: boolean;
  allowOrg: boolean;
  cooldownMinutes: number;
  monthlyReviewsLimit: number;
}

// Map internal numeric plan IDs to tiers
const PLAN_ID_MAP: Record<number, PlanTier> = {
  0: PlanTier.FREE,
  1: PlanTier.PRO,
};

export function getTier(planId: number | null): PlanTier {
  // Default to FREE if no plan ID or unknown
  if (!planId && planId !== 0) return PlanTier.FREE;
  return PLAN_ID_MAP[planId] || PlanTier.FREE;
}

export function getPlanLimits(planId: number | null, expiresAt?: Date | null): PlanLimits {
  const tier = getTier(planId);
  // If expired, downgrade to FREE (planId=0 => FREE)
  // Recursively call with null expiresAt to avoid infinite loop
  if (expiresAt && expiresAt < new Date()) return getPlanLimits(null, null);

  switch (tier) {
    case PlanTier.PRO:
      return {
        tier,
        allowAI: true,
        allowRAG: true,
        ragK: 8,
        allowCustomPrompts: true,
        allowOrg: true,
        cooldownMinutes: 1,
        monthlyReviewsLimit: Infinity,
      };
    case PlanTier.FREE:
    default:
      return {
        tier: PlanTier.FREE,
        allowAI: true,
        allowRAG: false,
        ragK: 0,
        allowCustomPrompts: false,
        allowOrg: true,
        cooldownMinutes: 10,
        monthlyReviewsLimit: 60,
      };
  }
}

