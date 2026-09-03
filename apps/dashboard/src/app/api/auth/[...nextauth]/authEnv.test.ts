import { describe, expect, it } from "vitest";
import { getAuthEnvironment } from "./authEnv";

describe("getAuthEnvironment", () => {
  it("uses the primary GitHub OAuth env vars", () => {
    expect(
      getAuthEnvironment({
        GITHUB_CLIENT_ID: "client-id",
        GITHUB_CLIENT_SECRET: "client-secret",
        NEXTAUTH_SECRET: "nextauth-secret",
      }),
    ).toEqual({
      githubClientId: "client-id",
      githubClientSecret: "client-secret",
      nextAuthSecret: "nextauth-secret",
    });
  });

  it("falls back to the legacy GitHub OAuth env vars documented previously", () => {
    expect(
      getAuthEnvironment({
        GITHUB_ID: "legacy-client-id",
        GITHUB_SECRET: "legacy-client-secret",
      }),
    ).toMatchObject({
      githubClientId: "legacy-client-id",
      githubClientSecret: "legacy-client-secret",
    });
  });

  it("falls back to AUTH_SECRET for deployments using the newer Auth.js env name", () => {
    expect(
      getAuthEnvironment({
        AUTH_SECRET: "auth-secret",
      }),
    ).toMatchObject({
      nextAuthSecret: "auth-secret",
    });
  });

  it("prefers primary names over legacy aliases", () => {
    expect(
      getAuthEnvironment({
        GITHUB_CLIENT_ID: "client-id",
        GITHUB_CLIENT_SECRET: "client-secret",
        GITHUB_ID: "legacy-client-id",
        GITHUB_SECRET: "legacy-client-secret",
      }),
    ).toMatchObject({
      githubClientId: "client-id",
      githubClientSecret: "client-secret",
    });
  });
});
