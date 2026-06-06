import { compareIsoDate } from './dates';
import type { PayeeEntity, TransactionEntry } from './types';

export function getPayeeKey(payeeId: string | null, payeeName: string | null): string | null {
  if (payeeId) return `id:${payeeId}`;
  if (payeeName) return `name:${payeeName}`;
  return null;
}

export function buildPayees(entries: TransactionEntry[]): PayeeEntity[] {
  const payeeByKey = new Map<string, PayeeEntity>();

  for (const entry of entries) {
    const key = getPayeeKey(entry.payeeId, entry.payeeName);
    if (!key) continue;

    const current = payeeByKey.get(key);
    if (current) {
      current.transactionCount += 1;
      if (compareIsoDate(entry.date, current.lastUsedDate) > 0) current.lastUsedDate = entry.date;
      continue;
    }

    payeeByKey.set(key, {
      key,
      id: entry.payeeId,
      name: entry.payeeName ?? 'Unknown Payee',
      lastUsedDate: entry.date,
      transactionCount: 1
    });
  }

  return [...payeeByKey.values()].sort((left, right) => {
    const date = compareIsoDate(right.lastUsedDate, left.lastUsedDate);
    if (date !== 0) return date;
    return left.name.localeCompare(right.name);
  });
}
