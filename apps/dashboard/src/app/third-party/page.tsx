import { ExternalLink, Box } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Third-Party Services | ReviewScope',
  description: 'Third-party services used by ReviewScope',
};

export default function ThirdPartyServicesPage() {
  const services = [
    {
      name: 'GitHub',
      description: 'OAuth authentication, repository access, and pull request integration.',
      usage: 'We use GitHub OAuth to authenticate users and the GitHub API to read pull requests, post review comments, and access repository code.',
      link: 'https://docs.github.com/en/apps',
      privacy: 'https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement',
    },
    {
      name: 'Google Gemini API',
      description: 'AI-powered code analysis and review generation.',
      usage: 'When configured, we send code diffs to Google Gemini API for AI analysis. Your code is processed according to Google\'s API terms.',
      link: 'https://ai.google.dev/',
      privacy: 'https://policies.google.com/privacy',
    },
    {
      name: 'OpenAI API',
      description: 'Alternative AI provider for code analysis.',
      usage: 'When configured, we send code diffs to OpenAI API for AI analysis. Your code is processed according to OpenAI\'s API terms.',
      link: 'https://openai.com/api/',
      privacy: 'https://openai.com/policies/privacy-policy',
    },
    {
      name: 'Qdrant',
      description: 'Vector database for repository indexing (RAG).',
      usage: 'We use Qdrant to store code embeddings for context-aware reviews. Code chunks are embedded and stored as vectors for semantic search.',
      link: 'https://qdrant.tech/',
      privacy: 'https://qdrant.tech/legal/privacy-policy/',
    },
    {
      name: 'Redis (Upstash)',
      description: 'Job queue and caching.',
      usage: 'We use Redis for background job processing (review queue) and caching. Job metadata is stored temporarily.',
      link: 'https://upstash.com/',
      privacy: 'https://upstash.com/trust/privacy.html',
    },
    {
      name: 'PostgreSQL (Neon/Supabase)',
      description: 'Primary database for user data.',
      usage: 'We store installation data, repository metadata, review history, and encrypted API keys in PostgreSQL.',
      link: 'https://neon.tech/',
      privacy: 'https://neon.tech/privacy-policy',
    },
  ];

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Box className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Third-Party Services</h1>
        <p className="text-muted-foreground mt-2">
          Services we use to power ReviewScope
        </p>
      </div>

      <div className="space-y-4">
        {services.map((service) => (
          <div key={service.name} className="border rounded-xl p-6 bg-card">
            <div className="flex items-start justify-between mb-2">
              <h2 className="text-lg font-semibold">{service.name}</h2>
              <a 
                href={service.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {service.description}
            </p>
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 mb-3">
              <strong className="text-foreground">How we use it:</strong> {service.usage}
            </div>
            <a 
              href={service.privacy}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View Privacy Policy
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ))}
      </div>

      <div className="mt-8 border rounded-xl p-6 bg-card">
        <h2 className="text-lg font-semibold mb-2">Data Flow Summary</h2>
        <div className="text-sm text-muted-foreground space-y-2">
          <p>When you use ReviewScope:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>GitHub sends us a webhook when you open a pull request.</li>
            <li>We fetch the code diff using your installation token.</li>
            <li>The diff is sent to your configured AI provider (Gemini/OpenAI).</li>
            <li>AI response is parsed and posted back to GitHub as review comments.</li>
            <li>Code chunks may be stored in Qdrant for future context-aware reviews.</li>
          </ol>
        </div>
      </div>

      <div className="mt-8 text-center space-x-4">
        <Link 
          href="/privacy"
          className="text-sm text-primary hover:underline"
        >
          Privacy Policy
        </Link>
        <span className="text-muted-foreground">•</span>
        <Link 
          href="/terms"
          className="text-sm text-primary hover:underline"
        >
          Terms of Service
        </Link>
        <span className="text-muted-foreground">•</span>
        <Link 
          href="/"
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
