# Medspot

A community drug store & hospital finder — see what's nearby, what they stock, and whether they're open, all on a map.

This is a **front-end prototype**: a single self-contained HTML file with mock data, built to demo the idea before any backend work starts.

## Features

A phone-frame, multi-screen app with bottom navigation:

- **Home** — search bar, quick shortcuts (Pharmacies / Hospitals / Emergency / Search), an urgent-care banner, "Open near you" list, and health tip cards
- **Find** — search by drug or service (matches highlight), filter by type and radius (1–5 km), toggle between a card list and an interactive map (Leaflet + OpenStreetMap)
- **Location Details** — address, hours, phone, rating, full stock list, and Call / Get Directions buttons
- **Saved** — bookmark locations from their detail screen
- **Profile** — placeholder screen

All data is mocked in `docs/index.html` — no backend yet.

## Run it locally

No build step or install needed — it's one HTML file.

1. Download or clone this repo
2. Open `docs/index.html` in any browser

That's it.

## Deploy for free with GitHub Pages

1. Push this repo to GitHub (see below)
2. On GitHub, go to **Settings → Pages**
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`
4. Set **Branch** to `main` and folder to `/docs`, then **Save**
5. GitHub gives you a live URL a minute or two later (usually `https://<username>.github.io/medspot/`)

## Next steps (not built yet)

- Real geolocation instead of a fixed demo location
- Accounts so pharmacies/hospitals can edit their own stock listings
- A real backend + database instead of the mock data in `index.html`

## Tech

Plain HTML/CSS/JS, [Leaflet.js](https://leafletjs.com/) for the map, [OpenStreetMap](https://www.openstreetmap.org/) tiles. No frameworks, no build tools.

## License

MIT — see [LICENSE](LICENSE).
