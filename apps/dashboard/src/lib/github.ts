
export async function getUserOrgIds(accessToken: string): Promise<number[]> {
  try {
    const response = await fetch('https://api.github.com/user/orgs', {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) return [];

    const orgs = await response.json();
    return orgs.map((org: any) => org.id);
  } catch (error) {
    console.error('Failed to fetch user orgs:', error);
    return [];
  }
}
