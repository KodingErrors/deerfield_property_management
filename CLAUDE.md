# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## The most important thing to know

**`dist/` is hand-written source, not build output.** The shipping product is a dependency-free
static site of vanilla ES modules and HTML committed under `dist/`. Edit those files directly.

The `app/`, `components/`, `db/`, `drizzle/`, `hooks/`, `lib/`, `examples/` trees plus
`vite.config.ts` / `next.config.ts` / `build/sites-vite-plugin.ts` are the untouched
site-creator (Next 16 + vinext + Cloudflare) starter template. `app/page.tsx` is an early React
prototype of the landing page that is **not** deployed and is not kept in sync. `npm run build`
does not compile it. Do not "regenerate" `dist/` from it, and do not assume a change to a
`components/ui/*` file affects the live site.

Three subdirectories of `dist/` *are* generated and gitignored — `dist/client/`,
`dist/server/`, `dist/.openai/`. Never edit those; they are overwritten on every build.

## Commands

```powershell
npm run test:p0                     # all tests (node:test): matcher, local-site, worker
node --test tests/matcher.test.mjs  # one test file
npm run build                       # assemble the Worker bundle into dist/{client,server,.openai}
npm start                           # build, then wrangler dev on the bundle (serves /api/*)
npm run lint                        # eslint over the starter TSX only; dist/ is excluded
node --check dist/app.js            # syntax-check hand-written modules (they are never bundled)
python -m http.server 4173 --directory dist   # static preview; /api/inquiries will 404
```

`npm run dev` starts the unused vinext/Next scaffolding, not the Deal Desk. Use `npm start` or
the `http.server` preview instead.

For the contact form to actually send, `npm start` needs `RESEND_API_KEY` and `RESEND_FROM_EMAIL`;
without them the endpoint returns 503 by design. Put them in `.dev.vars` at the project root —
wrangler resolves that file next to its config, which lives in the generated `dist/server/`, so
the build copies it across. `INQUIRY_RECIPIENT` optionally overrides the destination address.

## Architecture

Every page is a plain HTML file that loads one ES module with `type="module"`. There is no
bundler, no framework, and no transpile step on this path — browser-native syntax only.

| Route | HTML | Module |
| --- | --- | --- |
| `/` | `dist/index.html` | `dist/app.js` — the four-step wizard SPA |
| `/properties/` | `dist/properties/index.html` | `dist/properties.js` — portfolio browse/filter |
| `/property/?id=` | `dist/property/index.html` | `dist/property.js` — detail view |
| `/contact/` | `dist/contact/index.html` | `dist/contact.js` — inquiry + callback scheduling |
| `/about/`, `/services/`, `/privacy-policy/` | static | (no module) |

Shared layers:

- **`dist/data.js`** — the single source of truth: 29 frozen property records, derived `cities`,
  and `featureSets` (which preference checkboxes appear per property type). Every record is built
  by the local `property()` helper, so all twelve feature flags exist on every property.
- **`dist/seed-traits.js`** — generated sample feature data, merged in by `property()`. It is
  deterministic (a hash of the property id seeds a mulberry32 PRNG), weighted per property type,
  and leaves ~20% of traits `null` so the unknown path stays exercised. An explicit `features`
  value on a record always wins, so real data can replace the seed one property at a time.
  These are **not** Deerfield's published facts; `/properties/` and the detail page say so.
- **`dist/seed-details.js`** — generated building specifics (asking rate, zoning, clear
  height, frontage, floors …), type-shaped so an industrial record never gets retail
  frontage. **Presentational only**: `dist/matcher.js` must never read `details`, or
  invented data would start deciding eligibility and ranking. A test enforces that.
- **`dist/seeded-random.js`** — the deterministic PRNG both seed modules share (FNV-1a
  hash into mulberry32), plus `intBetween`/`oneOf`/`roundedTo` helpers.
- **`dist/callback-windows.js`** — pure model for callback availability (slot keys, merging
  contiguous slots into windows, email lines). DOM-free so it can be unit tested.
- **`dist/inquiry-format.js`** — the canonical subject/body rules shared with the review dialog.
- **`dist/matcher.js`** — pure scoring, the only module with unit tests. No DOM access.
- **`dist/site-shell.js`** — theme toggle + mobile drawer for the secondary pages. `app.js`
  deliberately reimplements this inline rather than importing it.
- **`worker/index.js`** — the only server code: `POST /api/inquiries` → Resend, and
  `GET /api/inquiry-config` so the review dialog can show the real destination instead of a
  hardcoded address. Everything else falls through to the `ASSETS` binding when one is bound
  (Cloudflare/wrangler); on Vercel only `/api/*` reaches it, hence the 404 guard.

### The matching contract

`matchProperty()` runs hard constraints first, then weighted preferences, producing one of three
statuses that the whole UI is built around:

- `excluded` — a *confirmed* hard miss (wrong type, unavailable, size outside min/max, city miss
  when `locationMode === "hard"`). Score is `null`; never ranked with eligible results.
- `verification_required` — passes every hard constraint that is knowable, but at least one is
  unknown. Ranked, shown separately.
- `eligible` — everything confirmed.

