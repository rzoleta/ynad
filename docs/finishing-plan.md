# YNAD Finishing Plan

This document turns the remaining MVP work from `docs/initial-plan.md` into an implementation plan against the current codebase.

## Accepted Deviations

The following current decisions are intentional and should not be "corrected" while finishing the MVP:

- Keep the current browser-only YNAB OAuth/token flow. Do not migrate this plan to Authorization Code + PKCE unless a later decision explicitly asks for it.
- Keep direct browser calls to `https://api.ynab.com/v1`. Do not add a SvelteKit server proxy.
- Keep LayerChart as the chart rendering implementation behind the shadcn-style chart wrapper. Do not swap the charting layer to Recharts.
- Keep the project read-only against YNAB.
- Keep no backend database, no backend user accounts, and no persisted backend YNAB data.
- Keep no automated test requirement for MVP. The financial logic should still be pure and easy to test later.

## Current Codebase Map

Existing modules to build on:

- `src/lib/ynab/auth.ts`: browser-local token storage, selected budget storage helpers, OAuth start/complete helpers.
- `src/lib/ynab/client.ts`: direct YNAB API fetcher, error class, budget/snapshot fetchers.
- `src/lib/ynab/types.ts`: local raw YNAB response types.
- `src/lib/app/chart-config.ts`: chart config Zod schemas and defaults.
- `src/lib/app/dashboard-storage.ts`: per-budget localStorage dashboard config.
- `src/lib/app/settings.ts`: week-start settings schema/storage.
- `src/lib/charts/compute.ts`: current chart calculation entry point.
- `src/lib/charts/chart-renderer.svelte`: current LayerChart renderer.
- `src/routes/app/+page.svelte`: dashboard, editor sheet, chart cards, data query.
- `src/routes/app/settings/+page.svelte`: theme, week start, disconnect.
- `src/routes/+layout.svelte`: TanStack Query provider and theme watcher.

The main finishing work is to split the current large dashboard/chart files into domain, chart, and UI modules, then complete the missing product behavior.

## Phase 1: Domain Model And Normalization

Goal: stop chart computation from operating directly on raw YNAB API responses. Build normalized, app-specific entities that preserve YNAB milliunits and make chart/filter logic explicit.

### Files To Add

```text
src/lib/domain/types.ts
src/lib/domain/normalize.ts
src/lib/domain/dates.ts
src/lib/domain/currency.ts
src/lib/domain/accounts.ts
src/lib/domain/categories.ts
src/lib/domain/payees.ts
src/lib/domain/transactions.ts
```

### Files To Modify

```text
src/lib/ynab/types.ts
src/lib/ynab/client.ts
src/lib/charts/compute.ts
src/lib/utils.ts
```

### Raw YNAB Types To Expand

Keep raw API types in `src/lib/ynab/types.ts`. These should match only the response shapes the app uses.

```ts
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
```

### Normalized Domain Types

Define these in `src/lib/domain/types.ts`.

```ts
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
```

### Normalization Rules

Implement in `src/lib/domain/normalize.ts`.

- Exclude deleted accounts from `accounts`.
- Keep hidden categories, but mark them as hidden.
- Keep deleted categories only if a loaded transaction or subtransaction references them. This preserves historical chart labels.
- Exclude deleted transactions and deleted subtransactions.
- Expand split transactions into `TransactionEntry` rows.
- Use the parent transaction date/account as the subtransaction date/account.
- Use subtransaction category/payee when present; otherwise fall back to parent category/payee.
- Mark an entry as transfer when either the parent transaction or subtransaction has a transfer account id.
- Preserve all amounts as integer milliunits.
- Build payee options from entries, sorted by most recent usage, then name.
- Use a stable payee key: `id:${payeeId}` when an id exists, otherwise `name:${payeeName}`.

### Account Classification Rules

Implement in `src/lib/domain/accounts.ts`.

```ts
export function getAccountClass(accountType: string): AccountClass;
export function isCashAccount(account: AccountEntity): boolean;
export function isTrackingAccount(account: AccountEntity): boolean;
export function isActiveAccount(account: AccountEntity): boolean;
export function defaultAccountsForChart(
  type: ChartType,
  accounts: AccountEntity[]
): AccountEntity[];
```

Initial classification:

