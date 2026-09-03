import type { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { getAuthEnvironment } from "./authEnv";

const authEnv = getAuthEnvironment();

export const authOptions: NextAuthOptions = {
  secret: authEnv.nextAuthSecret,
  logger: {
    error(code, metadata) {
      console.error("[NextAuth]", code, metadata);
    },
    warn(code) {
      console.warn("[NextAuth]", code);
    },
  },
  providers: [
    GithubProvider({
      clientId: authEnv.githubClientId,
      clientSecret: authEnv.githubClientSecret,
      authorization: {
        params: {
          scope: "read:user user:email read:org",
          // Force re-consent to ensure new scopes are granted if they were missing before
          prompt: "consent", 
        },
      },
    }),
  ],
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // @ts-expect-error token.sub is unknown in type but present
        session.user.id = token.sub;
        // @ts-expect-error token.accessToken exists
        session.accessToken = token.accessToken;
      }
      return session;
    },
  },
};

