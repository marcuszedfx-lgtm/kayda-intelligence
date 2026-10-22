# Kayda Intelligence — Security Model

Kayda is a **single-operator, loopback-bound** application. Everything in
this document describes one boundary: *the machine that runs Kayda is
trusted; everything that reaches it is not.*

The controls below are implemented in code, not in documentation alone.
Every one of them is covered by a deterministic smoke test or a runtime
check; the verification record is at the bottom of this file.

---

## 1. The operator token

`KAYDA_OPERATOR_TOKEN` is the single secret that guards every read and
write route.

| Rule | Where it is enforced |
| --- | --- |
| Must be at least 32 characters | `src/lib/security/operator-token.ts` |
| Compared with `timingSafeEqual` | `src/lib/security/operator-token.ts` |
| Never returned in an API response | every route handler |
| Never written to a cookie | `src/lib/security/session.ts` |
| Never written to `localStorage` / `sessionStorage` | `src/app/login/login-form.tsx` |
| Never logged | no logging statement references it |
| Never bundled into the browser | imported only from server modules |

A token shorter than 32 characters is rejected outright, and
`readOperatorToken()` then returns `undefined`. **Authentication fails
closed**: with no usable token, every protected route refuses access
rather than accepting anything.

### Generating a token

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

### Rotating a token

1. Put the new value in `.env` as `KAYDA_OPERATOR_TOKEN`.
2. Restart the server.

Rotating the token invalidates every existing session immediately,
because the session signature is keyed with the token. There is no
server-side session store to revoke anything in.

### Manual setup required by the operator

- `KAYDA_OPERATOR_TOKEN` must be set in `.env` before the application is
  usable. It is **not** set by the build and it is not committed.
- `DATABASE_URL` must point at Kayda's dedicated PostgreSQL instance on
  **port 5433**. See `docs/DB-MIGRATION-STRATEGY.md`.

---

## 2. Sessions

The session is stateless and signed. The cookie holds no secret material:

```
kayda_session = v1.<issuedAt>.<expiresAt>.<HMAC-SHA256(payload, token)>
```

The server recomputes the HMAC and compares it in constant time.
Verification also refuses a session whose claimed lifetime is longer
than `MAX_SESSION_TTL_MS` (30 days), even when its signature is valid:
the server cannot issue one, so it will not accept one.

| Property | Value | Why |
| --- | --- | --- |
| `HttpOnly` | always | JavaScript cannot read the cookie |
| `SameSite` | `Strict` | it is not sent on cross-site requests |
| `Path` | `/` | the whole application, and no wider |
| Lifetime | 12 hours by default (`KAYDA_SESSION_TTL_HOURS`, capped at 30 days) | a session cannot outlive its embedded expiry |
| `Max-Age` | not set | it is a browser-session cookie; the server-side expiry is an independent bound |
| `Secure` | set **only** when the request arrived over HTTPS | see the local exception below |

### The local HTTP preview exception

The local preview runs over **plain HTTP on loopback**. A `Secure` cookie
is only stored by a browser when the page itself is served over HTTPS,
so setting `Secure` unconditionally would make the browser refuse to
store the session at all and the application would be unusable locally.

The rule is therefore: `Secure` is added when the request arrived over
HTTPS **through a proxy the operator has explicitly trusted**, or when
the connection itself is HTTPS. Over plain-HTTP loopback the cookie is
issued without `Secure`.

`X-Forwarded-Proto` is read only when `KAYDA_TRUSTED_PROXY` is set
(section 3a). With no proxy configured the header is ignored entirely —
not consulted, not trusted — so a client can no longer choose whether
its own session cookie carries `Secure`.

**This is safe here because the server is bound to `127.0.0.1` and the
`Host` header is validated on every request** (section 3): a browser on
another machine, or a different site in the same browser, cannot reach
this server at all. If Kayda is ever exposed over a network, it must be
placed behind TLS, and the `Secure` flag will then be applied
automatically.

---

## 3. Request-level defences (`src/proxy.ts`)

Next.js 16's `proxy.ts` (the convention that replaced `middleware.ts`)
runs before every matched request.

### Host validation — 421