- `checking`, `savings`, `cash`, `otherAsset` with `onBudget: true` -> `cash`.
- `creditCard`, `lineOfCredit`, `otherLiability` -> `credit`.
- `mortgage`, `autoLoan`, `studentLoan`, `personalLoan`, `medicalDebt`, `otherDebt` -> `loan`.
- `tracking` or off-budget asset/liability accounts -> `tracking`.
- Unknown types -> `other`.

Chart defaults:

- Balance `all`: all non-deleted accounts, including closed accounts.
- Spending `all`: on-budget cash accounts by default. Tracking accounts can be included only through selected account filters.
- Income `all`: on-budget cash accounts by default unless selected account filters override.

### Date Utilities

Move date work into `src/lib/domain/dates.ts`.

```ts
export type DatePreset =
  | 'this-month'
  | 'this-year'
  | 'last-month'
  | 'last-year'
  | 'last-12-months'
  | 'custom';

export type ResolvedDateRange = {
  from: ISODate;
  to: ISODate;
};

export type TimeBucket = {
  id: string;
  label: string;
  from: ISODate;
  to: ISODate;
};

export function resolveDateRange(config: ChartConfig['dateRange'], today?: Date): ResolvedDateRange;

export function makeTimeBuckets(
  range: ResolvedDateRange,
  granularity: NonNullable<ChartConfig['granularity']>,
  weekStart: WeekStart
): TimeBucket[];

export function compareIsoDate(left: ISODate, right: ISODate): number;
export function isIsoDateInRange(date: ISODate, range: ResolvedDateRange): boolean;
```

Important implementation detail: do not use `toISOString().slice(0, 10)` for browser-local calendar dates. Use local date construction/formatting so Asia/Manila, US time zones, and DST boundaries do not shift chart buckets.

Weekly buckets must honor `weekStart`.

### Currency Utilities

Move currency formatting into `src/lib/domain/currency.ts`.

```ts
export function normalizeCurrencyFormat(input?: YnabCurrencyFormat): CurrencyFormat;
export function formatMilliunits(value: Milliunits, currency: CurrencyFormat): string;
```

Then update `src/lib/utils.ts` to stop hard-coding USD, or leave only generic UI helpers there and import currency formatting from the domain module.

## Phase 2: YNAB Data Fetching, App State, And Errors

Goal: complete live data loading behavior while keeping the browser-only architecture and accepted OAuth deviation.

### Files To Add

```text
src/lib/ynab/errors.ts
src/lib/ynab/snapshot.ts
src/lib/app/app-state.ts
```

### Files To Modify

```text
src/lib/ynab/client.ts
src/routes/+layout.svelte
src/routes/app/+page.svelte
src/routes/app/settings/+page.svelte
```

### Error Types

Move reusable error code definitions to `src/lib/ynab/errors.ts`.

```ts
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
  });
}

export function getYnabErrorCode(error: unknown): YnabErrorCode;
export function getYnabErrorMessage(error: unknown): string;
```

Client behavior:

- 401/403 -> `reconnect-required`.
- 404 -> `budget-unavailable`.
- 429 -> `rate-limited`, with `Retry-After` parsed when present.
- failed browser fetch -> `network-unavailable`.
- other non-2xx -> `fetch-error`.

### Snapshot Fetching

Keep direct browser API calls in `src/lib/ynab/client.ts`, but move composition logic to `src/lib/ynab/snapshot.ts`.

```ts
export type YnabRawSnapshot = {
  budget: YnabBudget;
  budgets: YnabBudget[];
  accounts: YnabAccount[];
  categoryGroups: YnabCategoryGroup[];
  transactions: YnabTransaction[];
  serverKnowledge: number | null;
};

export async function fetchRawBudgetSnapshot(
  token: string,
  budgetId: string
): Promise<YnabRawSnapshot>;
```

Fetch:

- `/budgets` for the available budgets list.
- `/budgets/{budgetId}` for selected budget metadata.
- `/budgets/{budgetId}/accounts`.
- `/budgets/{budgetId}/categories`.
- `/budgets/{budgetId}/transactions`.

Then normalize:

```ts
export async function fetchNormalizedBudgetSnapshot(
  token: string,
  budgetId: string
): Promise<NormalizedBudgetData>;
```

