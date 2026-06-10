# PollPotato

Ask a question, share one link, watch the group answer. PollPotato does polls and only polls.

- **Marketing site:** [pollpotato.com](https://pollpotato.com)
- **App:** [app.pollpotato.com](https://app.pollpotato.com)

## What it is

A focused poll app. No comments, no threads, no quizzes. Single- and multiple-choice polls, anonymous voting (or signed-in if you want stronger integrity), live results, one share link, optional QR. Mobile-first, light and dark mode, brand character is a friendly potato.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript strict) |
| Database | Neon serverless Postgres (HTTP driver, no TCP) |
| ORM | Drizzle |
| Auth | Neon Auth (managed Better Auth) — email/password + Google |
| Styling | Tailwind CSS v4 + shadcn/ui themed to brand tokens |
| Hosting | Cloudflare Workers via [`@opennextjs/cloudflare`](https://github.com/opennextjs/opennextjs-cloudflare) |
| ISR cache | R2 |

Free-tier first: Neon scales to zero, Cloudflare's free Workers plan permits commercial use. The app stays portable — no host-proprietary services beyond OpenNext (Cloudflare) and Neon Auth (Neon).

## Local development

```bash
cp .env.example .env.local      # then fill in DATABASE_URL, NEON_AUTH_BASE_URL, NEON_AUTH_COOKIE_SECRET
npm install
npm run db:migrate
npm run db:seed                 # optional — two example polls
npm run dev                     # http://localhost:3344
```

## Useful scripts

| | |
|---|---|
| `npm run dev` | Next dev server |
| `npm run build` | Production Next build (no deploy) |
| `npm run cf:build` | OpenNext + workerd-targeted build |
| `npm run cf:preview` | Run the built Worker locally on `localhost:8787` |
| `npm run db:generate` | Generate a Drizzle migration from the schema |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Drizzle Studio (browse the DB) |
| `npm run db:seed` | Seed example polls |
| `npm run lint` | ESLint |

## Deploy

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the Cloudflare runbook — one-time setup (zone, R2 bucket, secrets, custom domains) and the CI pipeline. Pushes to `main` deploy automatically via GitHub Actions; manual deploys are `npm run cf:build && npx wrangler deploy`.
