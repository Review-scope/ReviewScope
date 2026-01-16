export var PlanTier;
(function (PlanTier) {
    PlanTier["FREE"] = "FREE";
    PlanTier["PRO"] = "PRO";
    PlanTier["TEAM"] = "TEAM";
})(PlanTier || (PlanTier = {}));
// Map GitHub Marketplace Plan IDs to our Tiers
// These IDs come from your GitHub App marketplace settings
const PLAN_ID_MAP = {
    3: PlanTier.FREE, // Free plan (default)
    7: PlanTier.PRO, // Pro plan
    8: PlanTier.TEAM, // Team plan
};
export function getTier(planId) {
    // Default to Free plan (3) if not specified
    if (!planId)
        return PlanTier.FREE;
    return PLAN_ID_MAP[planId] || PlanTier.FREE;
}
export function getPlanLimits(planId, expiresAt) {
    const tier = getTier(planId);
    // If plan has expired, downgrade to FREE
    if (expiresAt && expiresAt < new Date()) {
        return getPlanLimits(3, null); // Fallback to Free plan
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
//# sourceMappingURL=plans.js.map