`serverKnowledge` remains captured for a later delta-sync implementation. Do not build delta sync in MVP unless the full transaction fetch becomes too slow.

### Query Behavior

Update the TanStack Query setup:

- Keep `staleTime: 5 minutes`.
- Keep `refetchOnWindowFocus: true`.
- Set retry behavior so rate limits do not retry automatically.
- When a query returns `rate-limited`, pause focus refetch until either the retry-after expires or the user presses manual refresh.
- Expose last successful `fetchedAt` from the normalized snapshot for the dashboard timestamp.

Per-query options in `/app` should be responsible for rate-limit handling instead of relying only on global defaults.

### Token Expiration Handling

Keep the current browser token model. Add lightweight expiration handling:

- If `expiresAt` exists and is in the past, treat the token as expired.
- Show a reconnect-required state.
- Do not attempt silent refresh unless a later decision adds refresh-token support to the accepted OAuth flow.

## Phase 3: Budget Selection And Settings

Goal: finish the one-active-budget MVP workflow from the initial plan.

If the hard-coded `default` budget endpoint is kept as a product decision, this phase can be skipped. Otherwise, implement this phase.

### Files To Add

```text
src/lib/app/budget-selection.ts
src/lib/components/settings/budget-selector.svelte
```

### Files To Modify

```text
src/lib/ynab/auth.ts
src/routes/app/+page.svelte
src/routes/app/settings/+page.svelte
```

### Budget Selection Storage

Reuse the existing `ynad.selected-budget` key in `src/lib/ynab/auth.ts`, or move it into `src/lib/app/budget-selection.ts` and re-export compatibility helpers.

```ts
export function readSelectedBudgetId(): string | null;
export function writeSelectedBudgetId(budgetId: string): void;
export function clearSelectedBudgetId(): void;
export function getInitialBudgetId(budgets: BudgetEntity[]): string | null;
```

Selection rules:

- If a valid stored budget ID exists in the fetched budget list, use it.
- Otherwise use YNAB's `default` endpoint once to get the default budget id, then persist that actual id.
- If the selected budget is unavailable, show `budget-unavailable` and ask the user to choose another budget in Settings.

### Settings UI

`budget-selector.svelte`:

- Receives `budgets`, `selectedBudgetId`, loading/error state.
- Renders a select with budget names.
- On change:
  - persist selected budget id,
  - clear in-memory query data for the previous budget,
  - navigate back to `/app` or refetch the current route.

Dashboard configs remain per budget ID through `dashboard-storage.ts`.

## Phase 4: Chart Config Schema And Storage

Goal: preserve the existing localStorage model but make every MVP chart setting expressible and valid.

### Files To Modify

```text
src/lib/app/chart-config.ts
src/lib/app/dashboard-storage.ts
```

### Chart Config Schema

Keep the existing no-migration MVP posture. Changing the schema can invalidate old local configs; that is acceptable for MVP if invalid configs fall back to an empty dashboard.

Use this final shape in `chart-config.ts`, mostly matching the existing file:

```ts
export const chartTypeSchema = z.enum(['balance', 'spending', 'income', 'number']);
export const visualizationSchema = z.enum(['line', 'bar', 'pie']);
export const chartSizeSchema = z.enum(['small', 'medium', 'large']);
export const granularitySchema = z.enum(['daily', 'weekly', 'monthly', 'yearly']);

export const datePresetSchema = z.enum([
  'this-month',
  'this-year',
  'last-month',
  'last-year',
  'last-12-months',
  'custom'
]);

export const dateRangeSchema = z.discriminatedUnion('preset', [
  z.object({ preset: datePresetSchema.exclude(['custom']) }),
  z.object({
    preset: z.literal('custom'),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  })
]);

export const idFilterSchema = z.union([
  z.object({ mode: z.literal('all') }),
  z.object({ mode: z.literal('selected'), ids: z.array(z.string()) })
]);

export const payeeRefSchema = z.object({
  id: z.string().nullable(),
  name: z.string().min(1)
});

export const payeeFilterSchema = z.union([
  z.object({ mode: z.literal('all') }),
  z.object({ mode: z.literal('selected'), payees: z.array(payeeRefSchema) })
]);

export const numberMetricSchema = z.enum(['balance', 'spending', 'income', 'net-income']);

export const numberOperationSchema = z.enum(['current', 'total', 'average', 'median']);

export const chartConfigSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  titleEdited: z.boolean().default(false),
  type: chartTypeSchema,
  size: chartSizeSchema,
  visualization: visualizationSchema.optional(),
  dateRange: dateRangeSchema,
  granularity: granularitySchema.optional(),
  accounts: idFilterSchema,
  categories: idFilterSchema.optional(),
  payees: payeeFilterSchema.optional(),
  numberMetric: numberMetricSchema.optional(),
  numberOperation: numberOperationSchema.optional(),
  numberPeriod: granularitySchema.optional()
});
```

