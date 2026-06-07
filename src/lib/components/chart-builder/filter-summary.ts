import type { IdFilter, PayeeFilter, PayeeRef } from '$lib/app/chart-config';
import type {
  AccountEntity,
  CategoryEntity,
  CategoryGroupEntity,
  PayeeEntity
} from '$lib/domain/types';

export type AccountGroupKey = 'cash' | 'credit' | 'tracking' | 'loan' | 'closed' | 'other';

export const accountGroupLabels = {
  cash: 'Cash accounts',
  credit: 'Credit accounts',
  tracking: 'Tracking accounts',
  loan: 'Loan/debt accounts',
  closed: 'Closed accounts',
  other: 'Other accounts'
} satisfies Record<AccountGroupKey, string>;

export const accountGroupOrder: AccountGroupKey[] = [
  'cash',
  'credit',
  'tracking',
  'loan',
  'closed',
  'other'
];

export type AccountGroup = {
  key: AccountGroupKey;
  label: string;
  accounts: AccountEntity[];
};

export type CategoryGroupOption = {
  id: string;
  name: string;
  categories: CategoryEntity[];
};

export type PayeeOption = PayeeRef & {
  key: string;
  lastUsedDate?: string;
  transactionCount?: number;
  missing?: boolean;
};

export function getAccountGroupKey(account: AccountEntity): AccountGroupKey {
  if (account.closed) return 'closed';
  if (account.accountClass === 'credit') return 'credit';
  if (account.accountClass === 'loan') return 'loan';
  if (account.accountClass === 'tracking' || !account.onBudget) return 'tracking';
  if (account.accountClass === 'cash') return 'cash';
  return 'other';
}

export function groupAccounts(accounts: AccountEntity[]): AccountGroup[] {
  const grouped = new Map<AccountGroupKey, AccountEntity[]>(
    accountGroupOrder.map((key) => [key, []])
  );

  for (const account of accounts) {
    grouped.get(getAccountGroupKey(account))?.push(account);
  }

  return accountGroupOrder
    .map((key) => ({
      key,
      label: accountGroupLabels[key],
      accounts: (grouped.get(key) ?? []).sort((left, right) => left.name.localeCompare(right.name))
    }))
    .filter((group) => group.accounts.length > 0);
}

export function groupCategories(
  categoryGroups: CategoryGroupEntity[],
  categories: CategoryEntity[]
): CategoryGroupOption[] {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const grouped = categoryGroups
    .map((group) => ({
      id: group.id,
      name: group.name,
      categories: group.categoryIds
        .map((id) => categoryById.get(id))
        .filter((category): category is CategoryEntity => Boolean(category))
    }))
    .filter((group) => group.categories.length > 0);

  const groupedCategoryIds = new Set(
    grouped.flatMap((group) => group.categories.map((item) => item.id))
  );
  const ungrouped = categories.filter((category) => !groupedCategoryIds.has(category.id));

  if (ungrouped.length) {
    grouped.push({
      id: 'other',
      name: 'Other categories',
      categories: ungrouped.sort((left, right) => left.name.localeCompare(right.name))
    });
  }

  return grouped;
}

export function selectedIdSet(filter: IdFilter | undefined): Set<string> {
  return new Set(filter?.mode === 'selected' ? filter.ids : []);
}

export function toggleSelectedId(filter: IdFilter | undefined, id: string): IdFilter {
  const ids = selectedIdSet(filter);
  if (ids.has(id)) ids.delete(id);
  else ids.add(id);
  return { mode: 'selected', ids: [...ids] };
}

export function payeeKey(payee: PayeeRef): string {
  return payee.id ? `id:${payee.id}` : `name:${payee.name}`;
}

export function selectedPayeeSet(filter: PayeeFilter | undefined): Set<string> {
  return new Set(filter?.mode === 'selected' ? filter.payees.map(payeeKey) : []);
}

export function buildPayeeOptions(payees: PayeeEntity[], selected: PayeeFilter | undefined) {
  const current = payees.map<PayeeOption>((payee) => ({
    key: payee.key,
    id: payee.id,
    name: payee.name,
    lastUsedDate: payee.lastUsedDate,
    transactionCount: payee.transactionCount
  }));
  const currentKeys = new Set(current.map((payee) => payee.key));
  const selectedMissing =
    selected?.mode === 'selected'
      ? selected.payees
          .map<PayeeOption>((payee) => ({ ...payee, key: payeeKey(payee), missing: true }))
          .filter((payee) => !currentKeys.has(payee.key))
      : [];

  return [...selectedMissing, ...current];
}
