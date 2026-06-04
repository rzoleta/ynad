# YNAD Initial Plan

YNAD, short for You Need A Dashboard, is a third-party web app for YNAB users who want richer personal finance charts and configurable dashboards. This document is a one-time snapshot of the initial product and technical decisions for the MVP.

## Product Scope

The MVP focuses on one core loop:

1. Connect to YNAB.
2. Select one active YNAB budget.
3. Create charts from live YNAB data.
4. Arrange those charts on a personal dashboard.

YNAD is read-only against YNAB. It does not create, update, import, categorize, flag, clear, or otherwise mutate YNAB data.

The first-run dashboard is empty. Users start by adding their own charts. Prebuilt starter charts are deferred until after the chart builder is proven.

## Routing

- `/` is the public marketing/login route.
- `/app` is the authenticated dashboard.
- `/app/settings` is the settings route.
- `/privacy` explains local token/config storage and the no-user-database posture.
- `/terms` or `/disclaimer` states that YNAD is independent, third-party, not affiliated with YNAB, and not financial advice.

Authenticated app routes are client-rendered. Public routes can remain SSR or prerender friendly for SEO.

## YNAB Integration

YNAD uses the YNAB API at `https://api.ynab.com/v1`.

The target architecture calls the YNAB API directly from the browser. There should be no SvelteKit server proxy, no remote functions, and no server-side fetch layer for normal YNAB data access.

The first technical spike is validating that YNAB OAuth token exchange and API calls work from browser origins with CORS. If browser-only YNAB access is not technically possible, the fallback is a minimal stateless SvelteKit server route for OAuth/token exchange and/or YNAB API proxying. That fallback still stores no user data and uses no database.

YNAD should load live YNAB data each session. It should not persist YNAB financial data in localStorage or IndexedDB. TanStack Query may hold in-memory session cache.

Data refresh triggers:

- App open
- Budget switch
- OAuth reconnect
- Manual refresh
- Browser focus refetch with stale-time threshold

There is no background polling in MVP. The dashboard includes a manual refresh button and last-updated timestamp.

The YNAB data layer should be designed around `server_knowledge` delta sync, even if the first implementation starts with full budget transaction loads.

## Authentication

YNAD uses YNAB OAuth with Authorization Code + PKCE. There is no user account system, no database, and no backend session in the target architecture.

OAuth decisions:

- OAuth only in the product UI.
- No Personal Access Token entry in the product.
- Public OAuth client ID only.
- No browser-held client secret.
- OAuth `state`, PKCE verifier, and return path are temporarily stored in `sessionStorage`.
- Access/refresh token persistence is browser-local so users stay connected across reloads.
- If tokens expire or are rejected, MVP prompts the user to reconnect rather than implementing complex silent recovery.

The UI should use "Disconnect YNAB" rather than "Log out." Disconnect clears OAuth tokens, selected budget, and in-memory YNAB data, but keeps local dashboard chart configs.

## Privacy And Storage

YNAD does not store user data on a backend.

Local browser storage is used for:

- OAuth tokens
- Selected budget ID
- Dashboard/chart configuration
- App settings such as theme mode and week start

Chart configs are local per browser and per YNAB budget ID. The same user on another browser or device will not automatically see the same dashboard.

There is no import/export for dashboard config in MVP.

Persisted chart/settings data is validated with Zod when read from localStorage. If saved dashboard config fails validation, YNAD ignores it and shows an empty dashboard. There is no explicit localStorage schema versioning or migration layer in MVP.

## Stack

- Full-stack TypeScript web app
- SvelteKit
- Svelte 5
- pnpm
- Tailwind CSS classes for styling
- shadcn-svelte components, installed only as needed
- shadcn-svelte Charts/Recharts for all MVP charts
- Lucide icons
- TanStack Query for Svelte for data fetching
- Zod for validation where needed
- `date-fns` for date math and bucketing
- `mode-watcher` for light/dark/system theme mode
- Figtree via `@fontsource-variable/figtree`
- Vercel deployment

Before implementation, verify current package names and install commands for SvelteKit, Svelte 5, shadcn-svelte, mode-watcher, TanStack Query Svelte, and the selected Svelte-compatible drag-and-drop library.

## Budgets

The MVP supports one active YNAB budget at a time. Budget switching lives in Settings.

Cross-budget dashboards and aggregation are out of scope.

Currency formatting uses the selected YNAB budget's currency format. YNAD does not perform currency conversion.

## Data Model

Use local minimal YNAB API response types for the API shapes the app actually needs. Do not use a generated OpenAPI client or external SDK in MVP.

Normalize YNAB API data into app-specific entities before chart computation. Chart computation should not operate directly on raw API responses.