A request whose `Host` header does not name a local address
(`localhost`, `127.0.0.1`, `::1`, or an explicit entry in
`KAYDA_ALLOWED_HOSTS`) is refused with **421 Misdirected Request**.

This closes the DNS-rebinding path: an attacker points their own domain
at `127.0.0.1`, the browser then treats their site as same-origin, and
the usual "no CORS header" property stops protecting anything. The
server refuses to answer at all.

### Origin validation — 403

A state-changing request (`POST`, `PUT`, `PATCH`, `DELETE`) is refused
with **403** when:

- the `Origin` header is **missing or blank**,
- `Origin` names a non-local host,
- `Origin` is the opaque `null` origin,
- `Origin` is not a valid `http(s)` URL,
- `Origin`'s **scheme** differs from the request's scheme,
- `Origin`'s **hostname** differs from the request's hostname,
- `Origin`'s **effective port** differs from the request's effective
  port,
- the origin's port differs from `KAYDA_APP_PORT`, when that is set,
- `Sec-Fetch-Site: cross-site` is present.

Both sides are compared on **scheme, hostname and effective port**.
"Effective" means the port is resolved on both sides before it is
compared: an origin that names no port means 80 (or 443 over https),
never "whatever port the application happens to be on". This is what
closes the audit's M1 finding, where `Origin: http://127.0.0.1` — a
page served from the default port 80 — was compared by hostname alone
and accepted against an application listening on 3102.

A request with **no** `Origin` header is now **refused**. Every browser
sends `Origin` on POST, PUT, PATCH and DELETE, including for
same-origin requests, so normal operation is unaffected; what is lost
is only the ability to drive a state-changing route from a client that
declines to say where it came from. Non-browser scripts (curl, an API
test harness) must send the header themselves.

#### Where each side of the comparison comes from

Neither side is read from `request.url`, and both reasons were found
by testing the proxy against a running server rather than by reading
the framework's source:

- **The identity — hostname and port — comes from the `Host`
  header.** Next.js normalises every loopback hostname in
  `request.url` to `localhost` (`NextURL` rewrites `127.0.0.1` and
  `::1`), so the URL cannot tell `localhost:3102` from
  `127.0.0.1:3102`. Comparing against it refused every request the
  operator made over `127.0.0.1` — the very case the check exists to
  allow. The `Host` header carries exactly what the browser
  addressed, is already validated against the loopback allow-list
  before this runs, and is the value the browser derived its own
  `Origin` from.
- **The scheme comes from `requestScheme()`**
  (`src/lib/security/trusted-proxy.ts`), which applies the same
  trust decision as the `Secure` cookie flag: the forwarded value
  when a proxy is trusted, and otherwise the connection itself. This
  matters because Next.js rebuilds `request.url` from
  `X-Forwarded-Proto` whenever that header is present, **whether or
  not a proxy is trusted** — so a single client-supplied header would
  otherwise move the scheme of every request, breaking legitimate
  writes (`403` on a request whose `Origin` still says `http:`) and
  turning the comparison into something a header could steer.

With no trusted proxy, a present-but-untrusted `X-Forwarded-Proto`
is ignored and the scheme falls back to plain `http:` — the
documented local deployment. A caller that tries to claim `https`
that way is refused, which is the fail-closed direction.

`KAYDA_APP_PORT`, when set, additionally pins the port: a request and
origin that agree on a port that is not the application's are still
refused. It is unset by default.

> **Origin validation is not authentication.** It is defence in depth
> around a boundary that is enforced by the operator token. Removing
> every `Origin` check would not make the application unauthenticated,
> and adding an `Origin` check would not make it authenticated.

### 3a. Forwarded headers — `KAYDA_TRUSTED_PROXY`

Kayda normally answers directly on the loopback interface. In that
deployment the request's peer is the operator's own machine and every
`X-Forwarded-*` header on the request was typed by the client, so
**neither is trusted for any decision**.

Setting `KAYDA_TRUSTED_PROXY=1` opts in, for a reverse proxy the
operator controls that sets these headers:

| Header | Used for | How it is read |
| --- | --- | --- |
| `X-Forwarded-Proto` | whether the session cookie gets `Secure`, and the scheme half of the Origin comparison | rightmost value; only `http` or `https`; anything else ignored |
| `X-Forwarded-For` | the login-throttle bucket key | rightmost value, truncated to 128 characters |

