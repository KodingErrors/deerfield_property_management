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
- owner-private zero-cost Sites deployment configuration

## Local preview

The production artifact is the zero-build static site declared in `.openai/hosting.json`.

```powershell
python -m http.server 4173 --directory dist
```

Open `http://127.0.0.1:4173`.

## Verification

```powershell
npm run test:p0
node --check dist/app.js
node --check dist/data.js
node --check dist/matcher.js
```

The inquiry button opens the visitor's email client with a prepared draft. The website never claims that an inquiry was sent.
