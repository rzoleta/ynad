export type Milliunits = number;
export type ISODate = string;

export type CurrencyFormat = {
  isoCode: string;
  decimalDigits: number;
  decimalSeparator: string;
  groupSeparator: string;
  currencySymbol: string;
  symbolFirst: boolean;
  displaySymbol: boolean;
};

export type BudgetEntity = {
  id: string;
  name: string;
  currencyFormat: CurrencyFormat;
};

export type AccountClass = 'cash' | 'credit' | 'tracking' | 'loan' | 'other';

export type AccountEntity = {
  id: string;
  name: string;
  type: string;
  accountClass: AccountClass;
  onBudget: boolean;
  closed: boolean;
  balanceMilliunits: Milliunits;
};

export type CategoryGroupEntity = {
  id: string;
  name: string;
  hidden: boolean;
  deleted: boolean;
  categoryIds: string[];
};

export type CategoryEntity = {
  id: string;
  groupId: string;
  name: string;
  hidden: boolean;
  deleted: boolean;
};

export type PayeeEntity = {
  key: string;
  id: string | null;
  name: string;
  lastUsedDate: ISODate;
  transactionCount: number;
};

export type TransactionEntity = {
  id: string;
  date: ISODate;
  amountMilliunits: Milliunits;
  accountId: string;
  categoryId: string | null;
  payeeId: string | null;
  payeeName: string | null;
  transferAccountId: string | null;
};

export type TransactionEntry = {
  id: string;
  transactionId: string;
  subtransactionId: string | null;
  date: ISODate;
  accountId: string;
  amountMilliunits: Milliunits;
  categoryId: string | null;
  payeeId: string | null;
  payeeName: string | null;
  transferAccountId: string | null;
  isTransfer: boolean;
};

export type NormalizedBudgetData = {
  budget: BudgetEntity;
  budgets: BudgetEntity[];
  accounts: AccountEntity[];
  accountById: Map<string, AccountEntity>;
  categoryGroups: CategoryGroupEntity[];
  categories: CategoryEntity[];
  categoryById: Map<string, CategoryEntity>;
  transactions: TransactionEntity[];
  entries: TransactionEntry[];
  payees: PayeeEntity[];
  serverKnowledge: number | null;
  fetchedAt: Date;
};
