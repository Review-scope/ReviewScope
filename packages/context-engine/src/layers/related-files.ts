import { ContextLayer, ContextInput } from '../layers.js';

export const relatedFilesLayer: ContextLayer = {
  name: 'related-files',
  async getContext(input: ContextInput): Promise<string> {
    if (!input.relatedContext || input.relatedContext.trim() === '') {
      return '';
    }

    return `
## Related Files (Targeted Context)
The following files were identified as direct dependencies (imports) of the changed code.
This context is DETECTED DETERMINISTICALLY from the source code.
Note: Only exported members and type definitions are shown to save space.

${input.relatedContext}
`.trim();
  }
};
