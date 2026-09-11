import { YnabClientError } from './errors';
import type { YnabErrorCode } from './errors';

export type { YnabErrorCode } from './errors';
export { YnabClientError } from './errors';

export async function ynabProxyFetch<T>(
  path: string,
  params: Record<string, string> = {}
): Promise<T> {
  const search = new URLSearchParams(params).toString();
  const url = `/api/ynab/${path}${search ? `?${search}` : ''}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new YnabClientError({
      code: 'network-unavailable',
      message: 'Network unavailable.',
      status: null
    });
  }

  if (!response.ok) {
    throw await proxyError(response);
  }

  return (await response.json()) as T;
}

async function proxyError(response: Response): Promise<YnabClientError> {
  let code: YnabErrorCode = 'fetch-error';
  let message = `YNAB request failed (${response.status}).`;
  let retryAfterSeconds: number | null = null;

  try {
    const body = (await response.json()) as {
      code?: YnabErrorCode;
      message?: string;
      retryAfterSeconds?: number | null;
    };
    if (body.code) code = body.code;
    if (body.message) message = body.message;
    if (typeof body.retryAfterSeconds === 'number') retryAfterSeconds = body.retryAfterSeconds;
  } catch {
    // keep defaults
  }

  if (response.status === 401 && code !== 'rate-limited') {
    code = 'reconnect-required';
    message = 'Reconnect YNAB.';
  }

  return new YnabClientError({ code, message, status: response.status, retryAfterSeconds });
}
