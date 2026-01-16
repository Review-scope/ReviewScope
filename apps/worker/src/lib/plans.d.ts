export declare enum PlanTier {
    FREE = "FREE",
    PRO = "PRO",
    TEAM = "TEAM"
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
export declare function getTier(planId: number | null): PlanTier;
export declare function getPlanLimits(planId: number | null, expiresAt?: Date | null): PlanLimits;
//# sourceMappingURL=plans.d.ts.map