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

## 6. CI deploy via GitHub Actions

`.github/workflows/deploy.yml` runs on every push to `main` (and via the
**Run workflow** button under the Actions tab). It builds with OpenNext and
deploys via `cloudflare/wrangler-action@v3`.

### a. Cloudflare API token

dash.cloudflare.com → top-right account icon → **My Profile → API Tokens**
→ **Create Token** → **Edit Cloudflare Workers** template.

- Permissions are pre-filled by the template (Workers Scripts, Workers Routes,
  Account Settings, User Details, etc.).
- **Account Resources:** restrict to your account.
- **Zone Resources:** include `pollpotato.com`.
- TTL: leave open-ended, or set an expiry if you're rotating.

Copy the token immediately — Cloudflare shows it once.

### b. Cloudflare account id

dash.cloudflare.com → any **Workers & Pages** page → right sidebar shows
**Account ID**. Copy it.

### c. GitHub repo secrets

In your repo: **Settings → Secrets and variables → Actions → New repository
secret**. Add five secrets total:

| Name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | from step (a) |
| `CLOUDFLARE_ACCOUNT_ID` | from step (b) |
| `DATABASE_URL` | same Neon HTTP URL you set with `wrangler secret put` |
| `NEON_AUTH_BASE_URL` | same Neon Auth instance URL |
| `NEON_AUTH_COOKIE_SECRET` | same 32+ char string |

The three runtime secrets are mirrored into GitHub because `next build`
validates them at module-load time (our `lib/db/index.ts` and
`lib/auth/server.ts` throw if they're missing or malformed). The Worker
itself still reads its **own** secrets at runtime, not these — these only
satisfy the build.

### d. First CI run

Push a commit to `main`. **Actions** tab → `deploy` workflow → tail the run.
On success the new Worker version is live within ~2 min of the push.

If the build step fails because one of the three runtime secrets is
missing/wrong in GitHub, the error in the Actions log will be the same
"Invalid URL string" / module-load throw you'd see locally — fix the GitHub
secret value and re-run.

### Rotating secrets

When you change a runtime secret value, update it in **both** places:

```bash
echo "<new value>" | npx wrangler secret put DATABASE_URL    # Worker runtime
```

…and in **GitHub → Settings → Secrets → Actions** so the next CI build
doesn't fail. Otherwise the two will drift.

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
