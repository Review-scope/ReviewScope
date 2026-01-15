import { Shield } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | ReviewScope',
  description: 'ReviewScope Privacy Policy',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-muted-foreground mt-2">
          Last updated: January 15, 2026
        </p>
      </div>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
        <section className="border rounded-xl p-6 bg-card">
          <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            When you use ReviewScope, we collect the following information:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
            <li><strong>GitHub Account Information:</strong> Your GitHub username, email, and profile picture via GitHub OAuth.</li>
            <li><strong>Repository Data:</strong> Code from repositories you grant access to, for the purpose of providing AI-powered code reviews.</li>
            <li><strong>API Keys:</strong> If you provide your own OpenAI or Google API keys, they are stored encrypted and used solely for processing your reviews.</li>
            <li><strong>Usage Data:</strong> Information about how you interact with our service (e.g., number of reviews, repositories connected).</li>
          </ul>
        </section>

        <section className="border rounded-xl p-6 bg-card">
          <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>To provide AI-powered code review services on your pull requests.</li>
            <li>To index your repository code for context-aware reviews (RAG).</li>
            <li>To authenticate you via GitHub OAuth.</li>
            <li>To communicate with you about service updates or support.</li>
            <li>To improve our services and develop new features.</li>
          </ul>
        </section>

        <section className="border rounded-xl p-6 bg-card">
          <h2 className="text-xl font-semibold mb-3">3. Data Storage & Security</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We take data security seriously:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
            <li>API keys are encrypted using AES-256 encryption before storage.</li>
            <li>Code is processed in memory and indexed in secure vector databases.</li>
            <li>We do not sell or share your code with third parties.</li>
            <li>Data is stored on secure cloud infrastructure with industry-standard protections.</li>
          </ul>
        </section>

        <section className="border rounded-xl p-6 bg-card">
          <h2 className="text-xl font-semibold mb-3">4. Data Retention</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We retain your data for as long as your account is active. You can request deletion of your data at any time by contacting us. Upon account deletion or uninstallation, we will remove your stored data within 30 days.
          </p>
        </section>

        <section className="border rounded-xl p-6 bg-card">
          <h2 className="text-xl font-semibold mb-3">5. Your Rights</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You have the right to:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
            <li>Access the data we hold about you.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request deletion of your data.</li>
            <li>Revoke GitHub access at any time via GitHub settings.</li>
          </ul>
        </section>

        <section className="border rounded-xl p-6 bg-card">
          <h2 className="text-xl font-semibold mb-3">6. Contact Us</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If you have questions about this Privacy Policy, please contact us at:{' '}
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
