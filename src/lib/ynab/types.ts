export type YnabCurrencyFormat = {
  iso_code: string;
  example_format?: string;
  decimal_digits?: number;
  decimal_separator?: string;
  symbol_first?: boolean;
  group_separator?: string;
  currency_symbol?: string;
  display_symbol?: boolean;
};

export type YnabBudget = {
  id: string;
  name: string;
  last_modified_on?: string | null;
  currency_format?: YnabCurrencyFormat;
};

export type YnabAccount = {
  id: string;
  name: string;
  type: string;
  on_budget: boolean;
  closed: boolean;
  deleted: boolean;
  balance: number;
};

export type YnabCategoryGroup = {
  id: string;
  name: string;
  hidden: boolean;
  deleted: boolean;
  categories: YnabCategory[];
};

export type YnabCategory = {
  id: string;
  category_group_id: string;
  name: string;
  hidden: boolean;
  deleted: boolean;
};

export type YnabSubtransaction = {
  id: string;
  transaction_id: string;
  amount: number;
  payee_id: string | null;
  payee_name: string | null;
  category_id: string | null;
  transfer_account_id?: string | null;
  deleted: boolean;
};

export type YnabTransaction = {
  id: string;
  date: string;
  amount: number;
  memo: string | null;
  cleared: string;
  approved: boolean;
  flag_color: string | null;
  account_id: string;
  payee_id: string | null;
  payee_name: string | null;
  category_id: string | null;
  transfer_account_id: string | null;
  deleted: boolean;
  subtransactions?: YnabSubtransaction[];
};

export type YnabBudgetSnapshot = {
  budget: YnabBudget;
  budgets: YnabBudget[];
  accounts: YnabAccount[];
  categoryGroups: YnabCategoryGroup[];
  transactions: YnabTransaction[];
  serverKnowledge: number | null;
};
