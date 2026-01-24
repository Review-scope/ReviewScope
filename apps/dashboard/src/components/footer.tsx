'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t bg-zinc-50 py-12">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 flex items-center justify-center grayscale opacity-70">
              <img src="/logo1.png" alt="ReviewScope" className="w-full h-full object-contain" />
            </div>
            <span className="text-sm font-black uppercase tracking-tighter italic">ReviewScope <span className="text-zinc-400 font-medium">// AI Code Integrity</span></span>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 text-xs font-bold uppercase tracking-widest text-zinc-500">
            <Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
            <Link href="/support" className="hover:text-primary transition-colors">Support</Link>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-zinc-200/50">
          <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
            © {new Date().getFullYear()} REVIEW SCOPE. BUILT FOR SCALE.
          </div>
          <div className="flex items-center gap-3">
            {/* <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">All Systems Operational</span>
            </div> */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Payments by</span>
              <img src="/dodo.jpeg" alt="Dodo Payments" className="w-4 h-4 object-contain rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Powered by</span>
              <img src="/openai.svg" alt="OpenAI" className="w-4 h-4" />
              <img src="/gemini-color.svg" alt="Gemini" className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