YNAB amounts are represented internally as integer milliunits. Aggregation, averages, medians, comparisons, and chart calculations should use milliunits. Convert to formatted decimal currency only at display boundaries.

Deleted transactions are excluded from chart calculations. Uncleared transactions are included. Scheduled transactions are excluded unless they have become actual transactions returned by the transactions endpoint. Future-dated actual transactions are included when the selected date range includes those dates.

Split transactions are expanded into subtransactions for category/payee spending calculations. The parent transaction account/date/payee may be used as fallback where the subtransaction lacks those fields.

## Date And Locale Behavior

Date range presets:

- This Month
- This Year
- Last Month
- Last Year
- Last 12 Months
- Custom

Custom date ranges are stored as absolute dates. Presets are stored as preset keys and resolved dynamically at render time.

Date ranges and bucket boundaries use browser-local calendar dates.

Weekly bucket start defaults from browser locale where supported, using `Intl.Locale(...).weekInfo.firstDay`, with fallback behavior when unsupported. Users can override week start in Settings.

## Chart Types

MVP chart types:

- Balance
- Spending
- Income
- Number

Balance, Spending, and Income support visualizations:

- Line
- Bar
- Pie

Pie charts do not use granularity.

Number charts are not visual charts. They display one computed value.

## Shared Chart Configuration

Charts have:

- Required title
- Chart type
- Visualization type where applicable
- Size
- Date range
- Filters depending on chart type

Chart descriptions/subtitles are not included in MVP.

Generated chart titles update automatically while the title is untouched. Once the user edits the title manually, auto-updating stops.

Chart cards show compact generated metadata such as date range, period/granularity, and filter summary.

New visual charts default to Medium size. Number charts default to Small.

Default visualizations:

- Balance: Line
- Spending: Bar
- Income: Bar

Chart colors use shadcn chart CSS variables with deterministic assignment by series key, category, payee, or account ID.

## Filter Model

Account, category, and payee filters use explicit `all` versus `selected` modes rather than preselecting every current ID.

Accounts:

- Account selection groups accounts by YNAB account type/status.
- Quick actions include All Cash, All Tracking, and All Active.
- Closed accounts are available and included where needed for historical accuracy.

Categories:

- Category selection groups categories under YNAB category groups.
- Category groups support group-level select/deselect controls.
- Hidden categories are included.
- Deleted categories are excluded unless they appear in historical transactions for the current budget data.
- Spending charts include an "Uncategorized" pseudo-category by default when category mode is `all`.

Payees:

- Payee options are derived from currently loaded transactions.
- Payee selection is a searchable multi-select sorted by recent usage.
- Selected payees are stored by `payee_id` when available, with `payee_name` fallback for transactions without a payee ID.
- Selected payees must still render even if they are not present in the current option list.

## Balance Charts

Balance charts show running balances for selected accounts over time.

Filters:

- Accounts
- Date range for visual display only
- Granularity for line/bar

Balance charts do not support category filtering in MVP.

For balance calculation, transactions before the visual date range must be included so the first displayed bucket has an accurate balance. The date range controls what is displayed, not which transactions are considered for the running balance baseline.

Default "all accounts" for Balance includes both Cash Accounts and Tracking Accounts, including closed accounts when they have relevant historical transactions. Debt, loan, and credit accounts use signed YNAB balances so liabilities reduce net worth.

Line and bar Balance charts use time buckets on the x-axis and total combined selected-account balance at the end of each bucket on the y-axis.

Balance pie charts show account-balance composition at the selected date range end date.

Tracking account balances rely entirely on YNAB data. YNAD does not fetch brokerage holdings, market prices, or external valuations.

## Spending Charts

Spending charts show net spending for selected filters in the selected date range.

Filters:

- Accounts
- Categories
- Payees
- Date range
- Granularity for line/bar

Default "all accounts" for Spending includes only on-budget Cash Accounts. Tracking Accounts can be selected manually.

Internal transfers between the user's own YNAB accounts are excluded from Spending charts by default. Credit card payments are treated as internal transfers and excluded. The original categorized credit card purchases count as spending.

Spending is displayed as positive values for normal outflow spending.

Categorized inflows such as refunds or reimbursements reduce Spending chart values. Income inflows are excluded from Spending charts.

If categorized inflows exceed outflows, line and bar Spending charts may show negative values. Spending pie charts exclude non-positive slices and should show a compact note/list indicating excluded refund or non-positive values.

Spending pie charts group by category in MVP.

Spending line/bar charts use time buckets on the x-axis and total net spending across selected filters on the y-axis.

## Income Charts

Income charts show inflows for selected filters in the selected date range.

Filters:

- Accounts
- Payees
- Date range
- Granularity for line/bar

Income charts do not use category filtering in MVP. The working assumption is that income inflows are categorized as YNAB inflow.

Income is displayed as positive values.