### Chart Config Helpers

Add helpers:

```ts
export function createDefaultChart(type: ChartType): ChartConfig;
export function normalizeChartForType(chart: ChartConfig): ChartConfig;
export function getGeneratedTitle(chart: ChartConfig): string;
export function maybeUpdateGeneratedTitle(chart: ChartConfig): ChartConfig;
export function getChartMetadata(chart: ChartConfig, data?: NormalizedBudgetData): string;
export function isChartPreviewable(chart: ChartConfig): boolean;
```

Behavior:

- New visual charts default to medium.
- New number charts default to small.
- Balance defaults to line.
- Spending and income default to bar.
- Number defaults to Spending/Total/Monthly.
- When `type` changes in the builder, normalize incompatible fields:
  - `number` clears `visualization` and visual `granularity`.
  - non-number charts clear number fields.
  - `balance` clears category/payee filters.
  - `income` clears category filters.
  - `spending` ensures category and payee filters exist.
- Generated titles continue to update while `titleEdited === false`.
- Once title input changes, set `titleEdited = true`.

## Phase 5: Chart Builder UI

Goal: replace the current single large inline editor with a complete grouped builder sheet using real normalized YNAB options and live preview.

### Files To Add

```text
src/lib/components/chart-builder/chart-builder-sheet.svelte
src/lib/components/chart-builder/chart-preview.svelte
src/lib/components/chart-builder/title-field.svelte
src/lib/components/chart-builder/chart-type-control.svelte
src/lib/components/chart-builder/chart-size-control.svelte
src/lib/components/chart-builder/date-range-control.svelte
src/lib/components/chart-builder/visualization-control.svelte
src/lib/components/chart-builder/granularity-control.svelte
src/lib/components/chart-builder/account-filter-control.svelte
src/lib/components/chart-builder/category-filter-control.svelte
src/lib/components/chart-builder/payee-filter-control.svelte
src/lib/components/chart-builder/number-metric-controls.svelte
src/lib/components/chart-builder/filter-summary.ts
```

### Files To Modify

```text
src/routes/app/+page.svelte
src/lib/app/chart-config.ts
src/lib/charts/chart-renderer.svelte
```

### Builder Structure

`chart-builder-sheet.svelte` props:

```ts
type Props = {
  open: boolean;
  chart: ChartConfig | null;
  data: NormalizedBudgetData | null;
  weekStart: WeekStart;
  onSave: (chart: ChartConfig) => void;
  onCancel: () => void;
};
```

Sections:

- Basics: title, type, size.
- Date: preset select, custom from/to inputs when `custom`.
- Visualization: line/bar/pie for visual charts; disabled for number charts.
- Period: granularity for line/bar; disabled for pie and number charts.
- Accounts: all/selected, grouped by cash/tracking/credit/loan/closed.
- Categories: spending only; disabled for non-spending; grouped by category group; includes Uncategorized pseudo-category.
- Payees: spending and income only; searchable list sorted by recent usage.
- Number: metric, operation, period where applicable.
- Preview: live render from current chart draft and current YNAB data.

Desktop:

- Right-side sheet.
- Form and preview in two columns when width allows.

Mobile:

- Full-screen sheet/dialog.
- Sticky Save/Cancel actions at the bottom.

### Account Filter Control

`account-filter-control.svelte`:

- `All accounts` vs `Selected accounts`.
- Group accounts by:
  - Cash accounts
  - Credit accounts
  - Tracking accounts
  - Loan/debt accounts
  - Closed accounts
- Quick actions:
  - All Cash
  - All Tracking
  - All Active
