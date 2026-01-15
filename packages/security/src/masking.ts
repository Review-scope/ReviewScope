/**
 * Mask sensitive strings for logging
 * Example: "sk-abc123xyz" → "sk-***xyz"
 */
export function maskApiKey(key: string): string {
  if (!key || key.length < 8) {
    return '***';
  }

  const prefix = key.slice(0, 3);
  const suffix = key.slice(-3);
  return `${prefix}***${suffix}`;
}

/**
 * Check if a string looks like an API key
 */
export function looksLikeApiKey(value: string): boolean {
  const patterns = [
    /^sk-[a-zA-Z0-9]+$/,           // OpenAI
    /^AI[a-zA-Z0-9]+$/,            // Google AI
    /^[a-f0-9]{32,}$/i,            // Generic hex keys
  ];

  return patterns.some((p) => p.test(value));
}

/**
 * Redact API keys from log messages
 */
export function redactSecrets(message: string): string {
  // OpenAI keys
  let redacted = message.replace(/sk-[a-zA-Z0-9]{20,}/g, 'sk-***');
  
  // Generic long hex strings
  redacted = redacted.replace(/[a-f0-9]{32,}/gi, '***');
  
  return redacted;
}
