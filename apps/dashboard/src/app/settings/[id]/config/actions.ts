'use server';

/* eslint-disable no-console */
import { db, configs, installations, repositories } from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { encrypt, decrypt } from "@reviewscope/security";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { createProvider } from "@reviewscope/llm-core";
import { getUserOrgIds } from "@/lib/github";
import { getPlanLimits, PlanTier } from "../../../../../../worker/src/lib/plans";

const configSchema = z.object({
  provider: z.enum(['sarvam', 'gemini', 'openai']),
  model: z.string().min(1),
  customPrompt: z.string().optional(),
  apiKey: z.string().optional(),
  smartRouting: z.string().optional(),
});

export async function verifyApiKey(provider: string, model: string, apiKey: string = '', installationId?: string) {
  if (!installationId) return { error: 'Installation context is required' };
  const installation = await verifyOwnership(installationId);
  if (!installation) return { error: 'Unauthorized' };

  const limits = getPlanLimits(installation.planId, installation.expiresAt);
  if (limits.tier === PlanTier.PRO && provider === 'sarvam') {
    return { error: 'Sarvam is available only on Free plan. Use Gemini or OpenAI on Pro.' };
  }
  if (limits.tier === PlanTier.FREE && provider === 'sarvam') {
    return { success: true };
  }

  let keyToUse = apiKey;

  // Utilize stored key if authorized and no new key provided
  if (!keyToUse) {
    const [config] = await db.select().from(configs).where(eq(configs.installationId, installationId));
    if (config?.apiKeyEncrypted) {
      const secret = process.env.ENCRYPTION_KEY;
      if (secret) {
        keyToUse = decrypt(config.apiKeyEncrypted, secret);
      }
    }
  }

  if (!keyToUse || keyToUse.trim() === '') return { error: 'API Key is required to verify' };
  if (!model || model.trim() === '') return { error: 'Model name is required' };

  try {
    const llm = createProvider(provider as 'openai' | 'gemini' | 'sarvam', keyToUse);
    
    // We try to perform a minimal chat completion with the USER SPECIFIED model
    // to verify both the key AND the model access.
    try {
      if (provider === 'gemini') {
        // Gemini verification
        await llm.chat([{ role: 'user', content: 'Hi' }], { model: model, maxTokens: 1 });
      } else {
        // OpenAI verification
        await llm.chat([{ role: 'user', content: 'Hi' }], { model: model, maxTokens: 1 });
      }
    } catch (modelError: unknown) {
      // If the specific model fails, we try a fallback check to see if it's just the model name
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      console.warn(`[Verify] Specific model "${model}" failed, trying fallback check:`, (modelError as any).message);
      
      try {
        if (provider === 'gemini') {
          await llm.embed('Verification test', { model: model });
        } else {
          await llm.chat([{ role: 'user', content: 'Hi' }], { model: model, maxTokens: 1 });
        }
        return { 
          success: false, 
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          error: `API Key is valid, but model "${model}" could not be reached. Please check the Model Name. Error: ${(modelError as any).message}` 
        };
      } catch (keyError: unknown) {
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        return { success: false, error: `Connection failed. Please check your API Key or Model Name. Error: ${(keyError as any).message}` };
      }
    }
    
    return { success: true };
  } catch (error: unknown) {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    console.error(`[Verify] Cryptic failure:`, (error as any).message);
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    return { error: (error as any).message || 'System error during verification' };
  }
}

async function verifyOwnership(installationId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  // @ts-expect-error session.accessToken exists
  const accessToken = session.accessToken;
  // @ts-expect-error session.user.id
  const githubUserId = parseInt(session.user.id);

  const orgIds = accessToken ? await getUserOrgIds(accessToken) : [];
  const allAccountIds = [githubUserId, ...orgIds];

  const [installation] = await db
    .select()
    .from(installations)
    .where(and(
      eq(installations.id, installationId),
      inArray(installations.githubAccountId, allAccountIds)
    ))
    .limit(1);

  return installation;
}