Income pie charts group by payee in MVP.

Income line/bar charts use time buckets on the x-axis and total income across selected accounts/payees on the y-axis.

## Number Charts

Number charts have a metric domain selector:

- Balance
- Spending
- Income
- Net Income

Supported operations:

- Balance: Current, Average, Median
- Spending: Total, Average, Median
- Income: Total, Average, Median
- Net Income: Total, Average, Median

Average and median Number charts expose a period control because the computation needs a denominator/bucket definition. This is separate from visual chart granularity.

Balance Number charts use Balance-specific date semantics: prior transactions are included to compute accurate balances, then current/average/median is evaluated over the selected range.

Spending, Income, and Net Income Number charts select transactions only inside the selected date range.

If a Number chart has no matching data, it displays `--` with a small "No matching data" label. True zero values still display as `0`.

Comparison deltas such as "vs previous period" are deferred.

## Dashboard

The dashboard uses a 3-column desktop grid with infinite rows.

Chart sizes:

- Small: 1 x 1
- Medium: 2 x 1
- Large: 3 x 1

Desktop supports drag-and-drop reordering in MVP. Drag-and-drop scope is reordering only; chart size determines grid span and cards automatically flow through the 3-column grid. There are no manual coordinates, empty-cell placement, or collision rules.

Mobile renders all charts as a single-column list, regardless of Small/Medium/Large size, preserving order.

Mobile reordering uses explicit move up/down controls rather than drag gestures.

Dashboard management happens in an explicit Edit Dashboard mode. Outside edit mode, chart cards expose only an Edit action. Drag handle, resize, duplicate, and delete are edit-mode-only actions.

Every chart card has a consistent header with title, chart type indicator, edit controls, and edit-mode management controls.

Deleting a chart requires lightweight confirmation.

Duplicating a chart is included in MVP.

If YNAB data cannot be fetched, the dashboard still shows local chart configurations with per-chart error states. It does not replace the whole dashboard with a full-page error.

Charts with no matching data show explicit empty states.

## Chart Builder

Chart creation and editing happen in a sheet launched from the dashboard.

Desktop uses a right-side sheet. Mobile uses a full-screen sheet/dialog with sticky Save/Cancel actions at the bottom.

The builder is a single form with grouped sections, not a multi-step wizard.

Dependent options are shown disabled rather than hidden. For example, granularity is disabled when Pie is selected, and category filters are disabled for Balance charts.

The builder includes a live preview using real YNAB data. Preview queries/calculations should only run after the minimum required fields are valid, with debounce where useful to avoid excessive recomputation/API pressure.

The editor uses explicit Save/Cancel. Live preview updates while editing, but the dashboard chart config changes only after Save.

## UI And Theme

The visual design should be YNAB-inspired but not a pixel clone.

Use shadcn theme configuration. Light and dark themes should both feel aligned with YNAB's visual language. Use `mode-watcher` with `system`, `light`, and `dark` modes. Default mode is `system`.

Use Figtree for UI text via package import.

Use Lucide icons for icon buttons and recognizable actions.

Install shadcn-svelte components only as needed.

## Accessibility

MVP should target keyboard-accessible controls, semantic labels, clear empty states, and clear error states.

Advanced chart accessibility, such as full data tables behind every chart, is deferred.

## Error Handling

YNAB API errors should be normalized into a small set of user-facing states:

- Reconnect required
- Rate limited
- Network unavailable
- Budget unavailable
- Generic fetch error

If YNAB returns rate-limit errors, YNAD should temporarily stop automatic refetching and show a retry-after style message or manual retry. Avoid retry storms.

## Testing

No automated tests are required for MVP. User acceptance testing will be manual.

Chart computation should still be implemented as pure TypeScript functions that accept normalized YNAB data plus chart config and return render-ready chart data. This keeps the financial logic maintainable and testable later if desired.

## Branding

YNAD remains the working project name.

The public product should avoid using YNAB logos, official brand assets, or implying partnership. It may refer to itself as a third-party app for YNAB in text.

The name and branding should be reviewed before public launch due to proximity to YNAB.

## Explicit Non-Goals For MVP

- No backend user database
- No backend storage of YNAB data
- No YNAD user accounts
- No server-side YNAB API calls in the target architecture
- No YNAB data mutation
- No Personal Access Token product flow
- No dashboard config import/export
- No localStorage schema migration/versioning layer
- No automated tests
- No cross-budget dashboards
- No currency conversion
- No assigned/available budget metrics
- No Budget vs Actual chart domain
- No scheduled-transaction forecasting
- No external market data or investment valuation
- No comparison deltas for Number charts
- No chart descriptions/subtitles
- No mobile drag-and-drop gestures
- No manual dashboard coordinates or freeform placement
- No advanced chart accessibility data tables
