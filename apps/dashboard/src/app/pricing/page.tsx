import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { db, installations } from '@/lib/db';
import { inArray } from 'drizzle-orm';
import { getUserOrgs } from "@/lib/github";
import { PricingClient } from "./pricing-client";

export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  
  // Prepare accounts list
  let accounts: any[] = [];
  
  if (session?.user) {
    // 1. Get User Details
    const userId = parseInt((session.user as any).id);
    const userName = session.user.name || (session.user as any).login || 'Personal Account';
    
    // 2. Get User Orgs
    // @ts-expect-error session.accessToken exists
    const accessToken = session.accessToken;
    const orgs = accessToken ? await getUserOrgs(accessToken) : [];
    
    // 3. Get all IDs to fetch plans
    const allAccountIds = [userId, ...orgs.map(o => o.id)];
    
    // 4. Fetch current plans from DB
    const currentInstallations = await db
      .select()
      .from(installations)
      .where(inArray(installations.githubAccountId, allAccountIds));
      
    const planMap = new Map(currentInstallations.map(inst => [inst.githubAccountId, inst]));

    // 5. Construct Accounts List
    // Add Personal Account
    const userPlan = planMap.get(userId);
    accounts.push({
      id: userId,
      name: userName,
      type: 'User',
      planId: userPlan?.planId || 0, // Default Free
      planName: userPlan?.planName || 'Free',
    });

    // Add Orgs
    for (const org of orgs) {
      const orgPlan = planMap.get(org.id);
      accounts.push({
        id: org.id,
        name: org.login,
        type: 'Organization',
        planId: orgPlan?.planId || 0,
        planName: orgPlan?.planName || 'Free',
      });
    }
  }

  return (
    <PricingClient 
      accounts={accounts} 
      dodoLinks={{
        free: process.env.NEXT_PUBLIC_DODO_PAYMENT_LINK_FREE,
        pro: process.env.NEXT_PUBLIC_DODO_PAYMENT_LINK_PRO,
      }} 
    />
  );
}
