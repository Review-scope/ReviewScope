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

import { getContextBudget } from './modelBudgets.js';

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
    return availableProviders.hasOpenAI
      ? selectOpenAIModel(complexity)
      : selectGeminiModel(complexity);
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
        model: 'gemini-2.5-flash-lite',
        contextBudget: getContextBudget('gemini-2.5-flash-lite'),
        reason: 'Trivial changes: using lowest cost Flash-Lite',
      };

    case 'simple':
      return {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        contextBudget: getContextBudget('gemini-2.5-flash'),
        reason: 'Simple changes: Gemini Flash sufficient',
      };

    case 'complex':
      return {
        provider: 'gemini',
        model: 'gemini-3-flash',
        contextBudget: getContextBudget('gemini-3-flash'),
        reason: 'Complex changes: using Gemini 3 Flash for better reasoning',
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
        model: 'gpt-5-nano-2025-08-07',
        contextBudget: getContextBudget('gpt-5-nano-2025-08-07'),
        reason: 'Trivial changes: using gpt-5-nano for cost',
      };

    case 'simple':
      return {
        provider: 'openai',
        model: 'gpt-5-mini-2025-08-07',
        contextBudget: getContextBudget('gpt-5-mini-2025-08-07'),
        reason: 'Simple changes: GPT-5-mini sufficient',
      };

    case 'complex':
      return {
        provider: 'openai',
        model: 'gpt-5.2-2025-12-11',
        contextBudget: getContextBudget('gpt-5.2-2025-12-11'),
        reason: 'Complex changes: using GPT-5.2 for depth',
      };
  }
}

/**
 * Get context budget for a specific model
 * (Used if caller already selected model, just needs budget)
 */
export function getContextBudgetForModel(model: string): number {
  return getContextBudget(model);
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

export function estimateCost(
  model: string,
  estimatedTokens = 8000
): CostEstimate {
  const tokenCost = estimatedTokens / 1_000_000;

  let costPerMTok = 0;

  switch (model) {
    case 'gemini-2.5-flash-lite':
      costPerMTok = 0.10; // $0.10 input (estimated)
      break;

    case 'gemini-2.5-flash':
      costPerMTok = 0.30; // Paid pricing (free tier available)
      break;
      
    case 'gemini-3-flash':
      costPerMTok = 0.50; // Paid pricing (free tier available)
      break;
      
    case 'gpt-5-nano-2025-08-07':
      costPerMTok = 0.05;
      break;

    case 'gpt-5-mini-2025-08-07':
      costPerMTok = 0.25;
      break;

    case 'gpt-5.2-2025-12-11':
      costPerMTok = 5.0;
      break;

    default:
      costPerMTok = 0.2;
  }

  return {
    model,
    costPerMTok,
    estimatedCostPerReview: Number(
      (tokenCost * costPerMTok).toFixed(6)
    ),
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
