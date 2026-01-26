export interface ReviewScopeConfig {
  disabledRules?: string[];
  include?: string[];
  exclude?: string[];
  ai?: {
    model?: string;
    temperature?: number;
    guidelines?: string;
    force_review?: boolean;
  };
  github?: {
    post_comments?: boolean;
  };
}
