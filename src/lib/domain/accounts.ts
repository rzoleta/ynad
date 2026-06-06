import type { ChartType } from '$lib/app/chart-config';
import type { AccountClass, AccountEntity } from './types';

const CASH_TYPES = new Set(['checking', 'savings', 'cash', 'otherAsset']);
const CREDIT_TYPES = new Set(['creditCard', 'lineOfCredit', 'otherLiability']);
const LOAN_TYPES = new Set([
  'mortgage',
  'autoLoan',
  'studentLoan',
  'personalLoan',
  'medicalDebt',
  'otherDebt'
]);

export function getAccountClass(accountType: string): AccountClass {
  if (CASH_TYPES.has(accountType)) return 'cash';
  if (CREDIT_TYPES.has(accountType)) return 'credit';
  if (LOAN_TYPES.has(accountType)) return 'loan';
  if (accountType === 'tracking') return 'tracking';
  return 'other';
}

export function isCashAccount(account: AccountEntity): boolean {
  return account.accountClass === 'cash';
}

export function isTrackingAccount(account: AccountEntity): boolean {
  return account.accountClass === 'tracking';
}

export function isActiveAccount(account: AccountEntity): boolean {
  return !account.closed;
}

export function defaultAccountsForChart(
  type: ChartType,
  accounts: AccountEntity[]
): AccountEntity[] {
  if (type === 'balance') return accounts;

  return accounts.filter((account) => account.onBudget && isCashAccount(account));
}
