import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { genericOAuth } from 'better-auth/plugins';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { getDb } from './db';
import * as schema from './db/schema';

export const YNAB_PROVIDER_ID = 'ynab';

function createAuth() {
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL || env.ORIGIN || undefined,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), {
      provider: 'pg',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification
      }
    }),
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 5 * 60 }
    },
    account: {
      encryptOAuthTokens: true
    },
    plugins: [
      genericOAuth({
        config: [
          {
            providerId: YNAB_PROVIDER_ID,
            clientId: env.YNAB_CLIENT_ID,
            clientSecret: env.YNAB_CLIENT_SECRET,
            authorizationUrl: 'https://app.ynab.com/oauth/authorize',
            tokenUrl: 'https://app.ynab.com/oauth/token',
            scopes: ['read-only'],
            pkce: true,
            getUserInfo: async (tokens) => {
              const response = await fetch('https://api.ynab.com/v1/user', {
                headers: { authorization: `Bearer ${tokens.accessToken}` }
              });
              if (!response.ok) return null;

              const body = (await response.json()) as { data?: { user?: { id?: string } } };
              const ynabUserId = body.data?.user?.id;
              if (!ynabUserId) return null;

              return {
                id: ynabUserId,
                name: '',
                email: `${ynabUserId}@users.ynad.app`,
                emailVerified: false
              };
            }
          }
        ]
      }),
      sveltekitCookies(getRequestEvent)
    ]
  });
}

type Auth = ReturnType<typeof createAuth>;

let instance: Auth | null = null;

export function getAuth(): Auth {
  if (!instance) instance = createAuth();
  return instance;
}

export type Session = Auth['$Infer']['Session']['session'];
export type User = Auth['$Infer']['Session']['user'];