Rightmost is the correct choice for a single proxy, which appends its
own observation after anything the client supplied. The flag is off by
default, and nothing in the code widens trust without it.

### Security response headers

Added to every response:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
Content-Security-Policy: default-src 'self'; base-uri 'self'; form-action 'self';
  frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob:;
  font-src 'self' data: https://fonts.gstatic.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  connect-src 'self'; script-src 'self' 'unsafe-inline'
```

The two font origins are named explicitly because `src/app/globals.css`
imports DM Sans and IBM Plex Mono from Google Fonts. Everything else
stays on `'self'`.

API responses carry `Cache-Control: no-store`, and so do **every
refusal** the proxy returns — 401, 403 and 421 — so an intermediary
can never store a rejection and replay it.

Responses also omit the `X-Powered-By` header (`poweredByHeader:
false` in `next.config.ts`): it tells a visitor nothing useful and
hands an attacker a framework hint.

### A note on a nonce-based CSP

The policy above keeps `script-src 'self' 'unsafe-inline'`, which is
the standard Next.js posture: the framework emits inline bootstrap and
RSC payload scripts. A nonce would remove `'unsafe-inline'`, but
setting one changes `'unsafe-inline'` from "allowed" to "ignored", so
**every** inline script must carry the nonce or the application breaks
at runtime. That cannot be confirmed without a real browser observing
CSP violations, which this stage does not have. The policy is
therefore left as it is rather than weakened further or changed on
unverified assumptions.

---

## 4. Authorization

`src/lib/security/guards.ts` is the authorization decision, and it runs
**in the route handlers**, not only in the proxy.

| Route | Method | Without a valid session |
| --- | --- | --- |
| `/api/workspace` | GET, POST | 401 |
| `/api/workspace/import` | POST | 401 |
| `/api/status` | GET | 401 |
| `/api/intelligence` | GET | 401 |
| `/api/auth/login` | POST | 200 / 401 / 429 / 413 (public by design) |
| `/api/auth/session` | GET | 200 with `authenticated: false` (public by design) |
| `/api/auth/logout` | POST | 200 (public by design) |
| every page except `/login` | GET | 307 redirect to `/login` |

The proxy performs a **real** check too — it verifies the session
signature rather than merely looking for the cookie — but it is one
layer, not the boundary: the same cryptographic check also runs in
every route handler. Because the decision lives in the route handlers,
it cannot be bypassed by reaching a handler through a path the proxy
does not match. A cookie that is merely present opens nothing: a
forged, expired or foreign-token value is refused at both layers.

---

## 5. Brute-force protection

`src/lib/security/login-throttle.ts`:

- **5** failed attempts from one source inside a **15-minute** window
  lock that source out for **15 minutes**.
- **20** failed attempts from **every** source combined inside a
  15-minute window lock the whole endpoint for 15 minutes. This is the
  ceiling that a source key cannot bypass.
- A successful login clears the per-source counter, but deliberately
  **not** the global ceiling: nothing that fails may hand back an
  allowance.
- The bucket table is pruned and hard-capped at 1024 sources. Pruning
  drops the oldest **unlocked** source, never an active lockout — so
  filling the table cannot be used to clear one.
- A failed attempt also waits 250 ms before responding, but only while
  the attempt was allowed; a refused attempt is answered immediately.

### Which source key is used

The key must not be attacker-controlled. Kayda does not read a socket
peer address — a Next.js route handler is not given one — so when no
reverse proxy is configured the key is the constant `local`: **every
caller shares one bucket**. That is the honest answer for an
application whose only possible peer is the operator's own machine,
and it is why a forwarded header can no longer be used to buy a fresh
bucket.

`X-Forwarded-For` is used as the key only behind an explicitly trusted
proxy (section 3a), and even then the global ceiling still applies.

The throttle is in-process and in-memory. That is a deliberate choice:
Kayda is a single-operator, single-process, loopback-bound application,
so a shared store would add a dependency without adding protection.
**Restarting the server clears it.** Because every loopback client
shares the same key, a burst of failed attempts from any local process
will lock the operator out for the remainder of the window.

---

## 6. Request body limits

`src/lib/security/request-limits.ts` reads untrusted bodies once, with
three guarantees:

1. The declared `Content-Length` is checked **before a single byte is
   read**.
2. The body is then streamed with a **hard byte cap**, so a request that
   lies about, or omits, its length cannot exhaust memory.
3. Only `application/json` is accepted.

| Body | Cap | Over the cap |
| --- | --- | --- |
| `POST /api/workspace` | 64 KB | 413 `payload_too_large` |
| `POST /api/workspace/import` | 8 MB | 413 `payload_too_large` |
| `POST /api/auth/login` | 4 KB | 413 `payload_too_large` |

Rejecting non-JSON content types is a security control, not tidiness: a
`text/plain` POST is a CORS *simple request* that a browser sends
cross-site **without a preflight**, so refusing it removes the cheapest
cross-origin write vector outright.

### Import record limits

Checked in `src/lib/workspace/validation.ts`, **before** the database
transaction opens, so an oversized import never reaches PostgreSQL:

- at most **2 000** records in a single collection,
- at most **2 000** records across all collections combined.

The per-collection limit alone would still allow six collections of
2 000 records each, which is why the total limit exists.

---

## 7. The database target guard

`src/lib/db/port-guard.ts` holds **one** policy, consumed by **both**
the read-only status check and the shared Prisma client creation path
(`src/lib/db/prisma.ts`). There is no second, looser path.

| Rule | Refusal |
| --- | --- |
| Port `5432` (the trading platform) | `refused_wrong_port` |
| Any port other than `5433` | `refused_wrong_port` |
| A URL with no explicit port (defaults to 5432) | `refused_wrong_port` |
| A host that is not local and not in `KAYDA_ALLOWED_DB_HOSTS` | `refused_wrong_host` |

The guard runs **before the Prisma client is constructed**, so a refused
target never opens a socket. The validated URL is then passed to Prisma
explicitly, so the client cannot connect anywhere the guard did not
approve.

### 7a. What `/api/status` is allowed to say

The status endpoint reports topology, so it requires a session. Even
then it never carries:

- the operator token, a cookie, or any secret;
- the database credentials — `getConfiguredPort()` reads the port out
  of the URL and nothing else;
- the driver's error text. A failed connection check returns the stable
  code `database_unreachable` and a fixed sentence; the underlying
  message (which can name the host, port, role and database) goes to
  the **server log** only;
- the registry's absolute path. It is reported relative to the project
  root (`data/kayda-registry.json`), so a response never publishes the
  operator's home directory.

Every database outcome carries a `code` from a fixed set
(`database_reachable`, `database_unreachable`, `database_not_configured`,
`database_refused_wrong_port`, `database_refused_wrong_host`) so a
client can branch without being shown anything internal.

---

## 8. Verification record

Recorded on 2026-10-22, against the production build on
`http://127.0.0.1:3102`.

