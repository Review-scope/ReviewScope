import { Mail, MessageCircle, HelpCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Support | ReviewScope',
  description: 'Get help with ReviewScope',
};

export default function SupportPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <HelpCircle className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Support</h1>
        <p className="text-muted-foreground mt-2">
          Need help? We're here for you.
        </p>
      </div>

      <div className="space-y-6">
        {/* Email Support */}
        <div className="border rounded-xl p-6 bg-card shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-1">Email Support</h2>
              <p className="text-sm text-muted-foreground mb-4">
                For any questions, issues, or feedback, reach out to us via email. 
                We typically respond within 24 hours.
              </p>
              <a 
                href="mailto:parasverma7454@gmail.com"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-all"
              >
                <Mail className="w-4 h-4" />
                parasverma7454@gmail.com
              </a>
            </div>
          </div>
        </div>

        {/* Common Topics */}
        <div className="border rounded-xl p-6 bg-card shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10">
              <MessageCircle className="w-6 h-6 text-blue-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-3">Common Topics</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  Setting up your API key (OpenAI/Gemini)
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  Configuring review preferences
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  Understanding review comments and severities
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  Billing and subscription questions
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  Bug reports and feature requests
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* GitHub Issues */}
        <div className="border rounded-xl p-6 bg-card shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-gray-500/10">
              <ExternalLink className="w-6 h-6 text-gray-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-1">Found a Bug?</h2>
              <p className="text-sm text-muted-foreground mb-4">
                If you've found a bug or have a feature request, please open an issue on our GitHub repository.
              </p>
              <a 
                href="https://github.com/Review-scope/ReviewScope/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Open GitHub Issue
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
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
