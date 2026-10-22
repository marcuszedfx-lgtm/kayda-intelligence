# Kayda Intelligence

Private AI Command & Business Operations System.

## Run locally

```bash
npm install
npm run dev
```

The dev and production servers are bound to `127.0.0.1` only — they are
never reachable from another machine. Port 3000 is used by other
services on this host, so Kayda is normally run on 3102:

```bash
PORT=3102 npm run dev
```

Then open <http://127.0.0.1:3102>.

## Operator login

Every read and write route requires the single operator token. It is
read from `KAYDA_OPERATOR_TOKEN` in `.env` and must be at least 32
characters:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Copy the value into `.env`, then open `/login` and paste it once. The
token is checked on the server in constant time, is never written to a
cookie or to browser storage, and rotating it invalidates every
existing session.

See [docs/SECURITY.md](docs/SECURITY.md) for the full model, and
[docs/DB-MIGRATION-STRATEGY.md](docs/DB-MIGRATION-STRATEGY.md) for the
database rules — Kayda's PostgreSQL instance lives on port **5433** and
port **5432** belongs to the trading platform and is off-limits.

## Verify

```bash
npm run typecheck
npm test
npm run build
```

## Architecture direction

Next.js + React + PostgreSQL/Supabase + provider-agnostic AI service layer + GitHub.

The current data is demo-only. No real business credentials or private records are included.