| Check | Result |
| --- | --- |
| Typecheck (`npx tsc --noEmit`) | pass |
| Deterministic suite (`npm test`) | 31/31 pass |
| Production build (`npm run build`) | pass; `ƒ Proxy (Middleware)` emitted |
| Server binding | `127.0.0.1:3102` only — not `0.0.0.0` |
| Unauthenticated `/api/workspace`, `/api/status`, `/api/intelligence`, `/api/workspace/import` | 401 |
| Unauthenticated page request | 307 to `/login` |
| Wrong token | 401, token never echoed |
| Correct token | 200 + `HttpOnly`, `SameSite=Strict`, `Path=/` cookie, no `Max-Age`, no `Secure` over plain HTTP |
| Token in the cookie / response body / `document.cookie` / `localStorage` / `sessionStorage` | absent everywhere |
| Tampered and forged cookies | 401 |
| Authenticated `/api/workspace`, `/api/status` | 200; database `reachable`, port `5433` |
| Foreign `Host` header (with and without a port) | 421 |
| Cross-origin, mismatched-port, `null` origin, `sec-fetch-site: cross-site` | 403 |
| Same-origin POST | allowed |
| Body over 64 KB / 4 KB, chunked body with no `Content-Length` | 413 |
| `text/plain` body | 415 |
| Malformed JSON | 400 |
| Import of 2 001 records / 3 000 records across 3 collections | 400, named limit, no database write |
| Brute force | 429 with `Retry-After` after 5 failed attempts |
| Logout | 200, cookie cleared with `Max-Age=0` |
| Port guard vs a **disposable** TCP target on port 55433 | `refused_wrong_port`; status and data paths both refuse; **zero** connection attempts recorded by the target |
| Live Kayda database after verification | every table empty, 0 signals, 1 applied baseline migration — unchanged |

