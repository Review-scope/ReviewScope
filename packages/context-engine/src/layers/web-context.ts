import type { ContextLayer, ContextInput } from '../layers.js';
import { webContextCache } from '../rag/cache.js';

/**
 * Web Context Layer
 * 
 * Fetches real-time data from external sources:
 * - npm package versions and security advisories
 * - Framework metadata and documentation links
 * 
 * This layer provides factual, up-to-date context to reduce hallucinations
 * and improve LLM accuracy when reviewing dependency changes.
 * 
 * Position: After RAG Context (4), Before PR Diff (5)
 */

interface PackageInfo {
  name: string;
  version: string;
  latestVersion?: string;
  vulnerabilities?: Array<{
    severity: 'critical' | 'high' | 'moderate' | 'low';
    description: string;
    id: string;
  }>;
}

class WebContextProvider {
  /**
   * Extract package names and versions from package.json or diff
   */
  private extractPackages(diff: string): string[] {
    const packages: string[] = [];
    
    // Match package.json changes: "package-name": "version"
    const packageRegex = /"([^"]+)":\s*"([^"]+)"/g;
    let match;
    
    while ((match = packageRegex.exec(diff)) !== null) {
      const [, name] = match;
      // Simple check: if it looks like a package name (has alphanumeric or hyphens)
      if (/^[@a-z0-9-]+\/[@a-z0-9-]+$|^[a-z0-9-]+$/.test(name)) {
        packages.push(name);
      }
    }
    
    return [...new Set(packages)]; // Deduplicate
  }

  /**
   * Fetch npm package info (cached)
   * Returns: package name, current version, latest version, known vulnerabilities
   */
  private async fetchNpmInfo(packageName: string): Promise<PackageInfo | null> {
    const cacheKey = `npm:${packageName}`;
    const cached = await webContextCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      // Note: In production, this would use axios or node-fetch to call:
      // GET https://registry.npmjs.org/{packageName}
      // GET https://api.github.com/repos/npm/npm/security/advisories?affected_package={packageName}
      //
      // For now, return null (feature flag: disabled until dependencies added)
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Build context string from package info
   */
  private buildPackageContext(packages: PackageInfo[]): string {
    if (packages.length === 0) {
      return '';
    }

    let context = '## Dependency & Security Data\n\n';
    
    for (const pkg of packages) {
      context += `### ${pkg.name}@${pkg.version}\n`;
      
      if (pkg.latestVersion && pkg.latestVersion !== pkg.version) {
        context += `- Latest: ${pkg.latestVersion}\n`;
      }
      
      if (pkg.vulnerabilities && pkg.vulnerabilities.length > 0) {
        context += `- ⚠️ ${pkg.vulnerabilities.length} known vulnerabilities:\n`;
        for (const vuln of pkg.vulnerabilities) {
          context += `  - [${vuln.severity.toUpperCase()}] ${vuln.description} (ID: ${vuln.id})\n`;
        }
      } else {
        context += '- No known vulnerabilities\n';
      }
      
      context += '\n';
    }

    return context;
  }

  async getContext(diff: string): Promise<string> {
    try {
      const packages = this.extractPackages(diff);
      
      if (packages.length === 0) {
        return ''; // No packages found, skip this layer
      }

      // Fetch info for each package
      const packageInfos = await Promise.all(
        packages.map((pkg) => this.fetchNpmInfo(pkg))
      );

      const validPackages = packageInfos.filter((p) => p !== null) as PackageInfo[];
      return this.buildPackageContext(validPackages);
    } catch {
      // Fail gracefully: missing web context is not fatal
      return '';
    }
  }
}

const provider = new WebContextProvider();

export const webContextLayer: ContextLayer = {
  name: 'web-context',
  maxTokens: 2000, // Reserve space for dependency info
  async getContext(input: ContextInput): Promise<string> {
    // Extract packages from diff and fetch info
    return provider.getContext(input.diff);
  },
};