- Closed accounts remain selectable.

### Category Filter Control

`category-filter-control.svelte`:

- `All categories` vs `Selected categories`.
- Group by YNAB category groups.
- Include hidden categories.
- Exclude deleted categories unless historical transactions reference them.
- Include `Uncategorized` pseudo-category by default when mode is `all`.
- Group-level select/deselect controls.

### Payee Filter Control

`payee-filter-control.svelte`:

- `All payees` vs `Selected payees`.
- Search by payee name.
- Sort by recent usage, then name.
- Store selected payees by `{ id, name }`.
- Keep selected payees visible even if not present in the current option list.

### Live Preview Rules

- Preview only runs when required fields are valid.
- No network requests should happen from preview controls; preview uses the already loaded normalized snapshot.
- Debounce only expensive chart computation if needed. Prefer pure derived computation first.
- Dashboard config is not persisted until Save.
- Cancel discards the draft.

## Phase 6: Chart Computation Accuracy

Goal: make chart math match the initial plan while retaining the current chart library.

### Files To Add

```text
src/lib/charts/types.ts
src/lib/charts/balance.ts
src/lib/charts/spending.ts
src/lib/charts/income.ts
src/lib/charts/number.ts
src/lib/charts/net-income.ts
```

### Files To Modify

```text
src/lib/charts/compute.ts
src/lib/charts/chart-renderer.svelte
```

### Render-Ready Result Types

Define in `src/lib/charts/types.ts`.

```ts
export type ChartEmptyResult = {
  status: 'empty';
  message: string;
};

export type ChartErrorResult = {
  status: 'error';
  message: string;
};

export type TimeSeriesPoint = {
  bucketId: string;
  label: string;
  from: ISODate;
  to: ISODate;
  valueMilliunits: Milliunits;
};

export type PieSlicePoint = {
  key: string;
  label: string;
  valueMilliunits: Milliunits;
};

export type ChartSeriesResult = {
  status: 'series';
  visualization: 'line' | 'bar' | 'pie';
  points: TimeSeriesPoint[] | PieSlicePoint[];
  excluded?: Array<{
    key: string;
    label: string;
    valueMilliunits: Milliunits;
    reason: 'non-positive-pie-slice';
  }>;
};

export type ChartNumberResult = {
  status: 'number';
  valueMilliunits: Milliunits;
  label: string;
};

export type ChartResult =
  | ChartEmptyResult
  | ChartErrorResult
  | ChartSeriesResult
  | ChartNumberResult;
```

### Balance Charts

Implement in `src/lib/charts/balance.ts`.

Rules:

- Account filter only.
- Date range controls visual display, not transaction inclusion.
- Transactions before the visual range must be included for the first bucket baseline.
- Line/bar values are combined selected-account balance at the end of each bucket.
- Pie values are selected-account balance composition at the selected date range end.
- Use signed YNAB balances. Liabilities reduce net worth.
- Include closed accounts when selected or when `all` and historically relevant.

Implementation approach:

- Build a starting balance for each account from current account balance minus loaded transactions after the target date when needed.
- For each bucket end date, compute account balance as of that date.
- For line/bar, sum selected account balances per bucket.
- For pie, emit one slice per account with non-zero value as of range end.

### Spending Charts

Implement in `src/lib/charts/spending.ts`.

Rules:

- Filters: accounts, categories, payees, date range, granularity.
- Default `all` accounts means on-budget cash accounts.
- Internal transfers and credit card payments are excluded.
- Normal outflows display as positive spending.
- Categorized inflows such as refunds/reimbursements reduce spending.
- Income inflows are excluded.
- Line/bar can show negative values.
- Pie groups by category and excludes non-positive slices with a compact note/list.
- Uncategorized is included by default when category mode is `all`.

Implementation details:

- Work from normalized `TransactionEntry[]`.
- Exclude entries with `isTransfer`.
- Apply account filters first.
- For spending:
  - include negative amounts with a spending category or uncategorized category,
  - include positive categorized entries only when they are refunds/reimbursements against spending categories,
  - exclude positive income inflows. MVP can identify income as YNAB inflow category or uncategorized positive inflow with no spending category.
- Map amounts as `-amountMilliunits` so outflows are positive.
- For category labels, use category name from `categoryById`; fallback to `Uncategorized`.

