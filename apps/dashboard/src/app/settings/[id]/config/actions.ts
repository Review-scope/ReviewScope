'use server';

import { db, configs, installations, repositories } from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { encrypt, decrypt } from "@reviewscope/security";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { redirect } from "next/navigation";
import { createProvider } from "@reviewscope/llm-core";
import { getUserOrgIds } from "@/lib/github";

const configSchema = z.object({
  provider: z.enum(['gemini', 'openai']),
  model: z.string().min(1),
  customPrompt: z.string().optional(),
  apiKey: z.string().optional(),
  smartRouting: z.string().optional(),
});

export async function verifyApiKey(provider: string, model: string, apiKey: string = '', installationId?: string) {
  let keyToUse = apiKey;

  // Utilize stored key if authorized and no new key provided
  if (!keyToUse && installationId) {
    const installation = await verifyOwnership(installationId);
    if (installation) {
      const [config] = await db.select().from(configs).where(eq(configs.installationId, installationId));
      if (config?.apiKeyEncrypted) {
        const secret = process.env.ENCRYPTION_KEY;
        if (secret) {
          keyToUse = decrypt(config.apiKeyEncrypted, secret);
        }
      }
    }
  }

  if (!keyToUse || keyToUse.trim() === '') return { error: 'API Key is required to verify' };
  if (!model || model.trim() === '') return { error: 'Model name is required' };

  try {
    const llm = createProvider(provider as 'openai' | 'gemini', keyToUse);
    
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
    } catch (modelError: any) {
      // If the specific model fails, we try a fallback check to see if it's just the model name
      console.warn(`[Verify] Specific model "${model}" failed, trying fallback check:`, modelError.message);
      
      try {
        if (provider === 'gemini') {
          await llm.embed('Verification test', { model: 'text-embedding-004' });
        } else {
          await llm.chat([{ role: 'user', content: 'Hi' }], { model: 'gpt-3.5-turbo', maxTokens: 1 });
        }
        return { 
          success: false, 
          error: `API Key is valid, but model "${model}" could not be reached. Error: ${modelError.message}` 
        };
      } catch (keyError: any) {
        return { success: false, error: `Invalid API Key for ${provider}. Error: ${keyError.message}` };
      }
    }
    
    return { success: true };
  } catch (error: any) {
    console.error(`[Verify] Cryptic failure:`, error.message);
    return { error: error.message || 'System error during verification' };
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

export async function syncRepositories(installationId: string) {
  const installation = await verifyOwnership(installationId);
  if (!installation) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const session = await getServerSession(authOptions);
    // @ts-expect-error session.accessToken exists
    const accessToken = session?.accessToken;

    if (!accessToken) {
      return { success: false, error: "No access token found" };
    }

    // 1. Get Installation Token
    // We can't use user token to list installation repos directly if we want all of them including those not owned by user but part of installation
    // BUT, for now, we can try to use the user token to list repos accessible to the installation if we had an endpoint.
    // Better: Use the GitHub App credentials. But we are in the dashboard, we might not have the App private key loaded here?
    // The dashboard DOES have access to DB.
    
    // Actually, we can use the user's access token to list the repositories that the INSTALLATION has access to.
    // Endpoint: GET /user/installations/{installation_id}/repositories
    
    let allRepos: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const res = await fetch(`https://api.github.com/user/installations/${installation.githubInstallationId}/repositories?per_page=100&page=${page}`, {
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("Failed to fetch repos:", errText);
        break;
      }

      const data = await res.json();
      if (data.repositories && data.repositories.length > 0) {
        allRepos = [...allRepos, ...data.repositories];
        page++;
      } else {
        hasMore = false;
      }
    }

    if (allRepos.length === 0) {
      return { success: true, count: 0, message: "No repositories found for this installation." };
    }

    // 2. Sync to DB
    let count = 0;
    for (const repo of allRepos) {
      await db.insert(repositories).values({
        installationId: installation.id,
        githubRepoId: repo.id,
        fullName: repo.full_name,
        // isActive: false // Default
      }).onConflictDoUpdate({
        target: repositories.githubRepoId,
        set: {
          fullName: repo.full_name,
          installationId: installation.id,
          status: 'active',
          updatedAt: new Date()
        }
      });
      count++;
    }

    revalidatePath(`/settings/${installationId}/config`);
    return { success: true, count };
  } catch (error: any) {
    console.error("Sync error:", error);
    return { success: false, error: error.message };
  }
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

  try {
    const existingConfig = await db.query.configs.findFirst({
      where: eq(configs.installationId, installationId),
    });

    let apiKeyEncrypted = existingConfig?.apiKeyEncrypted;
    let apiKeyChanged = false;

    if (apiKey && apiKey.trim() !== '') {
      const secret = process.env.ENCRYPTION_KEY;
      if (!secret) {
        throw new Error('ENCRYPTION_KEY not configured');
      }
      apiKeyEncrypted = encrypt(apiKey, secret);
      apiKeyChanged = true;
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
    const shouldIndex = apiKeyChanged || (!existingConfig?.apiKeyEncrypted && apiKeyEncrypted);
    console.warn(`[Config] Update successful. apiKeyChanged: ${apiKeyChanged}, newlyAdded: ${!existingConfig?.apiKeyEncrypted && !!apiKeyEncrypted}, shouldIndex: ${shouldIndex}`);

    if (shouldIndex) {
      // Trigger indexing for all active repositories in this installation
      try {
        const activeRepos = await db
          .select({ id: repositories.id })
          .from(repositories)
          .where(and(
            eq(repositories.installationId, installationId),
            eq(repositories.isActive, true),
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
