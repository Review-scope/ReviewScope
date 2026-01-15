'use client';

import { useFormStatus } from 'react-dom';
import { Save, Loader2, ArrowRight } from 'lucide-react';

export function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button 
      type="submit"
      disabled={pending}
      className="w-full md:w-auto inline-flex items-center justify-center gap-3 px-10 py-4 bg-primary text-primary-foreground rounded-2xl text-sm font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed group"
    >
      {pending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Save className="w-4 h-4" />
      )}
      {pending ? 'Synchronizing...' : 'Save Configuration'}
      {!pending && <ArrowRight className="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-transform" />}
    </button>
  );
}