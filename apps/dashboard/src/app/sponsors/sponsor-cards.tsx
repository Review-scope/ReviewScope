'use client';

import { useState } from 'react';
import { Coffee, QrCode, Copy, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';

export function SponsorCards() {
  const [copied, setCopied] = useState(false);
  const upiId = "parasverma7454@upi";

  const handleCopy = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    toast.success('UPI ID copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid md:grid-cols-2 gap-6 w-full max-w-3xl mx-auto">
      {/* Buy Me a Coffee Card */}
      <div className="bg-zinc-900 rounded-3xl p-8 flex flex-col items-start text-left shadow-xl border border-zinc-800 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
          <Coffee className="w-32 h-32 text-yellow-500" />
        </div>
        
        <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mb-6 border border-zinc-700">
          <Coffee className="w-6 h-6 text-yellow-400 fill-yellow-400/20" />
        </div>
        
        <h3 className="text-2xl font-bold text-white mb-2">Buy Me a Coffee</h3>
        <p className="text-zinc-400 mb-8 font-medium">
          Support development with a small donation to keep the servers running.
        </p>
        
        <a 
          href="https://www.buymeacoffee.com/luffytaro" 
          target="_blank" 
          rel="noopener noreferrer"
          className="w-full mt-auto py-3.5 px-6 bg-[#FFDD00] hover:bg-[#FFDD00]/90 text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] cursor-pointer"
        >
          <Coffee className="w-5 h-5" />
          Buy Me a Coffee
        </a>
      </div>

      {/* UPI Card */}
      <div className="bg-zinc-900 rounded-3xl p-8 flex flex-col items-start text-left shadow-xl border border-zinc-800 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
          <QrCode className="w-32 h-32 text-blue-500" />
        </div>

        <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mb-6 border border-zinc-700">
          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">
            @
          </div>
        </div>
        
        <h3 className="text-2xl font-bold text-white mb-2">UPI</h3>
        <p className="text-zinc-400 mb-8 font-medium">
          Direct transfer via UPI for Indian supporters.
        </p>
        
        <div className="w-full mt-auto">
          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">
            UPI ID
          </label>
          <button 
            onClick={handleCopy}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors group/input text-left cursor-pointer"
          >
            <code className="font-mono text-zinc-300 text-sm">{upiId}</code>
            <div className={clsx(
              "p-2 rounded-lg transition-colors",
              copied ? "bg-green-500/10 text-green-500" : "bg-zinc-800 text-zinc-400 group-hover/input:bg-zinc-700 group-hover/input:text-zinc-300"
            )}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
