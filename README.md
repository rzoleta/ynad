# YNAD

You Need A Dashboard is a browser-local dashboard builder for YNAB users.

YNAD is an independent third-party app. It is not affiliated with, endorsed by, or sponsored by
YNAB.

## Product Behavior

- YNAD requests read-only YNAB API access.
- It fetches YNAB financial data live and keeps that data in memory through the current app session.
- It stores the OAuth access token, selected budget ID, settings, and dashboard chart configuration
  in the browser.
- It does not run a backend database, create YNAD user accounts, or persist YNAB budget data on a
  YNAD server.
- The current OAuth flow stores an expiring browser-local access token. When the token expires, use
  Reconnect YNAB.
- Use Disconnect YNAB to remove the browser-local YNAB connection for the current browser.

## Development

Install dependencies:

```sh
pnpm install
```

Create a YNAB OAuth app and set the public client ID:

```sh
cp .env.example .env
```

Then edit `.env`:

```sh
PUBLIC_YNAB_CLIENT_ID="your-client-id"
```

Start the dev server:

```sh
pnpm dev
```

Run project checks:

```sh
pnpm check
pnpm lint
```

Build the app:

```sh
pnpm build
```

## Manual Verification

1. Connect YNAB from the landing page and confirm `/app` loads.
2. Add spending, income, balance, and number charts.
3. Edit chart filters, date ranges, visualization, size, and title, then save.
4. Toggle edit mode and verify duplicate, delete, resize, drag reorder on desktop, and move up/down
   on mobile.
5. Visit Settings, change week start, switch budget, reconnect, and use Disconnect YNAB.
6. Visit Privacy and Terms to confirm the read-only, third-party, browser-local copy.