### Historical verification

The earlier verification record (dated 2026-10-21, 30/30 pass) was
produced before the CSP deduplication and redirect Cache-Control fixes.
Those changes are reflected in the updated counts and policies above.

### Known limitations

- The port guard was exercised against a **disposable** target, never
  against the trading database on 5432.
- The login throttle is in-process: a restart clears it, and all
  loopback clients share one bucket.
- The session cookie is issued without `Secure` over plain-HTTP
  loopback, for the reason given in section 2.
- Nonce-based CSP remains deferred: a nonce would remove `'unsafe-inline'`,
  but setting one requires every inline script to carry it, which cannot be
  confirmed without a real browser observing CSP violations.
- The development CSP deduplication fix and its test coverage are newly added.
- The `Cache-Control: no-store` redirect fix is newly implemented.
- Lack of browser verification where it still applies: the CSP nonce
  assessment and visual layout checks require a real browser session.
- The separate host-level exposure reported for the trading PostgreSQL
  service on port 5432, explicitly marked outside this project's scope and
  not modified.
---

## 9. Network binding

| Service | Binding | Change |
| --- | --- | --- |
| Next.js dev and production server | `127.0.0.1` only | `npm run dev` / `npm start` pass `-H 127.0.0.1`; the server is never reachable from another machine. |
| PostgreSQL (`kayda-intelligence-postgres`) | `127.0.0.1:5433` | Recreated on 2026-10-21 with `-p 127.0.0.1:5433:5432`. The previous container published `0.0.0.0:5433`, which exposed the database to every network the host sits on. |

The database container was recreated rather than reconfigured, because
Docker cannot change a published port on a running container. The
replacement reuses the **same named volume**
(`kayda_intelligence_postgres_data`) and the **same role, database and
password**, so no data, schema or migration state changed. The
data directory was reused rather than re-initialised — the container
logged *"PostgreSQL Database directory appears to contain a database;
Skipping initialization"*.

The previous container is retained, stopped, as
`kayda-intelligence-postgres-old` for rollback. It can be removed
once the replacement has proved itself:

```bash
docker rm kayda-intelligence-postgres-old
```

Note that the port guard permits `localhost`, `127.0.0.1` and `::1` as
database hosts. The container is published on IPv4 loopback only, so
`::1` is not listening; the application's `localhost` URL still
resolves correctly because Node selects the address family that is
actually available.

---

## 10. Dependencies

| Package | Version | Note |
| --- | --- | --- |
| `next` | `16.4.2` | Past every published Next.js security fix for 16.x known at time of writing (the September 16.3.8 and October 16.4.1 advisories). |
| `react` / `react-dom` | `19.2.0` | Unaffected: the 2025–26 React advisories name the `react-server-dom-*` packages, which are not installed here. |
| `@prisma/client` | `6.19.3` | Production runtime; no advisory reported. |
| `prisma` | `6.19.3` | **Development-only CLI.** npm audit reports `deepmerge-ts <8.0.0` as a high-severity transitive vulnerability through `@prisma/config`; the vulnerability is in the Prisma config loader build tool, not the runtime. Upgrading to Prisma 7 resolves it, which is a major change outside this release. |
| `undici` | *removed* | Was a direct dependency and was never imported. Removed rather than upgraded. |

*Effect* is no longer reported by `npm audit` and has been removed from this table.
*Effect* had been listed as an advisory from `@prisma/config`'s config loader, but the current audit no longer flags it.

`sharp` and `source-map-js`, both transitive through `next`, were
bumped to patched versions by the same lockfile update.
