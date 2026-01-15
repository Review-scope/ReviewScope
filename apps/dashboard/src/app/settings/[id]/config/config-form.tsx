'use client';

import { useState } from 'react';
import { Bot, Cpu, Key, FileText, Trash2, Loader2, Sparkles, Zap, ShieldCheck, CheckCircle2, XCircle, Lock } from 'lucide-react';
import { SubmitButton } from '@/components/submit-button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateConfig, deleteApiKey, verifyApiKey } from './actions';
import { clsx } from 'clsx';
import { toast } from 'sonner';

type ConfigFormProps = {
  installationId: string;
  plan?: string;
  initialConfig?: {
    provider: string;
    model: string;
    customPrompt?: string | null;
    apiKeyEncrypted?: string | null;
  };
};

export function ConfigForm({ installationId, plan, initialConfig }: ConfigFormProps) {
  const router = useRouter();
  const [provider, setProvider] = useState(initialConfig?.provider || 'gemini');
  const [model, setModel] = useState(initialConfig?.model || (provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o'));
  const [apiKey, setApiKey] = useState('');
  const [isDeletingKey, setIsDeletingKey] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'verifying' | 'valid' | 'invalid'>('idle');
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const handleVerify = async () => {
    // If we have an API key input, or if we have a stored encrypted key (indicated by installationId props), we can verify
    if (!apiKey && !initialConfig?.apiKeyEncrypted) return;
    
    setVerifyStatus('verifying');
    setVerifyError(null);
    
    // We pass the currently selected model to verify it works with the key (new or stored)
    const result = await verifyApiKey(provider, model, apiKey, installationId);
    
    if (result.success) {
      setVerifyStatus('valid');
    } else {
      setVerifyStatus('invalid');
      setVerifyError(result.error || 'Failed to verify key or model access');
    }
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
    setVerifyStatus('idle');
    setVerifyError(null);
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setModel(e.target.value);
    setVerifyStatus('idle');
    setVerifyError(null);
  };

  const handleDeleteKey = async () => {
    if (!confirm('Are you sure you want to delete the stored API key?')) return;
    
    setIsDeletingKey(true);
    try {
      await deleteApiKey(installationId);
      setVerifyStatus('idle');
      toast.success('API key successfully revoked');
      router.refresh();
    } catch (error) {
      console.error('Failed to delete key:', error);
      toast.error('Failed to revoke API key');
    } finally {
      setIsDeletingKey(false);
    }
  };

  const handleFormSubmit = async (formData: FormData) => {
    try {
      const result = await updateConfig(installationId, formData);
      if (result?.error) {
        toast.error(result.error);
      }
    } catch (err: any) {
      // If it's a redirect error from Next.js, that's actually success/expected
      if (err.message === 'NEXT_REDIRECT') return;
      toast.error("Failed to update configuration");
    }
  }

  // Allow save if:
  // 1. Key is valid (verified)
  // 2. OR key is stored AND model hasn't changed (legacy trust)
  // But if model changed, we REQUIRE verification even for stored keys.
  const isModelChanged = model !== initialConfig?.model;
  const canSave = (!isModelChanged && initialConfig?.apiKeyEncrypted && !apiKey) || verifyStatus === 'valid';

  return (
    <div className="bg-card border-2 rounded-[2.5rem] shadow-xl shadow-zinc-200/50 dark:shadow-none overflow-hidden border-border/60">
      <form action={handleFormSubmit} className="p-8 md:p-12 space-y-10">
        <div className="grid gap-10 sm:grid-cols-2">
          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-1">
              <Bot className="w-4 h-4 text-primary" /> AI Intelligence Provider
            </label>
            <div className="relative">
              <select 
                name="provider" 
                value={provider}
                onChange={(e) => {
                  const newProvider = e.target.value;
                  setProvider(newProvider);
                  setVerifyStatus('idle');
                  // Switch default model when provider changes to help user
                  setModel(newProvider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o');
                }}
                className="w-full h-14 px-4 py-2 bg-muted/30 border-2 rounded-2xl text-base font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none appearance-none transition-all cursor-pointer"
              >
                <option value="gemini">Google Gemini (Default)</option>
                <option value="openai">OpenAI</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                 <Zap className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-1">
              <Cpu className="w-4 h-4 text-primary" /> Computational Model
            </label>
            <div className="relative">
              <input 
                name="model" 
                value={model}
                onChange={handleModelChange}
                list="model-suggestions"
                placeholder="e.g. gpt-4o or gemini-2.0-flash"
                className="w-full h-14 px-4 py-2 bg-muted/30 border-2 border-border/60 rounded-2xl text-base font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all placeholder:text-muted-foreground/30"
              />
              <datalist id="model-suggestions">
                {provider === 'openai' ? (
                  <>
                    <option value="gpt-4o" />
                    <option value="gpt-4o-mini" />
                    <option value="gpt-4-turbo" />
                    <option value="o1-preview" />
                  </>
                ) : (
                  <>
                    <option value="gemini-1.5-pro" />
                    <option value="gemini-1.5-flash" />
                    <option value="gemini-2.0-flash-exp" />
                  </>
                )}
              </datalist>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                 <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest px-1">
              Custom models supported • Check provider docs
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-1">
            <Key className="w-4 h-4 text-primary" /> Secret Authentication Key
          </label>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <input 
                name="apiKey" 
                type="password" 
                value={apiKey}
                onChange={handleApiKeyChange}
                placeholder={initialConfig?.apiKeyEncrypted ? '••••••••••••••••••••••••••••••••' : 'Enter your private API key'}
                className={clsx(
                  "w-full h-14 px-5 py-2 bg-muted/30 border-2 rounded-2xl text-base font-mono focus:ring-4 focus:outline-none transition-all",
                  verifyStatus === 'valid' ? "border-green-500/50 focus:ring-green-500/10" : 
                  verifyStatus === 'invalid' ? "border-red-500/50 focus:ring-red-500/10" : 
                  "border-border/60 focus:ring-primary/10 focus:border-primary"
                )}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {verifyStatus === 'verifying' && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                {verifyStatus === 'valid' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                {verifyStatus === 'invalid' && <XCircle className="w-5 h-5 text-red-500" />}
                {verifyStatus === 'idle' && <ShieldCheck className="w-5 h-5 opacity-20" />}
              </div>
            </div>
            
            {/* Show verify button if we have a key (entered or stored) and it's not currently valid */}
            {((apiKey || initialConfig?.apiKeyEncrypted) && verifyStatus !== 'valid') && (
              <button
                type="button"
                onClick={handleVerify}
                disabled={verifyStatus === 'verifying'}
                className="h-14 px-8 bg-zinc-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {verifyStatus === 'verifying' ? 'Verifying...' : 'Verify Key'}
              </button>
            )}

            {initialConfig?.apiKeyEncrypted && !apiKey && (
              <button
                type="button"
                onClick={handleDeleteKey}
                disabled={isDeletingKey}
                className="h-14 px-6 border-2 border-destructive/20 text-destructive hover:bg-destructive hover:text-white rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-bold uppercase tracking-widest text-xs"
                title="Revoke stored API Key"
              >
                {isDeletingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Revoke Key
              </button>
            )}
          </div>
          {verifyError && (
            <div className="bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 p-4 rounded-xl flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm text-red-700 dark:text-red-400 font-bold">Verification Failed</p>
                <p className="text-xs text-red-600/80 dark:text-red-400/80 leading-relaxed font-medium">
                  {verifyError}
                </p>
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground font-medium px-1 italic">
            {initialConfig?.apiKeyEncrypted 
              ? 'A key is currently secured. Enter a new value to rotate it, or revoke to use system defaults.' 
              : 'Supply your own key for higher rate limits and custom models. Encrypted on the fly.'}
          </p>
        </div>

        <div className="space-y-4">
          <label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 px-1">
            <FileText className="w-4 h-4 text-primary" /> Advanced Review Logic (Custom Prompt)
            {plan === 'Free' && (
              <span className="ml-auto flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-[9px] font-bold rounded-full border border-orange-200">
                <Lock className="w-3 h-3" /> Pro+ Only
              </span>
            )}
          </label>
          <div className="relative group">
            <textarea 
              name="customPrompt" 
              defaultValue={initialConfig?.customPrompt || ''}
              placeholder="e.g. Enforce strict functional programming patterns. Flag any usage of 'any' or missing unit tests."
              disabled={plan === 'Free'}
              className={clsx(
                "w-full min-h-50 px-5 py-4 bg-muted/30 border-2 rounded-3xl text-base font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none resize-none transition-all placeholder:text-muted-foreground/50 leading-relaxed",
                plan === 'Free' ? "opacity-50 cursor-not-allowed border-border/40 bg-muted/10" : "border-border/60"
              )}
            />
            {/* Hidden input to preserve value when textarea is disabled */}
            {plan === 'Free' && <input type="hidden" name="customPrompt" value={initialConfig?.customPrompt || ''} />}
            {plan === 'Free' && (
              <div className="absolute inset-0 rounded-3xl bg-linear-to-r from-transparent to-zinc-900/5 pointer-events-none"></div>
            )}
          </div>
          <div className="flex items-start justify-between gap-4">
            <p className="text-xs text-muted-foreground font-medium px-1 italic flex-1">
              {plan === 'Free' 
                ? "Custom prompts are available on Pro and Team plans. Upgrade to inject your own review logic." 
                : "This directive will be injected into the core AI review pipeline as an immutable instruction."}
            </p>
            {plan === 'Free' && (
              <Link 
                href="/pricing"
                className="shrink-0 px-3 py-1 text-xs font-bold bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-full border border-orange-300 transition-colors"
              >
                Upgrade
              </Link>
            )}
          </div>
        </div>

        <div className="pt-10 flex flex-col md:flex-row items-center justify-end gap-6 border-t border-border/40">
          <Link 
            href="/settings"
            className="w-full md:w-auto px-8 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors text-center"
          >
            Discard Changes
          </Link>
          <div className={clsx(!canSave && "opacity-50 cursor-not-allowed pointer-events-none")}>
            <SubmitButton />
          </div>
        </div>
      </form>
    </div>
  );
}