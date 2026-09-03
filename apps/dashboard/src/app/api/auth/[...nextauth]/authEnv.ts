type Env = Record<string, string | undefined>;

export type AuthEnvironment = {
  githubClientId: string;
  githubClientSecret: string;
  nextAuthSecret: string | undefined;
};

function readEnv(env: Env, key: string, aliases: string[] = []) {
  for (const candidate of [key, ...aliases]) {
    const value = env[candidate]?.trim();
    if (value) return value;
  }

  return undefined;
}

export function getAuthEnvironment(env: Env = process.env): AuthEnvironment {
  const githubClientId = readEnv(env, "GITHUB_CLIENT_ID", ["GITHUB_ID"]);
  const githubClientSecret = readEnv(env, "GITHUB_CLIENT_SECRET", ["GITHUB_SECRET"]);
  const nextAuthSecret = readEnv(env, "NEXTAUTH_SECRET", ["AUTH_SECRET"]);

  return {
    githubClientId: githubClientId ?? "",
    githubClientSecret: githubClientSecret ?? "",
    nextAuthSecret,
  };
}
