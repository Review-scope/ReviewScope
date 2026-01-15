import { FileText } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service | ReviewScope',
  description: 'ReviewScope Terms of Service',
};

export default function TermsOfServicePage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <FileText className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="text-muted-foreground mt-2">
          Last updated: January 15, 2026
        </p>
      </div>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <section className="border rounded-xl p-6 bg-card">
          <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            By accessing or using ReviewScope, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our service.
          </p>
        </section>

        <section className="border rounded-xl p-6 bg-card">
          <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            ReviewScope is an AI-powered code review tool that integrates with GitHub to provide automated code reviews on pull requests. The service uses large language models (LLMs) to analyze code and provide feedback.
          </p>
        </section>

        <section className="border rounded-xl p-6 bg-card">
          <h2 className="text-xl font-semibold mb-3">3. User Responsibilities</h2>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>You must have the authority to grant access to the repositories you connect.</li>
            <li>You are responsible for maintaining the security of your API keys.</li>
            <li>You agree not to use the service for any unlawful purposes.</li>
            <li>You must not attempt to reverse engineer, hack, or disrupt the service.</li>
          </ul>
        </section>

        <section className="border rounded-xl p-6 bg-card">
          <h2 className="text-xl font-semibold mb-3">4. API Keys & Billing</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            ReviewScope allows you to use your own OpenAI or Google API keys. When using your own keys:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
            <li>You are responsible for any charges incurred on your API account.</li>
            <li>We encrypt and store your keys securely but are not liable for unauthorized usage if your key is compromised outside our platform.</li>
            <li>Usage of our server-provided API keys (if applicable) is subject to rate limits and fair use policies.</li>
          </ul>
        </section>

        <section className="border rounded-xl p-6 bg-card">
          <h2 className="text-xl font-semibold mb-3">5. Intellectual Property</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You retain all rights to your code. ReviewScope does not claim ownership of any code you submit for review. AI-generated review comments are provided as suggestions and may be used freely.
          </p>
        </section>

        <section className="border rounded-xl p-6 bg-card">
          <h2 className="text-xl font-semibold mb-3">6. Disclaimer of Warranties</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            ReviewScope is provided "as is" without warranties of any kind. We do not guarantee that:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
            <li>The service will be uninterrupted or error-free.</li>
            <li>AI-generated reviews will catch all bugs or security issues.</li>
            <li>Suggestions provided are always correct or optimal.</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-2">
            You should always perform your own code review and testing.
          </p>
        </section>

        <section className="border rounded-xl p-6 bg-card">
          <h2 className="text-xl font-semibold mb-3">7. Limitation of Liability</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            To the maximum extent permitted by law, ReviewScope and its creators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities arising from your use of the service.
          </p>
        </section>

        <section className="border rounded-xl p-6 bg-card">
          <h2 className="text-xl font-semibold mb-3">8. Termination</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We reserve the right to suspend or terminate your access to ReviewScope at any time for violations of these terms or for any other reason at our discretion. You may also uninstall the GitHub App at any time to stop using the service.
          </p>
        </section>

        <section className="border rounded-xl p-6 bg-card">
          <h2 className="text-xl font-semibold mb-3">9. Changes to Terms</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We may update these Terms of Service from time to time. Continued use of the service after changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section className="border rounded-xl p-6 bg-card">
          <h2 className="text-xl font-semibold mb-3">10. Contact</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For questions about these Terms, contact us at:{' '}
            <a href="mailto:parasverma7454@gmail.com" className="text-primary hover:underline">
              parasverma7454@gmail.com
            </a>
          </p>
        </section>
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
