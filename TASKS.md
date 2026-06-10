# TASKS.md — PollPotato build plan

Work top to bottom. Each milestone has an acceptance check — don't move on until it passes. Read `CLAUDE.md` and `TECHNICAL_SPEC.md` first. The visual target is `pollpotato-mock.html`.

---

## M0 — Foundation
- [ ] Initialize Next.js (App Router, TypeScript, strict mode).
- [ ] Add Tailwind CSS; wire the color tokens from CLAUDE.md as CSS variables for light and dark.
- [ ] Add `next-themes`; build a working light/dark toggle.
- [ ] Initialize shadcn/ui; configure its theme to the tokens (not stock styling).
- [ ] Load fonts: Bricolage Grotesque (display), Hanken Grotesk (body), Space Mono (data).
- [ ] Set up route groups `(marketing)` and `(app)`.
- **Acceptance:** a blank themed shell runs; toggling dark mode changes the palette; fonts render.

## M1 — Data layer
- [ ] Create a Neon project; add `DATABASE_URL` to env.
- [ ] Install Drizzle + `@neondatabase/serverless`; configure the HTTP driver (no TCP).
- [ ] Write the Drizzle schema for `poll`, `poll_option`, `vote` per the spec, including indexes and the uniqueness constraints.
- [ ] Generate and run migrations; check them in.
- [ ] Add a seed script with a couple of example polls.
- **Acceptance:** can read/write all three tables locally against Neon; constraints reject duplicate votes.

## M2 — Auth
- [ ] **First, verify Neon Auth on Cloudflare Workers:** enable Neon Auth in the Neon Console, wire the minimal `createNeonAuth()` setup, and confirm it builds and runs under OpenNext on Workers (a sign-in round-trip works in a Workers preview). If it does NOT work cleanly, stop and switch to self-hosted Better Auth (same library, same data model below) before continuing — note the decision in the repo.
- [ ] Configure Neon Auth: `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` (32+ chars); set up `@neondatabase/auth/next` (client) and `@neondatabase/auth/next/server` (server).
- [ ] Enable email/password and Google for registered users; confirm users sync into the Neon Auth users table.
- [ ] Build themed sign-up / sign-in / sign-out UI.
- [ ] Mint stable `voter_token` / `creator_token` httpOnly cookies for anonymous identity (this is our own layer, independent of Neon Auth).
- [ ] On sign-up, migrate anonymous polls/votes (by token) to the new Neon Auth `user_id`.
- **Acceptance:** Neon Auth (or the Better Auth fallback) runs on Workers; can sign up/in with email and Google; an anonymous user gets a stable token and can vote without signing up; signing up keeps their prior polls/votes.

## M3 — Create a poll
- [ ] Build the Create screen per the mock (question, add/remove/reorder options, settings toggles).
- [ ] Implement `createPoll` with validation (1 question, 2–N options) and slug generation.
- [ ] Persist the poll + options; return the share URL.
- **Acceptance:** creating a poll yields a working share link; settings persist correctly.

## M4 — Vote
- [ ] Build the Vote screen (selectable option cards with the highlighter swipe, optional name field, "Cast vote").
- [ ] Implement `getPoll(slug)` including `hasVoted` / `viewerVote` and `hide_results` handling.
- [ ] Implement `castVote` with all integrity rules: single vs. multiple choice, token/account dedup, `require_name`, reject on closed/expired.
- [ ] Add per-IP rate limiting on `castVote`.
- **Acceptance:** a user can vote once; a second vote is blocked (unless multiple allowed); required-name is enforced; voting on a closed poll fails cleanly.

## M5 — Results
- [ ] Build the Results screen: bars, tabular-mono percentages, total, "you voted X," with count-up and ease-out fills.
- [ ] Implement `getResults`; short-poll it while results are visible (back off when tab hidden).
- [ ] Respect `hide_results` until the viewer has voted.
- [ ] Respect `prefers-reduced-motion` (no fills/animation).
- **Acceptance:** results match the vote rows; update within a few seconds across two browsers; hidden-results polls reveal only after voting.

## M6 — Share + dashboard
- [ ] "Share link" (copy) and "QR code" (client-side generation) on the results/poll views.
- [ ] Per-poll Open Graph / Twitter metadata for link previews.
- [ ] Build "my polls": list owned polls (by `user_id` or `creator_token`) with status and actions.
- [ ] Implement `closePoll`, `deletePoll`, `updatePoll` (owner-only).
- **Acceptance:** sharing works and previews; an owner can view, close, edit, and delete their polls.

## M7 — Marketing site
- [ ] Build the landing page at the root domain per the mock hero (headline, subhead, "Start a poll" CTA, live mini-result).
- [ ] Make it static/ISR; add metadata, sitemap, and basic SEO.
- [ ] Link the landing CTA into the app.
- **Acceptance:** `pollpotato.com` renders fast, is responsive, and routes into the app.

## M8 — Deploy to Cloudflare
- [ ] Add `@opennextjs/cloudflare`; configure `wrangler` and the OpenNext build.
- [ ] Wire env/secrets (Neon `DATABASE_URL`, Neon Auth base URL + cookie secret, Google OAuth) in Cloudflare.
- [ ] Set up domains: `pollpotato.com` (marketing) and `app.pollpotato.com` (app).
- [ ] Confirm the Worker bundle is under the size limit; trim if needed.
- [ ] Set up CI deploy (e.g. GitHub Actions running the OpenNext build).
- **Acceptance:** create → share → vote → see results works end-to-end in production on Cloudflare.

## M9 — Polish + QA
- [ ] Accessibility pass: visible focus everywhere, labelled controls, color-contrast check (including the lime highlighter — dark ink only).
- [ ] Real empty and error states in the interface's voice (no votes yet, poll not found, poll closed, poll expired).
- [ ] Mobile QA from 360px up; desktop layouts.
- [ ] Edge cases: very long questions/options, many options, simultaneous votes, cold-start latency from Neon.
- [x] Hostname canonicalization. Implemented as `src/worker.ts` wrapping `.open-next/worker.js` and inspecting `url.host` directly: `pollpotato.com/{app,p,auth}/*` → 308 to `app.pollpotato.com/<same>`; `app.pollpotato.com/` → 308 to `pollpotato.com/`. Guarded on `cf-ray` so wrangler local dev (which synthesizes the first routes hostname for every request) doesn't try to redirect localhost traffic.
- **Acceptance:** the quality floor in CLAUDE.md is met across light and dark, mobile and desktop.

---

## Backlog — do NOT build in v1 (needs an explicit decision)
- [ ] True realtime results via Cloudflare Durable Objects (WebSocket/SSE).
- [ ] "Let voters add their own option."
- [ ] Native iOS/Android (Capacitor or Expo) against the route handlers.
- [ ] Monetization: ads on marketing content; "Pro" tier (no ads, export, longer retention).
