# YNAD (You Need A Dashboard)

[https://ynad.app/app](https://ynad.app/app)

YNAD is a free and open-source web app for building beautiful dashboards for your YNAB personal finance data.

Build charts showing *Net Worth*, *Account Balances*, *Spending*, *Income*, etc.

YNAD is an independent third-party app. It is not affiliated with, endorsed by, or sponsored by
YNAB.

## Privacy

YNAD is 100% private and local-only. The hosted web app does *NOT* store any user's data on remote servers.

Initially it will perform a big fetch of user's full transaction history, and then store this on-device in the browser.

As a result, this does mean users will need to manually re-authenticate from time to time due to the use of an Implicit Grant Flow type in the OAuth flow (since we do not persist your access tokens).

Check the YNAB docs at: [https://api.ynab.com/#oauth-applications](https://api.ynab.com/#oauth-applications)


## Development

If you wish to host or run the web app yourself.

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
