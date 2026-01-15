'use client';

import { signIn } from 'next-auth/react';
import { Github, Shield, Zap, Lock, Code, ArrowRight, CheckCircle, Star } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding & Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-primary/10 via-primary/5 to-background p-12 flex-col justify-between">
        <div>
          <Link href="/" className="flex items-center gap-3 mb-16">
            <div className="p-2 bg-primary rounded-xl">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">ReviewScope</span>
          </Link>
          
          <div className="space-y-8">
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
              AI-Powered Code Reviews<br />
              <span className="text-primary">for Every Pull Request</span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-md">
              Get instant, intelligent feedback on your code. Catch bugs, security issues, 
              and style problems before they reach production.
            </p>
            
            <div className="space-y-4 pt-4">
              {[
                { icon: Zap, title: 'Lightning Fast', desc: 'Reviews in seconds, not hours' },
                { icon: Lock, title: 'Security First', desc: 'Detects vulnerabilities & secrets' },
                { icon: Code, title: 'Context Aware', desc: 'Understands your entire codebase' },
              ].map((feature) => (
                <div key={feature.title} className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Testimonial / Stats */}
        <div className="border-t pt-8 space-y-4">
          <div className="flex items-center gap-1 text-yellow-500">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-current" />
            ))}
          </div>
          <blockquote className="text-muted-foreground italic">
            "ReviewScope caught a critical security issue in our auth flow that we completely missed. 
            It's like having a senior engineer review every PR."
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-purple-500" />
            <div>
              <div className="font-semibold">Alex Chen</div>
              <div className="text-sm text-muted-foreground">Lead Developer @ TechCorp</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Sign in form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="p-2 bg-primary rounded-xl">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">ReviewScope</span>
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">Welcome back</h2>
            <p className="text-muted-foreground">
              Sign in to access your dashboard and manage your repositories
            </p>
          </div>

          {/* GitHub Sign In Button */}
          <button
            onClick={() => {
              toast.loading('Redirecting to GitHub...', { id: 'signin' });
              signIn('github', { callbackUrl: '/' });
            }}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#24292F] hover:bg-[#1a1f24] text-white rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
          >
            <Github className="w-6 h-6" />
            Continue with GitHub
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Why GitHub?</span>
            </div>
          </div>

          {/* Benefits */}
          <div className="space-y-3">
            {[
              'Automatic repository access - no extra setup',
              'Secure OAuth - we never see your password',
              'Seamless PR integration for reviews',
            ].map((benefit) => (
              <div key={benefit} className="flex items-center gap-3 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          {/* Footer links */}
          <div className="pt-8 border-t text-center space-y-4">
            <p className="text-xs text-muted-foreground">
              By signing in, you agree to our{' '}
              <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            </p>
            
            <div className="flex items-center justify-center gap-4 text-sm">
              <Link href="/support" className="text-muted-foreground hover:text-foreground transition-colors">
                Need help?
              </Link>
              <span className="text-muted-foreground">•</span>
              <a 
                href="https://github.com/apps/review-scope" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
              >
                View on GitHub <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
