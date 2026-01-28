'use client';

import { signIn } from 'next-auth/react';
import { Github, Zap, Shield, GitPullRequest, ArrowRight, Check, Command, Terminal } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex w-full bg-white text-zinc-900 selection:bg-zinc-900 selection:text-white">
      {/* Left Column - Visual & Brand */}
      <div className="hidden lg:flex lg:w-[55%] relative bg-zinc-900 text-white overflow-hidden flex-col justify-between p-16">
        {/* Background Patterns */}
        <div className="absolute inset-0 opacity-20" 
             style={{ 
               backgroundImage: `radial-gradient(#333 1px, transparent 1px)`, 
               backgroundSize: '32px 32px' 
             }}>
        </div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none mix-blend-screen"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none mix-blend-screen"></div>

        {/* Header */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3 w-fit group">
            <div className="p-2.5 bg-white/10 border border-white/10 rounded-xl backdrop-blur-sm group-hover:bg-white/20 transition-colors">
              <Command className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight">ReviewScope</span>
          </Link>
        </div>

        {/* Center Visual - Abstract Code Review Interface */}
        <div className="relative z-10 flex-1 flex items-center justify-center">
          <div className="relative w-full max-w-lg">
            {/* Main Card */}
            <div className="bg-zinc-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl transform rotate-[-2deg] hover:rotate-0 transition-transform duration-700 ease-out">
              {/* Fake Code Header */}
              <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                </div>
                <div className="text-xs font-mono text-zinc-500">auth-middleware.ts</div>
              </div>
              
              {/* Fake Code Content */}
              <div className="space-y-3 font-mono text-sm">
                <div className="flex gap-4 opacity-50">
                  <span className="text-zinc-600 select-none">12</span>
                  <span className="text-purple-400">const</span> <span className="text-blue-400">verifyToken</span> = <span className="text-yellow-300">async</span> (token) ={'>'} {'{'}
                </div>
                <div className="flex gap-4 bg-red-500/10 -mx-6 px-6 py-1 border-l-2 border-red-500">
                  <span className="text-zinc-600 select-none">13</span>
                  <span className="text-zinc-300">  if (!token) return true; // Security Risk</span>
                </div>
                <div className="flex gap-4 bg-green-500/10 -mx-6 px-6 py-1 border-l-2 border-green-500">
                  <span className="text-zinc-600 select-none">13</span>
                  <span className="text-zinc-300">  if (!token) throw new Error('Unauthorized');</span>
                </div>
                <div className="flex gap-4 opacity-50">
                  <span className="text-zinc-600 select-none">14</span>
                  <span className="text-zinc-300">  const decoded = jwt.verify(token, secret);</span>
                </div>
              </div>

              {/* AI Badge */}
              <div className="absolute -right-6 -bottom-6 bg-blue-600 text-white p-4 rounded-xl shadow-xl flex items-center gap-3 border border-blue-400/30 hover:scale-105 transition-transform duration-300">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="text-sm font-medium">
                  <div className="text-[10px] uppercase tracking-wider opacity-80">ReviewScope AI</div>
                  Critical vulnerability detected
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="relative z-10 grid grid-cols-2 gap-8">
          <div>
            <div className="text-3xl font-bold mb-1">20s</div>
            <div className="text-zinc-400 text-sm">Average review time</div>
          </div>
          <div>
            <div className="text-3xl font-bold mb-1">100%</div>
            <div className="text-zinc-400 text-sm">Code coverage analysis</div>
          </div>
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16 relative bg-zinc-50/50">
        <div className="w-full max-w-sm space-y-10">
          
          {/* Mobile Logo */}
          <div className="lg:hidden">
            <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center mb-6">
              <Command className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
              Welcome back
            </h1>
            <p className="text-zinc-500">
              Connect your GitHub account to start reviewing code intelligently.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => {
                toast.loading('Connecting to GitHub...', { id: 'signin' });
                signIn('github', { callbackUrl: '/' });
              }}
              className="group relative w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-medium transition-all duration-200 shadow-xl shadow-zinc-900/10 hover:shadow-zinc-900/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]"
            >
              <Github className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span>Continue with GitHub</span>
              <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all absolute right-4" />
            </button>
            
            <div className="flex items-center gap-2 justify-center text-xs text-zinc-400 mt-4">
              <Shield className="w-3 h-3" />
              <span>We only request read access to public repos</span>
            </div>
          </div>

          {/* Feature List (Subtle) */}
          <div className="pt-10 border-t border-zinc-200">
            <div className="space-y-4">
              {[
                { icon: Terminal, label: "Automated PR Analysis" },
                { icon: Zap, label: "Instant Feedback Loop" },
                { icon: GitPullRequest, label: "Seamless Integration" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-zinc-600">
                  <div className="p-1.5 rounded-full bg-zinc-100 text-zinc-900">
                    <item.icon className="w-3.5 h-3.5" />
                  </div>
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          {/* Footer Links */}
          <div className="pt-6 flex items-center justify-between text-xs text-zinc-400">
            <div className="flex gap-4">
              <Link href="/terms" className="hover:text-zinc-900 transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-zinc-900 transition-colors">Privacy</Link>
            </div>
            <Link href="/support" className="hover:text-zinc-900 transition-colors">Help</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