export async function updateConfig(installationId: string, formData: FormData) {
  const installation = await verifyOwnership(installationId);
  if (!installation) {
    return { error: 'Unauthorized' };
  }

  const validatedFields = configSchema.safeParse({
    provider: formData.get('provider'),
    model: formData.get('model'),
    customPrompt: formData.get('customPrompt') || undefined,
    apiKey: formData.get('apiKey') || undefined,
    smartRouting: formData.get('smartRouting') || undefined,
  });

  if (!validatedFields.success) {
    console.error('Validation errors:', validatedFields.error);
    return { error: 'Invalid fields: ' + validatedFields.error.issues.map(i => i.path.join('.') + ': ' + i.message).join(', ') };
  }

  const { provider, model, customPrompt, apiKey, smartRouting } = validatedFields.data;
  const limits = getPlanLimits(installation.planId, installation.expiresAt);

  try {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const existingConfig = await db.query.configs.findFirst({
      where: eq(configs.installationId, installationId),
    });

    let apiKeyEncrypted = existingConfig?.apiKeyEncrypted;
    let apiKeyChanged = false;

    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    if (apiKey && apiKey.trim() !== '') {
      const secret = process.env.ENCRYPTION_KEY;
      if (!secret) {
        throw new Error('ENCRYPTION_KEY not configured');
      }
      apiKeyEncrypted = encrypt(apiKey, secret);
      apiKeyChanged = true;
    }

    if (limits.tier === PlanTier.PRO) {
      if (provider === 'sarvam') return { error: 'Sarvam is available only on Free plan. Choose Gemini or OpenAI.' };
      if (!apiKeyEncrypted) return { error: 'Pro plan requires an API key before saving configuration.' };
    } else {
      if (provider === 'sarvam') {
        if (model !== 'sarvam-m') return { error: 'Sarvam provider on Free must use sarvam-m.' };
      } else if (!apiKeyEncrypted) {
        return { error: 'Gemini/OpenAI on Free plan requires your own API key.' };
      }
    }

    if (existingConfig) {
      await db
        .update(configs)
        .set({
          provider,
          model,
          customPrompt: customPrompt || null,
          apiKeyEncrypted: apiKeyEncrypted || null,
          smartRouting: smartRouting === 'true',
          updatedAt: new Date(),
        })
        .where(eq(configs.installationId, installationId));
    } else {
      await db.insert(configs).values({
        installationId,
        provider,
        model,
        customPrompt: customPrompt || null,
        apiKeyEncrypted: apiKeyEncrypted || null,
        smartRouting: smartRouting === 'true',
      });
    }

    // Trigger Indexing if API key was provided/updated
    const shouldIndex = (apiKeyChanged || (!existingConfig?.apiKeyEncrypted && apiKeyEncrypted)) && limits.allowRAG;
    console.warn(`[Config] Update successful. apiKeyChanged: ${apiKeyChanged}, newlyAdded: ${!existingConfig?.apiKeyEncrypted && !!apiKeyEncrypted}, allowRAG: ${limits.allowRAG}, shouldIndex: ${shouldIndex}`);

    if (shouldIndex) {
      // Trigger indexing for all active repositories in this installation
      try {
        const activeRepos = await db
          .select({ id: repositories.id })
          .from(repositories)
          .where(and(
            eq(repositories.installationId, installationId),
            eq(repositories.status, 'active')
          ));

        const apiUrl = process.env.INTERNAL_API_URL || 'http://localhost:3001';
        for (const repo of activeRepos) {
          fetch(`${apiUrl}/api/v1/jobs/index/${repo.id}`, { method: 'POST' }).catch(err => 
            console.error(`[Config] Failed to trigger indexing for repo ${repo.id}:`, err)
          );
        }
        console.info(`[Config] Triggered indexing for ${activeRepos.length} repos for installation ${installationId}`);
      } catch (err) {
        console.error('[Config] Failed to fetch repos for indexing trigger:', err);
      }
    }

    revalidatePath(`/settings/${installationId}/config`);
    revalidatePath(`/settings`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update config:', error);
    return { error: 'Failed to update configuration' };
  }
}

export async function deleteApiKey(installationId: string) {
  const githubUserId = await verifyOwnership(installationId);
  if (!githubUserId) {
    return { error: 'Unauthorized' };
  }

  try {
    await db
      .update(configs)
      .set({
        apiKeyEncrypted: null,
        updatedAt: new Date(),
      })
      .where(eq(configs.installationId, installationId));

    revalidatePath(`/settings/${installationId}/config`);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete API key:', error);
    return { error: 'Failed to delete API key' };
  }
}
