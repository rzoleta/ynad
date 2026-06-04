export const DEBUG_FETCH_PREFIX = '[DEBUG-YNAD-FETCH]';

export function debugFetch(message: string, details?: Record<string, unknown>) {
  console.log(DEBUG_FETCH_PREFIX, message, details ?? {});
}
