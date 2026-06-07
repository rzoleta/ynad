import { env } from '$env/dynamic/public';
import { clearSelectedBudgetId as clearStoredSelectedBudgetId } from '$lib/app/budget-selection';

export {
  clearSelectedBudgetId,
  readSelectedBudgetId,
  writeSelectedBudgetId
} from '$lib/app/budget-selection';

export type YnabToken = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
};

const TOKEN_KEY = 'ynad.ynab-token';
const OAUTH_KEY = 'ynad.oauth';

export function readToken(): YnabToken | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;

  try {
    const token = JSON.parse(raw) as YnabToken;
    return token.accessToken ? token : null;
  } catch {
    return null;
  }
}

export function writeToken(token: YnabToken) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
}

export function clearYnabConnection() {
  localStorage.removeItem(TOKEN_KEY);
  clearStoredSelectedBudgetId();
  sessionStorage.removeItem(OAUTH_KEY);
}

export async function startYnabOAuth() {
  const clientId = getClientId();
  if (!clientId) {
    throw new Error('PUBLIC_YNAB_CLIENT_ID is required to connect YNAB.');
  }

  const state = crypto.randomUUID();
  const redirectUri = `${location.origin}/auth/ynab/callback`;

  sessionStorage.setItem(OAUTH_KEY, JSON.stringify({ state, returnTo: '/app' }));

  const url = new URL('https://app.ynab.com/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'token');
  url.searchParams.set('scope', 'read-only');
  url.searchParams.set('state', state);

  location.assign(url.toString());
}

export function completeYnabOAuth(params: URLSearchParams) {
  const raw = sessionStorage.getItem(OAUTH_KEY);
  if (!raw) throw new Error('OAuth session expired. Start connection again.');

  const session = JSON.parse(raw) as { state: string; returnTo: string };
  const state = params.get('state');
  if (!state || session.state !== state)
    throw new Error('OAuth state mismatch. Start connection again.');

  const accessToken = params.get('access_token');
  if (!accessToken) throw new Error('YNAB did not return an access token.');
  const expiresIn = Number(params.get('expires_in'));

  writeToken({
    accessToken,
    expiresAt: Number.isFinite(expiresIn) ? Date.now() + expiresIn * 1000 : undefined
  });

  sessionStorage.removeItem(OAUTH_KEY);
  return session.returnTo || '/app';
}

function getClientId() {
  return env.PUBLIC_YNAB_CLIENT_ID;
}
