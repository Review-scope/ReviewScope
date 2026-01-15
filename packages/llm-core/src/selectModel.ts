/**
 * Model Selection & Routing
 * 
 * Routes PR reviews to appropriate models based on:
 * 1. User's available API key (Gemini vs. OpenAI)
 * 2. PR complexity (trivial/simple/complex)
 * 3. Context budget allocation
 * 
 * Goal: 30-40% cost reduction with no quality loss
 */

export type Complexity = 'trivial' | 'simple' | 'complex';

export interface ModelRoute {
  provider: 'gemini' | 'openai';
  model: string;
  contextBudget: number;
  reason: string;
}

/**
 * Select model based on provider availability and PR complexity
 */
export function selectModel(
  availableProviders: {
    hasGemini: boolean;
    hasOpenAI: boolean;
  },
  complexity: Complexity
): ModelRoute {
  // If no providers available, return null (should be handled by caller)
  if (!availableProviders.hasGemini && !availableProviders.hasOpenAI) {
    return {
      provider: 'openai',
      model: 'none',
      contextBudget: 0,
      reason: 'No API keys configured',
    };
  }

  // Gemini-only available
  if (availableProviders.hasGemini && !availableProviders.hasOpenAI) {
    return selectGeminiModel(complexity);
  }

  // OpenAI-only available
  if (!availableProviders.hasGemini && availableProviders.hasOpenAI) {
    return selectOpenAIModel(complexity);
  }

  // Both available: prefer Gemini for cost savings
  // (Gemini Flash is cheaper than GPT-4o-mini for similar quality)
  if (complexity === 'complex') {
    return selectOpenAIModel(complexity); // Use powerful OpenAI for complex
  }

  return selectGeminiModel(complexity); // Use cheaper Gemini for trivial/simple
}

/**
 * Select Gemini model based on complexity
 */
function selectGeminiModel(complexity: Complexity): ModelRoute {
  switch (complexity) {
    case 'trivial':
      return {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        contextBudget: 4000, // Small budget for simple changes
        reason: 'Trivial changes: minimal context needed',
      };

    case 'simple':
      return {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        contextBudget: 6000, // Standard budget
        reason: 'Simple changes: Gemini Flash sufficient',
      };

    case 'complex':
      return {
        provider: 'gemini',
        model: 'gemini-2.5-pro',
        contextBudget: 12000, // Full budget for complex
        reason: 'Complex changes: using Gemini Pro',
      };
  }
}

/**
 * Select OpenAI model based on complexity
 */
function selectOpenAIModel(complexity: Complexity): ModelRoute {
  switch (complexity) {
    case 'trivial':
      return {
        provider: 'openai',
        model: 'gpt-4o-mini',
        contextBudget: 6000, // GPT-4o-mini for trivial
        reason: 'Trivial changes: using GPT-4o-mini for cost',
      };

    case 'simple':
      return {
        provider: 'openai',
        model: 'gpt-4o-mini',
        contextBudget: 9000, // Standard budget
        reason: 'Simple changes: GPT-4o-mini sufficient',
      };

    case 'complex':
      return {
        provider: 'openai',
        model: 'gpt-4o',
        contextBudget: 20000, // Full budget for complex
        reason: 'Complex changes: using GPT-4o for depth',
      };
  }
}

/**
 * Get context budget for a specific model
 * (Used if caller already selected model, just needs budget)
 */
export function getContextBudgetForModel(model: string): number {
  switch (model) {
    case 'gemini-2.5-flash':
      return 6000;
    case 'gemini-2.5-pro':
      return 12000;
    case 'gpt-4o-mini':
      return 9000;
    case 'gpt-4o':
      return 20000;
    default:
      return 8000; // Conservative default
  }
}

/**
 * Cost estimation for different model routes
 * (For analytics/optimization purposes)
 */
export interface CostEstimate {
  model: string;
  costPerMTok: number; // Cost per million tokens
  estimatedCostPerReview: number; // Rough estimate for typical review
}

export function estimateCost(model: string, estimatedTokens: number = 8000): CostEstimate {
  const tokenCost = estimatedTokens / 1_000_000;

  let costPerMTok: number;
  let estimatedCostPerReview: number;

  switch (model) {
    case 'gemini-2.5-flash':
      costPerMTok = 0.075; // $0.075 per million input tokens
      estimatedCostPerReview = tokenCost * costPerMTok;
      break;

    case 'gemini-2.5-pro':
      costPerMTok = 1.5; // $1.50 per million input tokens
      estimatedCostPerReview = tokenCost * costPerMTok;
      break;

    case 'gpt-4o-mini':
      costPerMTok = 0.15; // $0.15 per million input tokens
      estimatedCostPerReview = tokenCost * costPerMTok;
      break;

    case 'gpt-4o':
      costPerMTok = 5.0; // $5.00 per million input tokens
      estimatedCostPerReview = tokenCost * costPerMTok;
      break;

    default:
      costPerMTok = 0.1;
      estimatedCostPerReview = tokenCost * costPerMTok;
  }

  return {
    model,
    costPerMTok,
    estimatedCostPerReview: Math.round(estimatedCostPerReview * 100000) / 100000, // Round to 5 decimals
  };
}

/**
 * Compare cost of routes for the same PR
 */
export function compareCosts(
  complexity: Complexity,
  tokensUsed: number
): Array<{
  route: ModelRoute;
  cost: CostEstimate;
  savings?: number;
}> {
  const routes = [
    selectGeminiModel(complexity),
    selectOpenAIModel(complexity),
  ];

  const costs = routes.map(route => ({
    route,
    cost: estimateCost(route.model, tokensUsed),
  }));

  // Calculate savings of cheapest vs. most expensive
  const cheapest = costs.reduce((min, c) => 
    c.cost.estimatedCostPerReview < min.cost.estimatedCostPerReview ? c : min
  );

  return costs.map(c => ({
    ...c,
    savings: c.route.model !== cheapest.route.model
      ? c.cost.estimatedCostPerReview - cheapest.cost.estimatedCostPerReview
      : undefined,
  }));
}
