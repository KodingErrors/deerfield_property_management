# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## The most important thing to know

This is a **Next.js (App Router) + React** app deployed on Vercel, with one deliberate split:

- `app/` and `components/` are React (TypeScript, `.tsx`). All interactive UI is a client
  component; the pages themselves are server components that render it.
- `lib/` is framework-free JavaScript/TypeScript with **no React and no DOM** (the two
  exceptions, `lib/theme.ts` and `lib/search.ts`, own browser storage). The Node test suite
  imports these modules directly, so anything that reaches for `document` here breaks the tests.
  A guardrail test enforces this.
- `worker/index.js` is the only server code and is shared, not duplicated: both API route
  handlers in `app/api/*/route.ts` call `handler.fetch(request, vercelEnv())`.
- `app/styles.css` is the entire design system — one global stylesheet, imported by the root
  layout. There is no Tailwind, no CSS-in-JS and no component CSS.

## Commands

```powershell
npm run dev                          # next dev on http://localhost:3000
npm run build                        # production build (also the best check for client/server boundary mistakes)
npm start                            # serve the production build
npm run check                        # tsc --noEmit
npm run test:p0                      # all tests (node:test)
node --test tests/matcher.test.mjs   # one test file
```

For the contact form to deliver, `npm run dev` needs `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in
`.env.local`; without them the endpoint returns 503 by design. `INQUIRY_RECIPIENT` optionally
overrides the destination address.

## Architecture

| Route | Page | Client component |
| --- | --- | --- |
| `/` | `app/page.tsx` | `components/wizard/deal-desk.tsx` — the four-step wizard, results, compare and contact modal |
| `/properties/` | `app/properties/page.tsx` | `components/portfolio.tsx` — browse, filter, compare |
| `/property/?id=` | `app/property/page.tsx` | (server-rendered from `searchParams`) |
| `/contact/` | `app/contact/page.tsx` | `components/contact-form.tsx` — inquiry + callback scheduling |
| `/about/`, `/services/`, `/privacy-policy/` | static server components | — |
| `/api/inquiries`, `/api/inquiry-config` | `app/api/*/route.ts` | — |

`next.config.ts` sets `trailingSlash: true`, which keeps the directory-style URLs the site has
always used (`/about/`, `/property/?id=…`). A property's `sourceUrl` is `/property/?id=<id>` and a
guardrail test pins that shape.

Shared layers:

- **`lib/data.js`** — the single source of truth: 29 frozen property records, derived `cities`,
  and `featureSets` (which preference checkboxes appear per property type). Every record is built
  by the local `property()` helper, so all twelve feature flags exist on every property.
- **`lib/catalog.ts`** — the typed facade over the untyped modules (`Property`, `Search`, `Match`,
  `TYPE_LABELS`, `imageUrl`, `matchProperties`…). Components import from here, so the shapes are
  written down once. `imageUrl()` exists because records store `assets/x.webp` and `public/` serves
  it at `/assets/x.webp`.
- **`lib/seed-traits.js`** — generated sample feature data, merged in by `property()`. Deterministic
  (a hash of the property id seeds a mulberry32 PRNG), weighted per property type, and leaves ~20%
  of traits `null` so the unknown path stays exercised. An explicit `features` value on a record
  always wins, so real data can replace the seed one property at a time. These are **not**
  Deerfield's published facts; `/properties/` and the detail page say so.
- **`lib/seed-details.js`** — generated building specifics (asking rate, zoning, clear height,
  frontage, floors …), type-shaped so an industrial record never gets retail frontage.
  **Presentational only**: `lib/matcher.js` must never read `details`, or invented data would start
  deciding eligibility and ranking. A test enforces that.
- **`lib/seeded-random.js`** — the deterministic PRNG both seed modules share (FNV-1a hash into
  mulberry32), plus `intBetween`/`oneOf`/`roundedTo`.
- **`lib/callback-windows.js`** — pure model for callback availability (slot keys, merging
  contiguous slots into windows, email lines). **`lib/callback-schedule.ts`** adds the Eastern
  seven-day/business-hours calendar.
- **`lib/inquiry-format.js`** — the canonical subject/body rules shared with both review dialogs.
- **`lib/phone-format.js`** — live North American phone formatting (`(416) 262-6853`, `+1 …`).
  `formatPhone`/`caretAfterDigits` are pure and unit tested; `bindPhoneFormatting(input)` wires the
  listener and is wrapped by `components/phone-input.tsx`. Anything it cannot parse as a North
  American number is left exactly as typed.
- **`lib/matcher.js`** — pure scoring, no DOM.
- **`lib/search.ts`** — the wizard's search model: defaults, `localStorage` persistence and the
  derived copy that the results, summary and inquiry email share (`buildInquiry`).
- **`worker/index.js`** — `POST /api/inquiries` → Resend, and `GET /api/inquiry-config` so the
  review dialogs can show the real destination instead of a hardcoded address. It normalizes a
  trailing slash before matching and 404s anything else.

### The matching contract

`matchProperty()` runs hard constraints first, then weighted preferences, producing one of three
statuses that the whole UI is built around:

- `excluded` — a *confirmed* hard miss (wrong type, unavailable, size outside min/max, city miss
  when `locationMode === "hard"`). Score is `null`; never ranked with eligible results.
- `verification_required` — passes every hard constraint that is knowable, but at least one is
  unknown. Ranked, shown separately.
- `eligible` — everything confirmed.

**`null` means "not confirmed in the public listing" and must never count against a property.**
Unknown preferences carry `satisfaction: null` and are dropped from both numerator and denominator
of `normalizedScore()` — a property with only unknowns scores 100, not 0. Unknown hard constraints
downgrade to `verification_required` rather than excluding. Preserve this when adding fields: use
`null`, not `false`, for missing data.

Each evaluation carries a human-readable `reason` string; the UI renders those verbatim, so reasons
are user-facing copy.

### Inquiry flows (two paths, one endpoint)

1. **Wizard → `components/wizard/contact-modal.tsx`**: "Review before contacting" shows the form on
   the left and an **editable** email on the right (`#packet-subject`, `#packet-body`). The editor is
   regenerated from the form until the visitor edits it, after which their text wins and only
   "Reset to generated draft" resyncs it (`edited` state). All three actions — send, open in email
   app, copy — read `finalInquiry()`, i.e. the editor's text through `enforceSubject`/`enforceBody`,
   never `buildInquiry()` directly. The mailto fallback copies instead past ~7,800 characters.
2. **Contact page → `components/contact-form.tsx`**: posts JSON to `/api/inquiries`, which relays via
   Resend to `INQUIRY_RECIPIENT` (falling back to `DEFAULT_RECIPIENT`) with a forced `[DEERFIELD]`
   subject prefix and the visitor's address as `reply_to`. A `website` field is a honeypot:
   non-empty means silently return `{ ok: true }` without sending. `submissionId` becomes the Resend
   idempotency key.

   The dialog is meant to be a faithful preview, which constrains both sides: `enforceSubject()` in
   `lib/inquiry-format.js` and the subject block in `worker/index.js` must produce identical output,
   and both **strip the prefix before truncating** so the rule is idempotent — truncating first makes
   a long subject shrink again on every pass. A test in `tests/worker.test.mjs` feeds the client's
   output through the Worker and fails if the Worker alters it.

### Dialogs

Every `<dialog>` is driven by a React `open` prop: an effect calls `showModal()`/`close()`, and
**every close path calls `onClose()`** (the parent's state setter) rather than `element.close()`.
Do not go back to `onClose={onClose}` on the element and a bare `element.close()` in handlers — the
native `close` event is not a reliable round-trip back into React state, and when it is missed the
parent's `open` stays `true` and the modal will never reopen. `onCancel` handles Escape
(`preventDefault()` then `onClose()`). The wizard's contact packet is unmounted while closed, so
each opening starts fresh; the callback selection deliberately lives one level up in `DealDesk` so
it survives that remount. `tests/send-button.test.mjs` pins this pattern.

## Conventions the tests enforce

`tests/local-site.test.mjs` is a guardrail suite over the shipped source, not a unit test. It fails
the build if you:

- add any `deerfieldbrokerage.com` URL to a shipped file — the site is a fully local mirror;
- change the property count away from 29, or add a record whose `image` is missing from `public/`;
- point a property's `sourceUrl` anywhere other than `/property/?id=`;
- remove element ids the flows depend on (`contact-property-toggle`, `callback-availability`,
  `email-review-subject`, `wizard-subject`, …);
- reach for React or the DOM inside `lib/`;
- let `lib/matcher.js` mention `details`.

Other repo conventions:

- The visual language in `app/styles.css` is modelled on mainstream property/brokerage sites
  (LoopNet, Zillow, CBRE, JLL), not an editorial look: one platform sans stack (`--font`), bold sans
  headings at corporate sizes, sentence-case labels, a full-bleed 64px header bar, a 1280px column,
  44px controls, and three corner radii (`--radius-sm` 4px controls, `--radius` 6px cards,
  `--radius-lg` 8px dialogs) with 1px borders and 1px shadows. Keep new UI inside those tokens; do
  not reintroduce serif display type, tracked uppercase eyebrows, arrow glyphs in button copy, or
  large blurred shadows. The palette is sage-on-cream (`--primary #456a3d`, `--bg #fbfcfa`).
- Motion lives at the end of `app/styles.css` and only answers pointer or action: hover lifts, a nav
  underline, a one-shot `rise-in` for wizard steps/results/dialogs, and the sent confirmation. Both
  inquiry paths render the send button through `components/send-button.tsx` (`state`: idle → sending
  → error) — never set its text directly — and on success show `<SentConfirmation/>`: a centred
  `#sent-dialog` in which the paper plane flies for `FLIGHT_MS` (1s), then "Sent!" appears; it
  dismisses on click, Escape or after a short linger. `lib/sent-timing.js` holds that timing and
  `tests/send-button.test.mjs` pins it. The `prefers-reduced-motion` block at the top of the
  stylesheet zeroes every duration, so new animations need no extra guard.
- Theme: `lib/theme.ts` exports `THEME_BOOT`, an inline script the root layout puts in `<head>` so
  `data-theme` is stamped before paint (no flash). The choice persists under `deerfield-theme`, and
  `components/theme-toggle.tsx` syncs after mount because the server cannot know it.
- Wizard state persists to `localStorage` under `deerfield-search-v1` (versioned; `loadSearch()`
  discards other versions) and is applied in an effect after hydration, so never render it during
  SSR. A `#results` hash reopens the results the visitor was looking at.
- `components/wizard/deal-desk.tsx` registers two WebMCP tools on `document.modelContext` when
  present (`configure_property_search`, `show_property_matches`). Both are explicitly non-sending:
  agents can stage a search and display matches but cannot contact the brokerage.
- Callback scheduling (`components/callback-picker.tsx`) is pinned to `America/Toronto` business
  hours and computed from `Intl` parts, not local time. Two input modes write the same Set of
  `YYYY-MM-DD|HH:MM` keys — a drag-to-paint grid and a range builder ("list view") — so either can
  be edited without the other losing state. The picker shows **one week at a time**
  (`callbackDays(weekOffset)`, up to `CALLBACK_WEEKS`), so the summary chips and the email lines
  must be built from `daysFromSelection(selected)` — passing only the visible week silently drops
  windows chosen in another week, which `tests/callback-windows.test.mjs` pins. `mode` is `"auto"` on the contact page (grid for a
  mouse, list for a thumb, following `matchMedia("(pointer: coarse), (max-width: 720px)")` until the
  visitor overrides it) and `"list"` in the wizard's modal, whose form column is too narrow for the
  grid to lead. Pointer painting calls `preventDefault()`, so a cell's `onChange` only fires for
  keyboard toggles; the grid captures the pointer and tracks the live selection in a ref, because
  pointer moves outrun re-renders.
- The listing photo is a link to that property's detail page (`.card-photo-link`) on both the
  portfolio grid and the results cards, with the "View property details" text link kept alongside as
  the affordance that reads in a screen reader.
- `next dev` re-adds a `<!-- BEGIN:nextjs-agent-rules -->` block at the end of this file. Commit it
  with your work rather than deleting it.

## Deployment

Vercel auto-detects Next.js, so `vercel.json` carries no build, output or install configuration —
only which branch deploys to production. `RESEND_API_KEY`, `RESEND_FROM_EMAIL` and
`INQUIRY_RECIPIENT` live in Project Settings → Environment Variables. `worker/vercel-env.js` names
each variable explicitly rather than passing `process.env` through, because build-time inlining only
recognises statically analyzable `process.env.NAME` references.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
