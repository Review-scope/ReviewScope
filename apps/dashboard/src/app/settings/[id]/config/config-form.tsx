'use client';

import clsx from 'clsx';
import { useState } from 'react';
import {
  Bot,
  Cpu,
  Key,
  FileText,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Lock,
  ArrowRight,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { updateConfig, deleteApiKey, verifyApiKey } from './actions';

type ConfigFormProps = {
  installationId: string;
  plan?: string;
  initialConfig?: {
    provider: string;
    model: string;
    customPrompt?: string | null;
    apiKeyEncrypted?: string | null;
    smartRouting?: boolean;
  };
};

export function ConfigForm({
  installationId,
  plan,
  initialConfig,
}: ConfigFormProps) {
  const router = useRouter();

  const [provider, setProvider] = useState(initialConfig?.provider || 'gemini');
  const [model, setModel] = useState(
    initialConfig?.model || 'gemini-2.5-flash'
  );
  const [smartRouting, setSmartRouting] = useState(
    initialConfig?.smartRouting ?? false
  );
  const [apiKey, setApiKey] = useState('');
  const [verifyStatus, setVerifyStatus] = useState<
    'idle' | 'verifying' | 'valid' | 'invalid'
  >('idle');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleDeleteKey = async () => {
    if (!confirm('Are you sure you want to remove the API key? AI reviews will be disabled.')) return;
    
    try {
      const res = await deleteApiKey(installationId);
      if (res.success) {
        toast.success('API key removed');
        setApiKey('');
        setVerifyStatus('idle');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to remove key');
      }
    } catch {
      toast.error('Unexpected error');
    }
  };

  const handleVerify = async () => {
    if (!apiKey && !initialConfig?.apiKeyEncrypted) return;

    setVerifyStatus('verifying');
    const result = await verifyApiKey(
      provider,
      model,
      apiKey,
      installationId
    );

    if (result.success) {
      setVerifyStatus('valid');
      toast.success('API key verified');
    } else {
      setVerifyStatus('invalid');
      setVerifyError(result.error || 'Verification failed');
    }
  };

  const handleFormSubmit = async (formData: FormData) => {
    setIsSaving(true);
    try {
      formData.delete('smartRouting');
      formData.append('smartRouting', smartRouting ? 'true' : 'false');

      if (!formData.get('model')) {
        formData.set('model', model);
      }
      
      const res = await updateConfig(installationId, formData);
      if (res?.error) {
        toast.error(res.error);
        setIsSaving(false);
      } else {
        toast.success('Configuration updated');
        router.refresh();
        setIsSaving(false);
      }
    } catch {
      toast.error('Failed to update configuration');
      setIsSaving(false);
    }
  };

  const canSave =
    verifyStatus === 'valid' ||
    (!apiKey && initialConfig?.apiKeyEncrypted);

  return (
    <div className="bg-white border border-zinc-200 rounded-3xl shadow-xl shadow-zinc-200/50 overflow-hidden">
      <div className="px-10 py-8 border-b border-zinc-100 bg-zinc-50/50">
        <h2 className="text-xl font-black text-zinc-900 tracking-tight">AI Review Configuration</h2>
        <p className="text-sm text-zinc-500 mt-1 font-medium">
          Customize how ReviewScope evaluates your pull requests.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          handleFormSubmit(formData);
        }}
        className="p-10 space-y-10"
      >
        <div className="grid md:grid-cols-2 gap-10">
          {/* PROVIDER */}
          <Section 
            title="AI Provider" 
            description="Select the underlying AI engine."
            icon={<Bot className="w-5 h-5 text-purple-600" />}
          >
            <div className="relative">
              <select
                name="provider"
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value);
                  setModel(
                    e.target.value === 'gemini'
                      ? 'gemini-2.5-flash'
                      : 'gpt-4o'
                  );
                }}
                className="w-full h-12 rounded-xl bg-white border border-zinc-200 px-4 text-sm font-medium focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all appearance-none cursor-pointer"
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <ArrowRight className="w-4 h-4 text-zinc-400 rotate-90" />
              </div>
            </div>
          </Section>

          {/* MODEL */}
          <Section 
            title="Model Selection" 
            description="Choose the specific model version."
            icon={<Cpu className="w-5 h-5 text-blue-600" />}
          >
             <div className="space-y-4">
              <div 
                onClick={() => setSmartRouting(!smartRouting)}
                className="flex justify-between items-center p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 cursor-pointer hover:bg-zinc-100 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "p-2 rounded-lg transition-colors",
                    smartRouting ? "bg-blue-100 text-blue-600" : "bg-zinc-200 text-zinc-500"
                  )}>
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-zinc-900">Smart Routing</p>
                    <p className="text-xs text-zinc-500 font-medium">Auto-select best model based on PR size</p>
                  </div>
                </div>

                <div
                  className={clsx(
                    'w-12 h-7 rounded-full relative transition-colors duration-200 ease-in-out',
                    smartRouting ? 'bg-blue-600' : 'bg-zinc-200 group-hover:bg-zinc-300'
                  )}
                >
                  <span
                    className={clsx(
                      'absolute top-1 h-5 w-5 bg-white rounded-full transition-transform duration-200 ease-in-out shadow-sm',
                      smartRouting ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </div>
              </div>

              <div className="relative">
                {smartRouting && (
                  <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] rounded-xl flex items-center justify-center border border-blue-100/50">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100 shadow-sm">
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      Managed by Smart Routing
                    </div>
                  </div>
                )}
                
                {provider === 'gemini' ? (
                  <select
                    name="model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    disabled={smartRouting}
                    className={clsx(
                      'w-full h-12 rounded-xl px-4 border border-zinc-200 bg-white text-sm font-medium appearance-none transition-all',
                      smartRouting ? 'opacity-40' : 'cursor-pointer hover:border-zinc-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                    )}
                  >
                    <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="gemini-3-flash">Gemini 3 Flash</option>
                  </select>
                ) : (
                  <select
                    name="model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    disabled={smartRouting}
                    className={clsx(
                      'w-full h-12 rounded-xl px-4 border border-zinc-200 bg-white text-sm font-medium appearance-none transition-all',
                      smartRouting ? 'opacity-40' : 'cursor-pointer hover:border-zinc-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                    )}
                  >
                    <optgroup label="Standard Models">
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-4o-mini">GPT-4o Mini</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    </optgroup>
                    <optgroup label="Preview">
                      <option value="gpt-5-nano-2025-08-07">GPT-5 Nano</option>
                      <option value="gpt-5-mini-2025-08-07">GPT-5 Mini</option>
                      <option value="gpt-5.2-2025-12-11">GPT-5.2</option>
                    </optgroup>
                  </select>
                )}
                 <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ArrowRight className="w-4 h-4 text-zinc-400 rotate-90" />
                </div>
              </div>
            </div>
            <input type="hidden" name="smartRouting" value={smartRouting ? 'true' : 'false'} />
          </Section>
        </div>

        <div className="h-px bg-zinc-100 w-full" />

        {/* API KEY */}
        <Section 
          title="API Configuration" 
          description="Enter your API key to enable the selected provider."
          icon={<Key className="w-5 h-5 text-emerald-600" />}
        >
          <div className="flex gap-3">
            <div className="relative flex-1 group">
              <input
                name="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setVerifyStatus('idle');
                }}
                className="w-full h-12 rounded-xl px-4 border border-zinc-200 bg-white text-sm transition-all focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-mono"
                placeholder={initialConfig?.apiKeyEncrypted ? "••••••••••••••••" : "sk-..."}
              />
              {initialConfig?.apiKeyEncrypted && !apiKey && (
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none select-none">
                   <span className="text-[10px] font-black tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100/50">ENCRYPTED</span>
                </div>
              )}
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {verifyStatus === 'verifying' && <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />}
                {verifyStatus === 'valid' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                {verifyStatus === 'invalid' && <XCircle className="w-4 h-4 text-red-500" />}
              </div>
            </div>

            <button
              type="button"
              onClick={handleVerify}
              className="h-12 px-6 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all shadow-lg hover:shadow-xl active:scale-95 cursor-pointer"
            >
              Verify
            </button>

            {initialConfig?.apiKeyEncrypted && (
              <button
                type="button"
                onClick={handleDeleteKey}
                className="h-12 w-12 flex items-center justify-center bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-100 transition-colors cursor-pointer"
                title="Remove API Key"
              >
                <XCircle className="w-5 h-5" />
              </button>
            )}
          </div>

          {verifyStatus === 'invalid' && verifyError && (
            <div className="flex items-center gap-2 text-xs text-red-600 font-medium bg-red-50/50 p-3 rounded-lg border border-red-100 animate-in fade-in slide-in-from-top-1">
              <XCircle className="w-3.5 h-3.5" />
              {verifyError}
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium mt-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>
              {initialConfig?.apiKeyEncrypted 
                ? "Stored securely with AES-256-GCM encryption." 
                : "Keys are encrypted at rest and never logged."}
            </span>
          </div>
        </Section>

        <div className="h-px bg-zinc-100 w-full" />

        {/* CUSTOM PROMPT */}
        <Section 
          title="Custom Instructions" 
          description="Add specific rules or context for the AI reviewer."
          icon={<FileText className="w-5 h-5 text-amber-600" />}
        >
          <div className="relative">
            <textarea
              name="customPrompt"
              disabled={plan === 'Free'}
              defaultValue={initialConfig?.customPrompt || ''}
              placeholder="e.g. Focus on security vulnerabilities, prefer functional programming patterns..."
              className={clsx(
                'w-full min-h-[120px] rounded-xl p-4 border border-zinc-200 bg-white text-sm font-medium resize-y focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all',
                plan === 'Free' && 'opacity-50 cursor-not-allowed bg-zinc-50'
              )}
            />
            {plan === 'Free' && (
              <div className="absolute inset-0 flex items-center justify-center backdrop-blur-[1px] rounded-xl">
                <div className="px-4 py-2 bg-white/90 border border-amber-200 shadow-lg rounded-full flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wide">
                  <Lock className="w-3.5 h-3.5" /> 
                  Pro Feature
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-zinc-400 font-medium mt-2">
            These instructions will be appended to the system prompt for every review.
          </p>
        </Section>

        {/* ACTIONS */}
        <div className="pt-6 border-t border-zinc-100 flex items-center justify-between">
          <Link 
            href="/settings" 
            className="text-sm font-bold text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={!canSave || isSaving}
            className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm shadow-xl shadow-zinc-900/10 hover:shadow-2xl hover:shadow-zinc-900/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none flex items-center gap-2 cursor-pointer"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSaving ? 'Saving Changes...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------- Helper ---------- */
function Section({ title, description, icon, children }: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="font-bold text-zinc-900">{title}</h3>
          {description && (
            <p className="text-xs text-zinc-500 font-medium mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="pl-14">
        {children}
      </div>
    </div>
  );
}