### Income Charts

Implement in `src/lib/charts/income.ts`.

Rules:

- Filters: accounts, payees, date range, granularity.
- No category filter.
- Exclude transfers.
- Include positive inflows that represent income.
- Display income as positive.
- Pie groups by payee.
- Line/bar totals income per time bucket.

Implementation details:

- Apply account and payee filters.
- Use payee name fallback `Income`.
- Use selected budget currency only at render/display boundaries.

### Number Charts

Implement in `src/lib/charts/number.ts` and `src/lib/charts/net-income.ts`.

Metric domains:

- Balance
- Spending
- Income
- Net Income

Operations:

- Balance: Current, Average, Median
- Spending: Total, Average, Median
- Income: Total, Average, Median
- Net Income: Total, Average, Median

Rules:

- Average and median use `numberPeriod` as bucket denominator.
- Balance numbers use balance date semantics.
- Spending/income/net-income numbers select transactions only inside the date range.
- If no matching data, display `--` with `No matching data`.
- True zero displays as `0`.
- No comparison deltas in MVP.

### Deterministic Colors

Keep chart CSS variables, but assign by stable series key rather than by array index.

Add to `src/lib/charts/types.ts` or `chart-renderer.svelte`:

```ts
export function chartColorForKey(key: string): string;
```

Use stable keys:

- Account id for balance pie.
- Category id or `uncategorized` for spending pie.
- Payee key for income pie.
- Chart id or metric key for line/bar.

## Phase 7: Dashboard And Chart Card UX

Goal: finish dashboard behavior around local configs, edit mode, per-chart errors, metadata, and responsive controls.

### Files To Add

```text
src/lib/components/dashboard/dashboard-toolbar.svelte
src/lib/components/dashboard/chart-card.svelte
src/lib/components/dashboard/empty-dashboard.svelte
src/lib/components/dashboard/ynab-connect-panel.svelte
src/lib/components/dashboard/ynab-error-banner.svelte
```

### Files To Modify

```text
src/routes/app/+page.svelte
src/lib/charts/chart-renderer.svelte
src/lib/app/dashboard-storage.ts
```

### Dashboard Behavior

- First-run dashboard is empty.
- Dashboard grid is 3 columns on desktop with infinite rows.
- Small: 1 column.
- Medium: 2 columns.
- Large: 3 columns.
- Mobile renders all cards as one column, preserving order.
- Desktop edit mode:
  - drag handle visible,
  - drag reorder enabled,
  - duplicate/delete/resize controls visible.
- Mobile edit mode:
  - no drag gestures,
  - move up/down controls visible.
- Outside edit mode:
  - chart card exposes only Edit.
- Delete uses lightweight confirmation.
- Duplicate creates a new id and copies config.
- If YNAB fetch fails, keep rendering local chart cards with per-card error states.
- If a chart has no matching data, show explicit empty state.

### Chart Card Header

`chart-card.svelte` props:

```ts
type Props = {
  chart: ChartConfig;
  result: ChartResult;
  data: NormalizedBudgetData | null;
  editMode: boolean;
  index: number;
  onEdit: (chart: ChartConfig) => void;
  onDuplicate: (chart: ChartConfig) => void;
  onDelete: (chart: ChartConfig) => void;
  onMove: (from: number, to: number) => void;
  onDragStart: (index: number) => void;
  onDrop: (index: number) => void;
};
```

Header content:

- title,
- chart type indicator,
- generated metadata,
- edit controls.

Metadata should include:

- date range,
- granularity or number period,
- visualization or number operation,
- account/category/payee filter summary.

## Phase 8: Error States And Accessibility

Goal: make failure modes clear and avoid full-page failures when only YNAB data fetches fail.

### Files To Modify

```text
src/lib/ynab/errors.ts
src/routes/app/+page.svelte
src/lib/components/dashboard/ynab-error-banner.svelte
src/lib/charts/chart-renderer.svelte
```

### User-Facing Error States

Map YNAB errors to UI:

- `reconnect-required`: show reconnect CTA and keep local charts visible.
- `rate-limited`: show retry-after/manual retry message; disable automatic refetch temporarily.
- `network-unavailable`: show manual retry.
- `budget-unavailable`: route user to Settings to choose another budget.
- `fetch-error`: generic fetch error with manual retry.

