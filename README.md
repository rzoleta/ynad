# YNAD (You Need A Dashboard)

[https://ynad.app](https://ynad.app)

YNAD is a free and open-source web app for building beautiful dashboards for your YNAB personal finance data.

Build charts showing _Net Worth_, _Account Balances_, _Spending_, _Income_, etc.

YNAD is an independent third-party app. It is not affiliated with, endorsed by, or sponsored by
YNAB.

<img width="1425" height="1327" alt="ynad_screenshot" src="https://github.com/user-attachments/assets/868a9ed4-a394-4edc-b786-a3441ef9ffe2" />

## Privacy

YNAD uses read-only YNAB API access and never stores your YNAB financial data (transactions,
accounts, categories, payees). Financial data is fetched live from the YNAB API when you open your
dashboard and kept only in memory.

What YNAD does store in its database: your account identity, your YNAB OAuth authorization (used
server-side to fetch data on your behalf), and your dashboard chart configuration and preferences —
so your dashboard follows you across devices.

Check the YNAB docs at: [https://api.ynab.com/#oauth-applications](https://api.ynab.com/#oauth-applications)

## Development

If you wish to host or run the web app yourself.

Install dependencies:

```sh
pnpm install
```

Create a Neon Postgres database and a YNAB OAuth app, then:

```sh
cp .env.example .env
```

Then edit `.env`:

```sh
DATABASE_URL="your-neon-connection-string"
YNAB_CLIENT_ID="your-client-id"
YNAB_CLIENT_SECRET="your-client-secret"
BETTER_AUTH_SECRET="random-secret"
```

Register `http://localhost:5173/api/auth/callback/ynab` (and your production
`https://your-domain/api/auth/callback/ynab`) as redirect URLs on the YNAB OAuth app.

Apply database migrations:

```sh
pnpm db:migrate
```

Start the dev server:

```sh
pnpm dev
```
