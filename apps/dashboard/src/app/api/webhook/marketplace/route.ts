import { headers } from 'next/headers';
import { db, installations, marketplaceEvents } from '@/lib/db';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export async function GET(req: Request) {
  return new Response('ReviewScope Marketplace Webhook is active', { status: 200 });
}

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('x-hub-signature-256');
  const contentType = headersList.get('content-type');
  
  // 1. Verify Signature
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error('GITHUB_WEBHOOK_SECRET is not set');
    return new Response('Server Error', { status: 500 });
  }

  if (!signature) {
    return new Response('No signature', { status: 401 });
  }

  const hmac = crypto.createHmac('sha256', secret);
  
  // GitHub sends payload as a form field 'payload' if content-type is x-www-form-urlencoded
  // But the signature is generated using the raw body.
  // Wait, if it's x-www-form-urlencoded, the body is `payload=%7B...%7D`.
  // Does GitHub sign the raw body or the JSON payload?
  // Documentation says: "The HMAC hex digest of the response body."
  // So we verify the raw body `req.text()` against the signature.
  
  hmac.update(body);
  const digest = `sha256=${hmac.digest('hex')}`;

  try {
    const signatureBuffer = Buffer.from(signature);
    const digestBuffer = Buffer.from(digest);
    
    if (signatureBuffer.length !== digestBuffer.length || !crypto.timingSafeEqual(signatureBuffer, digestBuffer)) {
      return new Response('Invalid signature', { status: 401 });
    }
  } catch (error) {
    return new Response('Signature verification failed', { status: 401 });
  }

  // 2. Parse Payload
  let payload: any;
  if (contentType?.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(body);
    const payloadStr = params.get('payload');
    if (!payloadStr) {
      return new Response('No payload found', { status: 400 });
    }
    payload = JSON.parse(payloadStr);
  } else {
    payload = JSON.parse(body);
  }

  // 3. Handle Marketplace Events
  // Note: Marketplace webhooks might not send x-github-event header? 
  // Usually they do, 'marketplace_purchase'.
  // But let's check the payload content as fallback.
  
  const action = payload.action;
  const mp = payload.marketplace_purchase;

  if (!mp) {
    // Not a marketplace event we care about
    return new Response('Ignored', { status: 200 });
  }

  const account = mp.account;
  const sender = payload.sender;

  console.log(`[Marketplace Webhook] Action: ${action} | Account: ${account.login} | Plan: ${mp.plan.name}`);

  try {
    // Log event
    await db.insert(marketplaceEvents).values({
      githubAccountId: account.id,
      action: action,
      planId: mp.plan.id,
      sender: sender.login,
      payload: payload,
    });

    // GitHub Marketplace logic removed in favor of Dodo Payments
    // We log the event above for audit, but we do not update the installation plan.
    console.warn(`[Marketplace Webhook] Ignoring GitHub plan update: ${action} (Dodo Payments active)`);

    return new Response('Marketplace event ignored (Dodo Payments active)', { status: 200 });

  } catch (error) {
    console.error('[Marketplace Webhook] Error processing event:', error);
    return new Response('Error processing event', { status: 500 });
  }
}
