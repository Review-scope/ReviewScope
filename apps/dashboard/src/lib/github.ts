
export async function getUserOrgIds(accessToken: string): Promise<number[]> {
  try {
    // console.log(`[GitHub] Fetching orgs with token ending in ...${accessToken.slice(-10)}`);
    let orgs: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(`https://api.github.com/user/orgs?per_page=100&page=${page}`, {
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
        cache: 'no-store', // Ensure we always fetch fresh data
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`[GitHub] Failed to fetch orgs (Page ${page}): ${response.status} ${response.statusText}`, text);
        break;
      }

      const pageOrgs = await response.json();
      if (pageOrgs.length === 0) {
        hasMore = false;
      } else {
        orgs = [...orgs, ...pageOrgs];
        page++;
      }
    }
    // console.log("Orgs:",orgs)
    return orgs.map((org: any) => org.id);
  } catch (error) {
    console.error('Failed to fetch user orgs:', error);
    return [];
  }
}

export async function getUserOrgs(accessToken: string): Promise<{ id: number; login: string; avatar_url: string }[]> {
  try {
    let orgs: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await fetch(`https://api.github.com/user/orgs?per_page=100&page=${page}`, {
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
        cache: 'no-store',
      });

      if (!response.ok) break;

      const pageOrgs = await response.json();
      if (pageOrgs.length === 0) {
        hasMore = false;
      } else {
        orgs = [...orgs, ...pageOrgs];
        page++;
      }
    }

    return orgs.map((org: any) => ({
      id: org.id,
      login: org.login,
      avatar_url: org.avatar_url
    }));
  } catch (error) {
    console.error('Failed to fetch user orgs:', error);
    return [];
  }
}