### Accessibility Work

- Every icon-only button needs a visible `title` and accessible label.
- Replace text arrows for mobile move buttons with Lucide icons if available.
- Sheet/dialog should trap focus or use an accessible dialog primitive if already available from Bits UI/shadcn-svelte.
- Inputs need semantic labels.
- Error and empty states should be announced through normal text, not only color.
- Drag-and-drop should not be the only reorder path.
- Chart preview should have a useful `aria-label` or text fallback for empty/error states.

## Phase 9: Privacy, Static Pages, And Copy

Goal: align copy with the finished behavior while preserving accepted deviations.

### Files To Modify

```text
src/routes/+page.svelte
src/routes/privacy/+page.svelte
src/routes/terms/+page.svelte
README.md
```

### Copy Updates

- Keep clear third-party YNAB positioning.
- Avoid YNAB logos or official brand assets.
- State that YNAD is read-only.
- State that OAuth tokens, selected budget id, settings, and dashboard config are browser-local.
- State that YNAB financial data is fetched live and held in memory only.
- If the accepted OAuth deviation remains implicit-token based, avoid promising refresh-token persistence in copy.
- Keep "Disconnect YNAB" language instead of "Log out".

## Final File Structure

The finished MVP should roughly have this structure:

```text
src/lib/app/
  app-state.ts
  budget-selection.ts
  chart-config.ts
  dashboard-storage.ts
  settings.ts

src/lib/domain/
  accounts.ts
  categories.ts
  currency.ts
  dates.ts
  normalize.ts
  payees.ts
  transactions.ts
  types.ts

src/lib/ynab/
  auth.ts
  client.ts
  errors.ts
  snapshot.ts
  types.ts

src/lib/charts/
  balance.ts
  chart-renderer.svelte
  compute.ts
  income.ts
  net-income.ts
  number.ts
  spending.ts
  types.ts

src/lib/components/chart-builder/
  account-filter-control.svelte
  category-filter-control.svelte
  chart-builder-sheet.svelte
  chart-preview.svelte
  chart-size-control.svelte
  chart-type-control.svelte
  date-range-control.svelte
  filter-summary.ts
  granularity-control.svelte
  number-metric-controls.svelte
  payee-filter-control.svelte
  title-field.svelte
  visualization-control.svelte

src/lib/components/dashboard/
  chart-card.svelte
  dashboard-toolbar.svelte
  empty-dashboard.svelte
  ynab-connect-panel.svelte
  ynab-error-banner.svelte

src/lib/components/settings/
  budget-selector.svelte
```

Do not create all components blindly if the code stays simpler without them. This structure is the target ownership map; small controls can remain inline until they become hard to reason about.

## Step-By-Step Implementation Order

1. Add `src/lib/domain/types.ts`.
   - Define `Milliunits`, `ISODate`, `CurrencyFormat`, normalized budget/account/category/payee/transaction types, and `NormalizedBudgetData`.

2. Expand `src/lib/ynab/types.ts`.
   - Add complete currency format fields.
   - Add optional raw fields needed for normalization.
   - Keep types local and minimal.

3. Add `src/lib/domain/currency.ts`.
   - Implement `normalizeCurrencyFormat`.
   - Implement `formatMilliunits`.
   - Update current display code to pass the selected budget currency format instead of defaulting to USD.

4. Add `src/lib/domain/dates.ts`.
   - Move `resolveDateRange` and bucket generation out of `compute.ts`.
   - Rework date math to use browser-local dates.
   - Implement weekly bucket start support.

5. Add `src/lib/domain/accounts.ts`, `categories.ts`, `payees.ts`, and `transactions.ts`.
   - Implement account classification.
   - Implement category retention rules.
   - Implement split transaction entry expansion.
   - Implement recent-usage payee derivation.

6. Add `src/lib/domain/normalize.ts`.
   - Convert raw YNAB snapshot data into `NormalizedBudgetData`.
   - Keep deleted transaction exclusion and split expansion here.

7. Add `src/lib/ynab/errors.ts`.
   - Move `YnabErrorCode` and `YnabClientError` out of `client.ts`.
   - Add `retryAfterSeconds`.
   - Add helper functions for user-facing error code/message extraction.

