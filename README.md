# Deerfield Deal Desk

Guided commercial-property discovery for Deerfield Brokerage. Prospects can separate hard requirements from weighted preferences, review explainable matches against Deerfield's public portfolio, compare properties, and prepare a structured email inquiry.

## P0 implementation

- 29-property public portfolio snapshot with explicit unknown-data handling
- four-step requirements wizard
- hard property-type, availability, location, and size constraints
- weighted location, ideal-size, and feature preferences
- explainable ranking, exclusions, comparison, and contact handoff
- device-aware light/dark theme with a persistent manual override
- responsive keyboard-accessible interface
- official About, Services, Properties, and Contact navigation with a descriptive mobile drawer
- local About, Services, portfolio, property-detail, Contact, and Privacy pages with no outbound Deerfield website links
- all 29 public portfolio photographs packaged as local site assets
- WebMCP tools for staging a search and displaying matches
- server-side inquiry delivery through Resend, with the destination set per environment
- free deployment on Vercel (static site plus two edge functions)

## Local preview

The pages are zero-build ES modules, so they can be served straight from `dist`. The contact
form's `/api/inquiries` route is absent in this mode and the review dialog falls back to its
built-in recipient.

```powershell
python -m http.server 4173 --directory dist
```

Open `http://127.0.0.1:4173`.

To run the API as well, use the local Worker. `.dev.vars` in the project root holds the secrets
(git-ignored; the build copies it next to the generated Worker config). Paste your Resend key
into it — `.env.example` documents the same three variables — then:

```powershell
npm start
```

(`npm run dev` is an alias.) Open `http://127.0.0.1:8787`. The startup banner lists the variables it picked up. Without a
`RESEND_API_KEY` the site runs normally and the send button reports that delivery is still being
configured.

`npm start` rebuilds before serving, and Windows keeps a lock on `dist/client` while a server is
running, so stop any previous `npm start` first. If a stale `workerd.exe` survives a crash the
build says so by name rather than failing with a bare `EBUSY`.

## Deployment

`npm run build` writes the static site to `dist/client` and a Worker bundle to `dist/server`.
The committed configuration targets Vercel's free Hobby tier:

- `vercel.json` publishes `dist/client` and builds with `npm run build`.
- `api/inquiries.js` and `api/inquiry-config.js` are edge functions that delegate to
  `worker/index.js`, so the handler is not duplicated per platform.

Import the repository at vercel.com, then set three environment variables under Project
Settings > Environment Variables: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` and `INQUIRY_RECIPIENT`.
Copy the names and shapes from `.env.example`.

The install step is skipped on purpose: the build script and both edge functions use only local
files and Node builtins. The one dev dependency, `wrangler`, exists only for `npm start`. If a
future change adds a runtime dependency, set `installCommand` back to `npm install` in `vercel.json`.

Resend's free tier sends 3,000 emails a month. Without a verified domain it will only send
*from* `onboarding@resend.dev` and only *to* the address that owns the Resend account, so create
that account with the same address you set as `INQUIRY_RECIPIENT`. Sending to any other address
requires verifying a domain.

`INQUIRY_RECIPIENT` can be changed at any time from the host's dashboard without redeploying;
if it is missing or malformed the Worker falls back to the address in `dist/inquiry-format.js`.

## Verification

```powershell
npm run test:p0
npm run check
```

The wizard's inquiry button opens the visitor's email client with a prepared draft and never
claims that an inquiry was sent. The contact page sends through Resend instead, and its review
dialog shows the exact recipient, sender and subject the server will use.

Property features are generated sample data (`dist/seed-traits.js`), not information published by
Deerfield. The portfolio and property pages say so. Adding a real `features` value to a record in
`dist/data.js` overrides the generated one.
