import type { YnabTransaction } from '$lib/ynab/types';
import type { TransactionEntity, TransactionEntry } from './types';

export function normalizeTransactions(transactions: YnabTransaction[]): TransactionEntity[] {
  return transactions.filter(isLoadedTransaction).map((transaction) => ({
    id: transaction.id,
    date: transaction.date,
    amountMilliunits: transaction.amount,
    accountId: transaction.account_id,
    categoryId: transaction.category_id,
    payeeId: transaction.payee_id,
    payeeName: transaction.payee_name,
    transferAccountId: transaction.transfer_account_id
  }));
}

export function expandTransactionEntries(transactions: YnabTransaction[]): TransactionEntry[] {
  return transactions.filter(isLoadedTransaction).flatMap((transaction): TransactionEntry[] => {
    if (transaction.subtransactions?.length) {
      return transaction.subtransactions
        .filter((subtransaction) => !subtransaction.deleted)
        .map((subtransaction) => ({
          id: `${transaction.id}:${subtransaction.id}`,
          transactionId: transaction.id,
          subtransactionId: subtransaction.id,
          date: transaction.date,
          accountId: transaction.account_id,
          amountMilliunits: subtransaction.amount,
          categoryId: subtransaction.category_id ?? transaction.category_id,
          payeeId: subtransaction.payee_id ?? transaction.payee_id,
          payeeName: subtransaction.payee_name ?? transaction.payee_name,
          transferAccountId:
            subtransaction.transfer_account_id ?? transaction.transfer_account_id ?? null,
          isTransfer: Boolean(subtransaction.transfer_account_id ?? transaction.transfer_account_id)
        }));
    }

    return [
      {
        id: transaction.id,
        transactionId: transaction.id,
        subtransactionId: null,
        date: transaction.date,
        accountId: transaction.account_id,
        amountMilliunits: transaction.amount,
        categoryId: transaction.category_id,
        payeeId: transaction.payee_id,
        payeeName: transaction.payee_name,
        transferAccountId: transaction.transfer_account_id,
        isTransfer: Boolean(transaction.transfer_account_id)
      }
    ];
  });
}

function isLoadedTransaction(transaction: YnabTransaction) {
  return !transaction.deleted;
}
