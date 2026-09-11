import { createAuthClient } from 'better-auth/svelte';

export const authClient = createAuthClient();

export async function signInWithYnab(callbackURL = '/app') {
  await authClient.signIn.social({
    provider: 'ynab',
    callbackURL
  });
}
