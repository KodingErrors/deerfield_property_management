# Deerfield Deal Desk

Guided commercial-property discovery for Deerfield Brokerage, built with Next.js (App Router) and React. Prospects can separate hard requirements from weighted preferences, review explainable matches against Deerfield's public portfolio, compare properties, and prepare a structured email inquiry they review before it is sent.

## What it does

- 29-property public portfolio snapshot with explicit unknown-data handling
- four-step requirements wizard with a persistent, versioned saved search
- hard property-type, availability, location, and size constraints
- weighted location, ideal-size, and feature preferences
- explainable ranking, exclusions, comparison, and contact handoff
- callback scheduling in Eastern business hours, as a paint grid or a list of windows
- an inquiry email the visitor can edit in place before sending
- device-aware light/dark theme with a persistent manual override
- responsive, keyboard-accessible interface
- local About, Services, Properties, property-detail, Contact, and Privacy pages with no outbound Deerfield website links
- all 29 public portfolio photographs packaged as local site assets
- WebMCP tools for staging a search and displaying matches (never for sending)
- server-side inquiry delivery through Resend, with the destination set per environment
- free deployment on Vercel

## Layout

| Path | What lives there |
| --- | --- |
| `app/` | App Router pages and the two API route handlers. `app/styles.css` is the whole design system. |
| `components/` | The React UI: site chrome, the wizard, the portfolio, both inquiry flows. |
| `lib/` | Framework-free logic — portfolio data, the matcher, inquiry formatting, callback and phone helpers. Imported by the app *and* by the tests under plain node. |
| `worker/` | The only server code: `POST /api/inquiries` → Resend and `GET /api/inquiry-config`. |
| `public/` | Listing photographs and the favicon. |
| `tests/` | `node:test` suites, including a guardrail suite over the shipped source. |

## Local development

```powershell
npm install
npm run dev          # http://localhost:3000
```

For the contact form to actually deliver, put your Resend values in `.env.local` (git-ignored);
`.env.example` documents the three names. Without `RESEND_API_KEY` the site runs normally and the
send button reports that delivery is still being configured.

```powershell
npm run build        # production build
npm start            # serve the production build
```

## Deployment

Vercel auto-detects Next.js: no build, output or install configuration is needed, and
`vercel.json` only pins which branch deploys to production. Import the repository at vercel.com,
then set three environment variables under Project Settings → Environment Variables:
`RESEND_API_KEY`, `RESEND_FROM_EMAIL` and `INQUIRY_RECIPIENT`. Copy the names and shapes from
`.env.example`.

Resend's free tier sends 3,000 emails a month. Without a verified domain it will only send *from*
`onboarding@resend.dev` and only *to* the address that owns the Resend account, so create that
account with the same address you set as `INQUIRY_RECIPIENT`. Sending anywhere else requires
verifying a domain.

`INQUIRY_RECIPIENT` can be changed from the Vercel dashboard without redeploying; if it is
missing or malformed the Worker falls back to the address in `lib/inquiry-format.js`.

## Verification

```powershell
npm run test:p0      # matcher, callback windows, phone format, send timing, guardrails, worker
npm run check        # tsc --noEmit
npm run build        # catches server/client component mistakes
```

The wizard and the contact page both send through `/api/inquiries`, and both show the exact
recipient, sender and subject the server will use before anything leaves the browser. The wizard
additionally offers "Open in email app" and "Copy inquiry" for visitors who would rather send it
themselves.

Property features and building specifications are generated sample data
(`lib/seed-traits.js`, `lib/seed-details.js`), not information published by Deerfield; the
portfolio and property pages say so. Adding an explicit `features` or `details` value to a record
in `lib/data.js` overrides the generated one.