8. Add `src/lib/ynab/snapshot.ts`.
   - Compose the raw snapshot fetch.
   - Normalize it before returning data to the app.
   - Keep `serverKnowledge` captured but do not implement delta sync yet.

9. Update `src/routes/+layout.svelte` query defaults.
   - Keep stale-time and focus refetch.
   - Avoid retrying rate-limit failures.

10. Update `src/routes/app/+page.svelte` to consume `NormalizedBudgetData`.
    - Query `fetchNormalizedBudgetSnapshot`.
    - Use `data.fetchedAt` for last-updated.
    - Keep local charts visible on query error.

11. Implement budget selection if the `default` endpoint is not an accepted product shortcut.
    - Add `src/lib/app/budget-selection.ts`.
    - Add `src/lib/components/settings/budget-selector.svelte`.
    - Update Settings to switch selected budget.
    - Ensure dashboard storage keys use the selected budget id.

12. Refine `src/lib/app/chart-config.ts`.
    - Finalize Zod schemas.
    - Add `normalizeChartForType`.
    - Add generated-title helpers.
    - Add richer metadata/filter summary hooks.

13. Add `src/lib/charts/types.ts`.
    - Define final render-ready result types.
    - Add stable chart color key helper.

14. Split chart math into domain-specific files.
    - Add `balance.ts`.
    - Add `spending.ts`.
    - Add `income.ts`.
    - Add `net-income.ts`.
    - Add `number.ts`.
    - Keep `compute.ts` as the orchestrator.

15. Implement balance chart semantics.
    - Accurate historical baseline.
    - Line/bar bucket-end combined balance.
    - Pie account composition at range end.

16. Implement spending chart semantics.
    - Correct default account selection.
    - Exclude transfers.
    - Include refunds/reimbursements as spending reducers.
    - Exclude income.
    - Category pie with non-positive exclusion notes.

17. Implement income chart semantics.
    - Positive inflows only.
    - Exclude transfers.
    - Payee pie grouping.

18. Implement number chart semantics.
    - Balance current/average/median.
    - Spending/income/net-income total/average/median.
    - Use number period for average/median.
    - Preserve true zero display.

19. Update `src/lib/charts/chart-renderer.svelte`.
    - Use `valueMilliunits`.
    - Use selected budget currency formatting.
    - Use deterministic series/slice colors.
    - Render excluded pie-slice notes.

20. Extract dashboard components.
    - Add toolbar, chart card, empty dashboard, connect panel, error banner components.
    - Keep route file focused on state/query orchestration.

21. Add chart builder components.
    - Start with `chart-builder-sheet.svelte`.
    - Extract controls as the form grows.
    - Wire Save/Cancel draft behavior.
    - Use normalized options for accounts/categories/payees.

22. Finish date-range UI.
    - Add Custom option.
    - Show absolute `from` and `to` inputs only for custom.
    - Validate `from <= to` before Save.

23. Finish filter UI.
    - Add account all/selected mode and quick actions.
    - Add grouped category selector with Uncategorized.
    - Add searchable payee selector.
    - Ensure selected payees render even when absent from current loaded options.

24. Finish number chart UI.
    - Add metric selector.
    - Add operation selector constrained by metric.
    - Add period control for average/median.

25. Finish edit mode controls.
    - Desktop drag reorder.
    - Mobile move up/down.
    - Duplicate/delete/resize only in edit mode.
    - Edit action outside edit mode.

26. Finish error-state UI.
    - Reconnect required.
    - Rate limited with retry-after/manual retry.
    - Network unavailable.
    - Budget unavailable.
    - Generic fetch error.

27. Update privacy/terms/README copy.
    - Reflect browser-local storage and accepted OAuth behavior.
    - Keep third-party and no-financial-advice language.

28. Run verification.
    - `pnpm check`
    - `pnpm lint`
    - `pnpm build`
    - Manual browser pass:
      - disconnected state,
      - OAuth callback happy path,
      - dashboard empty state,
      - add/edit/cancel/save chart,
      - each chart type,
      - custom date range,
      - account/category/payee filters,
      - number metrics,
      - duplicate/delete/reorder,
      - settings week start,
      - budget switch if implemented,
      - query error states.