**`null` means "not confirmed in the public listing" and must never count against a property.**
Unknown preferences carry `satisfaction: null` and are dropped from both numerator and
denominator of `normalizedScore()` — a property with only unknowns scores 100, not 0. Unknown
hard constraints downgrade to `verification_required` rather than excluding. Preserve this when
adding fields: use `null`, not `false`, for missing data.

Each evaluation carries a human-readable `reason` string; the UI renders those verbatim to
explain rankings, so reasons are user-facing copy.

### Inquiry flows (two distinct paths)

1. **Wizard → `mailto:`** (`dist/app.js`): builds a draft and opens the visitor's mail client at
   `info@deerfieldbrokerage.com`. It falls back to copy-to-clipboard past ~7,800 characters. This
   path never claims an inquiry was sent — keep that wording.
2. **Contact page → Worker** (`dist/contact.js` → `worker/index.js`): posts JSON to
   `/api/inquiries`, which relays via Resend to `INQUIRY_RECIPIENT` (falling back to
   `DEFAULT_RECIPIENT`) with a forced `[DEERFIELD]` subject prefix and the visitor's address as
   `reply_to`. A `website` field is a honeypot: non-empty means silently return `{ ok: true }`
   without sending. The user reviews and can edit the exact subject/body in a dialog before
   sending; `submissionId` becomes the Resend idempotency key.

   The dialog is meant to be a faithful preview, which constrains both sides: `enforceSubject()`
   in `dist/inquiry-format.js` and the subject block in `worker/index.js` must produce identical
   output, and both **strip the prefix before truncating** so the rule is idempotent — truncating
   first makes a long subject shrink again on every pass. A test in `tests/worker.test.mjs` feeds
   the client's output through the Worker and fails if the Worker alters it.

## Conventions the tests enforce

`tests/local-site.test.mjs` is a guardrail suite over the shipped artifacts, not a unit test. It
fails the build if you:

- add any `deerfieldbrokerage.com` URL to a shipped html/js/css/svg file — the site is a fully
  local mirror and must have no outbound links to the real brokerage site;
- change the property count away from 29, or add a record whose `image` is missing from
  `dist/assets/`;
- point a property's `sourceUrl` anywhere other than `./property/?id=`;
- remove specific contact-page element ids (`contact-property-toggle`,
  `callback-availability`, `email-review-subject`, …) that the flow depends on.

Other repo conventions:

- All markup is built with template literals, so every interpolated value goes through the local
  `escapeHtml()` in each module. There is no shared escape helper — each module defines its own.
- A listing photo is a link to that property's detail page (`.card-photo-link`) on both the
  portfolio grid and the results cards, with the "View property details" text link kept
  alongside it as the affordance that reads in a screen reader.
- Wizard state persists to `localStorage` under `deerfield-search-v1` (versioned; `loadSearch()`
  discards other versions). Theme persists under `deerfield-theme` and is applied by an inline
  head script before paint to avoid a flash.
- `dist/app.js` registers two WebMCP tools on `document.modelContext` when present
  (`configure_property_search`, `show_property_matches`). Both are explicitly non-sending: agents
  can stage a search and display matches but cannot contact the brokerage.
- Callback scheduling in `contact.js` is pinned to `America/Toronto` business hours and computed
  from `Intl` parts, not local time. Two input modes write to the same `selectedAvailability` Set
  of `YYYY-MM-DD|HH:MM` keys — a drag-to-paint grid and a range builder — so either can be edited
  without the other losing state; `matchMedia("(pointer: coarse), (max-width: 720px)")` picks the
  default and a toggle overrides it. Pointer painting calls `preventDefault()`, so the grid's
  `change` listener only ever fires for keyboard toggles.

## Deployment

Vercel (free Hobby tier) is the deploy target: `vercel.json` publishes `dist/client`, and
`api/inquiries.js` / `api/inquiry-config.js` are thin edge functions delegating to
`worker/index.js` so the handler is never duplicated per platform. The Cloudflare path stays for
local dev via `npm start`.

Two non-obvious constraints there:

- The edge runtime inlines only statically analyzable `process.env.NAME` references, so
  `worker/vercel-env.js` names each variable explicitly. Passing `process.env` straight through
  hands the worker an empty object and every inquiry 503s.
- `vercel.json` sets `trailingSlash: true` for the directory-style page URLs, so the worker
  normalizes a trailing slash before matching `/api/*`.

`vercel.json` skips the install step because the build and both functions use only local files
and Node builtins; add `installCommand: "npm install"` back if a real dependency ever appears.

`scripts/build-deal-desk-worker.mjs` pins `compatibility_date`; it must not exceed the newest
date the pinned wrangler's runtime supports or the local server refuses to start. It also clears
`dist/{client,server,.openai}` with a retry, because Windows locks those folders while a dev
server serves from them — a running `npm start` is the usual cause of a failed rebuild.

## Note on the README

`README.md` now documents the Worker/Vercel deployment. `.openai/hosting.json` lost its `static`
block in commit `1feef29`; the static preview (`python -m http.server --directory dist`) is still
a valid way to look at pages, just not how the site deploys, and `/api/*` is absent in that mode.
