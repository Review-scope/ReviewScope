import { LAYER_ORDER, type ContextLayer, type ContextInput, type LayerName } from './layers.js';
import { createHash } from 'crypto';
import { getContextBudget, getContextBudgetForModel } from '@reviewscope/llm-core';

export type ComplexityTier = 'trivial' | 'simple' | 'complex';

export class ContextAssembler {
  private layers: Map<LayerName, ContextLayer> = new Map();

  addLayer(layer: ContextLayer): void {
    this.layers.set(layer.name, layer);
  }

  async assemble(input: ContextInput, model: string, complexity?: ComplexityTier): Promise<AssembledContext> {
    // Get budget from model, with optional complexity adjustment
    let budget = getContextBudget(model);
    
    // If complexity-aware model selection provided, use its budget
    if (complexity) {
      try {
        budget = getContextBudgetForModel(model);
      } catch {
        // Fall back to standard budget if function not available
        budget = getContextBudget(model);
      }
    }

    const parts: string[] = [];
    let usedTokens = 0;

    // Process layers in strict order
    for (const layerName of LAYER_ORDER) {
      const layer = this.layers.get(layerName);
      if (!layer) continue;

      const remainingBudget = budget - usedTokens;
      if (remainingBudget <= 0) break;

      const rawContent = await layer.getContext(input);
      if (!rawContent) continue;

      const tokens = Math.ceil(rawContent.length / 3.5);
      
      // Determine how many tokens this layer can take
      const layerMax = layer.maxTokens || remainingBudget;
      const allowedTokens = Math.min(layerMax, remainingBudget);

      if (tokens > allowedTokens) {
        const allowedChars = Math.floor(allowedTokens * 3.5);
        const truncated = Array.from(rawContent).slice(0, allowedChars).join('');
        parts.push(truncated);
        usedTokens += allowedTokens;
      } else {
        parts.push(rawContent);
        usedTokens += tokens;
      }
    }

    const assembled = parts.join('\n\n---\n\n');
    const hash = createHash('sha256').update(assembled).digest('hex').slice(0, 16);

    return {
      content: assembled,
      usedTokens,
      budgetTokens: budget,
      contextHash: hash,
    };
  }
}

export interface AssembledContext {
  content: string;
  usedTokens: number;
  budgetTokens: number;
  contextHash: string;
}
