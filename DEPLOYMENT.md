# DEPLOYMENT.md — PollPotato on Cloudflare Workers

This is the runbook for M8. Walk it top to bottom the first time. Subsequent
deploys are just `npm run cf:build && npx wrangler deploy`.

The Worker is configured in `wrangler.jsonc`; bundles are produced by
`@opennextjs/cloudflare` from the standard Next build. ISR pages cache to an
R2 bucket via the `NEXT_INC_CACHE_R2_BUCKET` binding.

---

## 1. One-time Cloudflare setup

### a. Account + CLI

```bash
npx wrangler login
```

Authorizes wrangler against your Cloudflare account in the browser. Verify with
`npx wrangler whoami`.

### b. Add `pollpotato.com` as a zone

In the Cloudflare dashboard:

1. **Add a site** → enter `pollpotato.com` → Free plan.
2. Cloudflare gives you two nameservers (something like
   `ada.ns.cloudflare.com`, `kirk.ns.cloudflare.com`).
3. Log into your domain registrar and replace the nameservers with the two
   above. Propagation typically takes minutes to a couple of hours.
4. Cloudflare emails when the zone is active. The remaining steps assume it is.

### c. Create the R2 bucket for ISR cache

```bash
npx wrangler r2 bucket create poll-potato-cache
```

The bucket name must match the `r2_buckets[0].bucket_name` in
`wrangler.jsonc`.

## 2. Secrets

These are sensitive — set them via `wrangler secret put`, **never** in
`wrangler.jsonc` or `.env*` files committed to git. Each command prompts for
the value on stdin.

```bash
npx wrangler secret put DATABASE_URL
npx wrangler secret put NEON_AUTH_BASE_URL
npx wrangler secret put NEON_AUTH_COOKIE_SECRET
```

`DATABASE_URL` is the Neon HTTP URL from the Neon Console (must include
`?sslmode=require`).
`NEON_AUTH_BASE_URL` is your project's Neon Auth instance URL.
`NEON_AUTH_COOKIE_SECRET` must be 32+ chars; generate fresh with
`openssl rand -base64 48` rather than reusing the dev value.

Sanity-check what is set (values are not shown — by design):

```bash
npx wrangler secret list
```

### Google OAuth

Google OAuth is configured **inside the Neon Auth console**, not as Worker
secrets — Neon's auth service holds the client id/secret and handles the
callback. In the Neon Console → Auth → providers, add Google with:

- Authorized origin: `https://app.pollpotato.com`
- Authorized redirect: whatever Neon Auth shows for its callback URL

## 3. First deploy (no custom domain yet)

```bash
npm run cf:build
npx wrangler deploy
```

Wrangler prints a URL like `https://poll-potato.<your-subdomain>.workers.dev`.
Smoke-test it:

- The landing should render.
- `/app/create` should require sign-in (Neon Auth flow).
- Sign up, create a poll, share it, vote, see results.

If anything fails: `npx wrangler tail` streams live logs from the Worker.

## 4. Wire the custom domains

**Wait until pollpotato.com is an active Cloudflare zone** (DNS propagated,
not just "Add a site" submitted). If you wire `routes` against a hostname
Cloudflare doesn't yet manage, the trigger-register API call fails with
`workers/scripts/poll-potato/domains/records` 4xx.

Once the zone is active, edit `wrangler.jsonc`:

1. Remove `"workers_dev": true` (or set it to `false`)
2. Uncomment the `routes` block at the bottom

```jsonc
"routes": [
  { "pattern": "pollpotato.com", "custom_domain": true },
  { "pattern": "app.pollpotato.com", "custom_domain": true }
]
```

Redeploy:

```bash
npx wrangler deploy
```

Cloudflare provisions TLS certs automatically for both hostnames (usually
< 1 min). Verify:

- `https://pollpotato.com/` → marketing landing.
- `https://app.pollpotato.com/app/create` → app.
- `https://pollpotato.com/app/create` → 308 redirect to
  `https://app.pollpotato.com/app/create` (handled in `next.config.ts`).
- `https://app.pollpotato.com/` → 308 redirect to `https://pollpotato.com/`.

## 5. Acceptance check

With `PP_BASE_URL` pointed at the deployed app subdomain:

```bash
PP_BASE_URL=https://app.pollpotato.com npx tsx scripts/verify-m8.ts
```

The script runs an end-to-end smoke: it hits the marketing landing on the
canonical host, walks the app subdomain, and confirms the hostname redirects
fire correctly. (Sign-in-gated flows are not exercised here — verify those
manually after the first deploy.)

## 6. CI (deferred)

Per the M8 plan we ship the first deploy manually. Once that is stable, add
`.github/workflows/deploy.yml` that runs `npm run cf:build` and
`wrangler deploy` on pushes to `main`. The workflow needs a
`CLOUDFLARE_API_TOKEN` repo secret (create it in the Cloudflare dashboard with
the `Workers Scripts:Edit` template, scoped to the `poll-potato` Worker).

## Troubleshooting

- **"DATABASE_URL is not set"** at runtime: secret was not put against the
  right Worker. Confirm `wrangler secret list` shows it.
- **`R2 bucket not found`** on first request: bucket name in `wrangler.jsonc`
  doesn't match the one you created. They must match exactly.
- **Bundle over 3 MB gzipped** (free tier): `cf:build` followed by
  `npx wrangler deploy --dry-run --outdir=.tmp-out` prints the gzip size.
  Anything unexpectedly large usually traces back to a server component
  pulling in a client library.
- **Cold start latency**: the first request after Neon idles takes a couple
  seconds while the DB wakes. This is expected — the mascot hop is the UI
  affordance for it.
