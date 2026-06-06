import type { YnabCurrencyFormat } from '$lib/ynab/types';
import type { CurrencyFormat, Milliunits } from './types';

export function normalizeCurrencyFormat(input?: YnabCurrencyFormat): CurrencyFormat {
  return {
    isoCode: input?.iso_code ?? 'USD',
    decimalDigits: input?.decimal_digits ?? 2,
    decimalSeparator: input?.decimal_separator ?? '.',
    groupSeparator: input?.group_separator ?? ',',
    currencySymbol: input?.currency_symbol ?? '$',
    symbolFirst: input?.symbol_first ?? true,
    displaySymbol: input?.display_symbol ?? true
  };
}

export function formatMilliunits(value: Milliunits, currency: CurrencyFormat): string {
  const sign = value < 0 ? '-' : '';
  const amount = Math.abs(value) / 1000;
  const [integerPart = '0', fractionPart] = amount.toFixed(currency.decimalDigits).split('.');
  const integer = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, () => currency.groupSeparator);
  const number = fractionPart ? `${integer}${currency.decimalSeparator}${fractionPart}` : integer;

  if (!currency.displaySymbol) return `${sign}${number}`;

  return currency.symbolFirst
    ? `${sign}${currency.currencySymbol}${number}`
    : `${sign}${number}${currency.currencySymbol}`;
}
