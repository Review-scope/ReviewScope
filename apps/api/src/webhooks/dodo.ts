import { Hono } from 'hono';
import { db, installations, marketplaceEvents } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { Webhook } from 'standardwebhooks';

export const dodoWebhook = new Hono();

// Plan Mapping
// Update these keys to match your actual Dodo Product IDs or partial matches
const PLAN_MAPPING: Record<string, number> = {
  'pdt_0NWp5tVJHaqd61DHUM2HH': 7, // Pro Plan
  'pdt_0NWp62i22DOgcxMDCVElT': 8, // Team Plan
  'pdt_0NWowQyc1JmRK7w7CIXzX': 7, // Test Mode Pro Plan
  'pdt_0NWoysN8qwTC7iKq5HKXx': 8, // Test Mode Team Plan
  'pdt_pro': 7, // Legacy/Dev Pro Plan
  'pdt_team': 8, // Legacy/Dev Team Plan
};

const FREE_PLAN_ID = 3;
dodoWebhook.get('/', (c) => {
  return c.json({ message: 'Dodo Webhook is up and running' });
});
dodoWebhook.post('/', async (c) => {
  const signature = c.req.header('webhook-signature');
  const webhookId = c.req.header('webhook-id');
  const timestamp = c.req.header('webhook-timestamp');
  let secret = process.env.DODO_WEBHOOK_SECRET || process.env.DODO_PAYMENTS_WEBHOOK_SECRET;

  if (secret) {
    secret = secret.trim();
  }

  if (!signature || !webhookId || !timestamp || !secret) {
    console.error('[Dodo Webhook] Missing signature or configuration');
    return c.json({ error: 'Missing signature or configuration' }, 401);
  }

  const rawBody = await c.req.text();

  try {
    const wh = new Webhook(secret);
    const headers = {
      'webhook-id': webhookId,
      'webhook-signature': signature,
      'webhook-timestamp': timestamp,
    };
    
    // Webhook.verify throws an error if verification fails
    wh.verify(rawBody, headers);
  } catch (err) {
    console.error('[Dodo Webhook] Invalid signature:', err);
    console.log('[Dodo Webhook Debug]', {
      webhookId,
      timestamp,
      receivedSignature: signature,
      secretPrefix: secret ? secret.substring(0, 4) + '...' : 'undefined',
      secretLength: secret ? secret.length : 0,
      rawBodyLength: rawBody.length,
      rawBodyPreview: rawBody.substring(0, 50)
    });
    return c.json({ error: 'Invalid signature' }, 401);
  }

  try {
    const payload = JSON.parse(rawBody);
    const { type, data } = payload;
    
    console.log(`[Dodo Webhook] Received event: ${type}`);

    // Try to extract GitHub Account ID from metadata
    // We expect client_reference_id to be passed in the Payment Link URL
    let githubAccountId = 0;
    console.log("user: ",data)
    // Check top-level metadata first (common in payment links)
    if (data?.metadata?.client_reference_id) {
      githubAccountId = parseInt(data.metadata.client_reference_id, 10);
    } 
    // Check payload.metadata (sometimes Dodo wraps it differently)
    else if (payload?.metadata?.client_reference_id) {
      githubAccountId = parseInt(payload.metadata.client_reference_id, 10);
    }
    // Check root level client_reference_id (standard in some Dodo events)
    else if (data?.client_reference_id) {
      githubAccountId = parseInt(data.client_reference_id, 10);
    }
    else if (payload?.client_reference_id) {
      githubAccountId = parseInt(payload.client_reference_id, 10);
    }
    // Fallback: Check if it's in the subscription metadata (for subscription events)
    else if (data?.subscription?.metadata?.client_reference_id) {
      githubAccountId = parseInt(data.subscription.metadata.client_reference_id, 10);
    }

    // Log for debugging
    console.log(`[Dodo Webhook] Extracted GitHub Account ID: ${githubAccountId} from`, {
      dataMetadata: data?.metadata,
      payloadMetadata: payload?.metadata,
      dataRootId: data?.client_reference_id,
      payloadRootId: payload?.client_reference_id
    });

    // Log the event to marketplace_events table for audit
    await db.insert(marketplaceEvents).values({
      githubAccountId: githubAccountId || 0,
      action: type,
      planId: 0, // Will be updated if we identify the plan
      sender: 'dodo-payments',
      payload: payload,
    });

    if (type === 'payment.succeeded' || type === 'subscription.created' || type === 'subscription.updated') {
      if (!githubAccountId) {
        console.warn(`[Dodo Webhook] No client_reference_id found in metadata. Customer Email: ${data?.customer?.email || 'N/A'}`);
        console.warn('[Dodo Webhook] Skipping plan update due to missing account ID');
        return c.json({ received: true });
      }

      // Determine Plan
      const productId = data.product_id || 
                       (data.lines && data.lines[0]?.product_id) ||
                       (data.product_cart && data.product_cart[0]?.product_id);
      
      let planId = PLAN_MAPPING[productId];

      // Fallback: Check for keywords if exact ID not found
      if (!planId && productId) {
        if (productId.toLowerCase().includes('pro')) planId = 7;
        else if (productId.toLowerCase().includes('team')) planId = 8;
      }

      if (planId) {
        await db.update(installations)
          .set({
            planId: planId,
            planName: planId === 7 ? 'Pro' : (planId === 8 ? 'Team' : 'Custom'),
            // Determine billing cycle from data if available, or default
            billingCycle: data.billing_cycle || 'monthly',
            status: 'active',
            updatedAt: new Date(),
          })
          .where(eq(installations.githubAccountId, githubAccountId));
          
        console.log(`[Dodo Webhook] Updated plan for account ${githubAccountId} to ${planId}`);
      } else {
        console.warn(`[Dodo Webhook] Could not map product ID ${productId} to a plan`);
      }
    } else if (type === 'subscription.cancelled' || type === 'subscription.expired') {
       if (githubAccountId) {
         await db.update(installations)
          .set({
            planId: FREE_PLAN_ID,
            planName: 'Free',
            billingCycle: null,
            updatedAt: new Date(),
          })
          .where(eq(installations.githubAccountId, githubAccountId));
          
          console.log(`[Dodo Webhook] Downgraded account ${githubAccountId} to Free`);
       }
    }

    return c.json({ received: true });
  } catch (err) {
    console.error('[Dodo Webhook] Error processing webhook:', err);
    return c.json({ error: 'Internal Server Error' }, 500);
  }
});
