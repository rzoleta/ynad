export type YnabErrorCode =
  | 'reconnect-required'
  | 'rate-limited'
  | 'network-unavailable'
  | 'budget-unavailable'
  | 'fetch-error';

export class YnabClientError extends Error {
  code: YnabErrorCode;
  retryAfterSeconds: number | null;
  status: number | null;

  constructor(args: {
    code: YnabErrorCode;
    message: string;
    status?: number | null;
    retryAfterSeconds?: number | null;
  }) {
    super(args.message);
    this.name = 'YnabClientError';
    this.code = args.code;
    this.retryAfterSeconds = args.retryAfterSeconds ?? null;
    this.status = args.status ?? null;
  }
}

export function getYnabErrorCode(error: unknown): YnabErrorCode {
  return error instanceof YnabClientError ? error.code : 'fetch-error';
}

export function getYnabErrorMessage(error: unknown): string {
  if (error instanceof YnabClientError) return error.message;
  if (error instanceof Error) return error.message;
  return 'YNAB data could not be fetched.';
}
