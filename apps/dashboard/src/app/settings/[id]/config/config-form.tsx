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
      // Ensure smartRouting is explicitly set as 'true' or 'false' string
      // Delete any existing smartRouting entry first to avoid duplicates
      formData.delete('smartRouting');
      formData.append('smartRouting', smartRouting ? 'true' : 'false');

      // Ensure model is included even if disabled (when smartRouting is on)
      if (!formData.get('model')) {
        formData.set('model', model);
      }
      
      const res = await updateConfig(installationId, formData);
      if (res?.error) {
        toast.error(res.error);
        setIsSaving(false); // Stop loading on error
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
    <div className="bg-card border border-border/60 rounded-[2.5rem] shadow-xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          handleFormSubmit(formData);
        }}
        className="p-10 space-y-12"
      >

        {/* HEADER */}
        <div>
          <h2 className="text-2xl font-black">AI Review Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Control how ReviewScope evaluates your pull requests.
          </p>
        </div>

        {/* PROVIDER */}
        <Section title="AI Provider" icon={<Bot className="w-5 h-5" />}>
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
            className="w-full h-14 rounded-xl bg-muted/40 border px-4"
          >
            <option value="gemini">Google Gemini</option>
            <option value="openai">OpenAI</option>
          </select>
        </Section>

        {/* MODEL */}
        <Section title="Model Selection" icon={<Cpu className="w-5 h-5" />}>
          <div className="flex justify-between items-center p-4 rounded-xl border bg-muted/30">
            <div>
              <p className="font-bold text-sm">Smart Routing</p>
              <p className="text-xs text-muted-foreground">
                Auto-select best model per PR
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSmartRouting(!smartRouting)}
              className={clsx(
                'w-11 h-6 rounded-full relative cursor-pointer',
                smartRouting ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span
                className={clsx(
                  'absolute top-1 h-4 w-4 bg-white rounded-full transition',
                  smartRouting ? 'left-6' : 'left-1'
                )}
              />
            </button>
          </div>

          <input
            name="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={smartRouting}
            className={clsx(
              'mt-4 w-full h-14 rounded-xl px-4 border bg-muted/40',
              smartRouting && 'opacity-50 cursor-not-allowed'
            )}
          />
          <input type="hidden" name="smartRouting" value={smartRouting ? 'true' : 'false'} />
        </Section>

        {/* API KEY */}
        <Section title="API Key" icon={<Key className="w-5 h-5" />}>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <input
                name="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setVerifyStatus('idle');
                }}
                className="w-full h-14 rounded-xl px-4 border"
                placeholder={initialConfig?.apiKeyEncrypted ? "••••••••••••••••" : "Enter API key"}
              />
              {initialConfig?.apiKeyEncrypted && !apiKey && (
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                   <span className="text-[10px] font-black tracking-widest text-green-600 bg-green-50 px-2 py-1 rounded-sm border border-green-100">KEY CONFIGURED</span>
                </div>
              )}
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {verifyStatus === 'verifying' && <Loader2 className="animate-spin" />}
                {verifyStatus === 'valid' && <CheckCircle2 className="text-green-500" />}
                {verifyStatus === 'invalid' && <XCircle className="text-red-500" />}
              </div>
            </div>

            <button
              type="button"
              onClick={handleVerify}
              className="h-14 px-6 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Verify
            </button>

            {initialConfig?.apiKeyEncrypted && (
              <button
                type="button"
                onClick={handleDeleteKey}
                className="h-14 px-4 bg-red-50 text-red-600 cursor-pointer border border-red-100 rounded-xl font-bold hover:bg-red-100 transition-colors"
                title="Remove API Key"
              >
                <XCircle className="w-5 h-5" />
              </button>
            )}
          </div>

          {verifyStatus === 'invalid' && verifyError && (
            <p className="text-xs text-red-500 font-medium bg-red-50 p-2 rounded-lg border border-red-100 animate-in fade-in slide-in-from-top-1">
              {verifyError}
            </p>
          )}

          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            {initialConfig?.apiKeyEncrypted ? "Your key is stored securely. Enter a new one to overwrite it." : "Encrypted and never logged"}
          </p>
        </Section>

        {/* CUSTOM PROMPT */}
        <Section title="Custom Prompt" icon={<FileText className="w-5 h-5" />}>
          <textarea
            name="customPrompt"
            disabled={plan === 'Free'}
            defaultValue={initialConfig?.customPrompt || ''}
            className={clsx(
              'w-full min-h-35 rounded-xl p-4 border bg-muted/30',
              plan === 'Free' && 'opacity-50 cursor-not-allowed'
            )}
          />
          {plan === 'Free' && (
            <p className="text-xs text-orange-600 flex gap-2">
              <Lock className="w-4 h-4" /> Upgrade to Pro
            </p>
          )}
        </Section>

        {/* ACTIONS */}
        <div className="pt-8 border-t flex justify-between">
          <Link href="/settings" className="text-sm text-muted-foreground">
            Cancel
          </Link>

          <button
            type="submit"
            disabled={!canSave || isSaving}
            className="px-10 py-4 bg-primary text-primary-foreground rounded-xl font-bold flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------- Helper ---------- */
function Section({ title, icon, children }: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
        <h3 className="font-bold text-lg">{title}</h3>
      </div>
      {children}
    </div>
  );
}
