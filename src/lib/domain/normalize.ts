import type { YnabAccount, YnabBudget, YnabBudgetSnapshot, YnabCategory } from '$lib/ynab/types';
import { getAccountClass } from './accounts';
import { normalizeCurrencyFormat } from './currency';
import { buildPayees } from './payees';
import { expandTransactionEntries, normalizeTransactions } from './transactions';
import type {
  AccountClass,
  AccountEntity,
  BudgetEntity,
  CategoryEntity,
  CategoryGroupEntity,
  NormalizedBudgetData
} from './types';

export function normalizeBudgetData(snapshot: YnabBudgetSnapshot): NormalizedBudgetData {
  const budget = normalizeBudget(snapshot.budget);
  const budgets = normalizeBudgets(snapshot.budgets, budget);
  const accounts = snapshot.accounts.filter((account) => !account.deleted).map(normalizeAccount);
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const referencedCategoryIds = collectReferencedCategoryIds(snapshot);
  const { categoryGroups, categories } = normalizeCategories(snapshot, referencedCategoryIds);
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const transactions = normalizeTransactions(snapshot.transactions);
  const entries = expandTransactionEntries(snapshot.transactions);
  const payees = buildPayees(entries);

  return {
    budget,
    budgets,
    accounts,
    accountById,
    categoryGroups,
    categories,
    categoryById,
    transactions,
    entries,
    payees,
    serverKnowledge: snapshot.serverKnowledge,
    fetchedAt: new Date()
  };
}

function normalizeBudgets(budgets: YnabBudget[], selectedBudget: BudgetEntity): BudgetEntity[] {
  const budgetById = new Map<string, BudgetEntity>();

  for (const budget of budgets) {
    budgetById.set(budget.id, normalizeBudget(budget));
  }

  budgetById.set(selectedBudget.id, selectedBudget);
  return [...budgetById.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeBudget(budget: YnabBudget): BudgetEntity {
  return {
    id: budget.id,
    name: budget.name,
    currencyFormat: normalizeCurrencyFormat(budget.currency_format)
  };
}

function normalizeAccount(account: YnabAccount): AccountEntity {
  const baseClass = getAccountClass(account.type);
  const accountClass: AccountClass =
    !account.on_budget && (baseClass === 'cash' || baseClass === 'credit') ? 'tracking' : baseClass;

  return {
    id: account.id,
    name: account.name,
    type: account.type,
    accountClass,
    onBudget: account.on_budget,
    closed: account.closed,
    balanceMilliunits: account.balance
  };
}

function normalizeCategories(
  snapshot: YnabBudgetSnapshot,
  referencedCategoryIds: Set<string>
): { categoryGroups: CategoryGroupEntity[]; categories: CategoryEntity[] } {
  const categoryGroups: CategoryGroupEntity[] = [];
  const categories: CategoryEntity[] = [];

  for (const group of snapshot.categoryGroups) {
    const groupCategories = group.categories.filter((category) =>
      shouldKeepCategory(category, referencedCategoryIds)
    );

    if (group.deleted && groupCategories.length === 0) continue;

    categoryGroups.push({
      id: group.id,
      name: group.name,
      hidden: group.hidden,
      deleted: group.deleted,
      categoryIds: groupCategories.map((category) => category.id)
    });

    for (const category of groupCategories) {
      categories.push({
        id: category.id,
        groupId: category.category_group_id,
        name: category.name,
        hidden: category.hidden,
        deleted: category.deleted
      });
    }
  }

  return { categoryGroups, categories };
}

function shouldKeepCategory(category: YnabCategory, referencedCategoryIds: Set<string>): boolean {
  return !category.deleted || referencedCategoryIds.has(category.id);
}

function collectReferencedCategoryIds(snapshot: YnabBudgetSnapshot): Set<string> {
  const ids = new Set<string>();

  for (const transaction of snapshot.transactions) {
    if (transaction.deleted) continue;
    if (transaction.category_id) ids.add(transaction.category_id);

    for (const subtransaction of transaction.subtransactions ?? []) {
      if (subtransaction.deleted) continue;
      if (subtransaction.category_id) ids.add(subtransaction.category_id);
    }
  }

  return ids;
}
