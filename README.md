# Medsoft

Find open pharmacies and hospitals near you, see what they have in stock, call them, and get directions.
Static site (HTML, CSS, JavaScript modules) with Supabase for data, accounts and saved places. No build step.

## Project structure

```
index.html                 App shell: the five screens (home, find, detail, saved, profile)
manifest.webmanifest       Lets people add the app to their home screen
assets/favicon.svg
css/
  base.css                 Colour tokens (light + dark), reset, phone frame
  components.css           Buttons, cards, pills, nav bar, forms, toast
  screens.css              Screen-specific layout
js/
  config.js                ← The only file you edit to connect Supabase
  app.js                   Entry point: boot, click handling, auth, saving, location
  router.js                Hash routes: #/home  #/find  #/detail/3  #/saved  #/profile
  store.js                 Shared app state
  api.js                   All Supabase reads/writes (falls back to demo data)
  supabase-client.js       Creates the Supabase client (loaded only when configured)
  utils.js                 Distance, opening hours, escaping, geolocation, links
  icons.js                 SVG icons
  seed-data.js             Sample Lilongwe facilities for demo mode
  components/              cards.js, navbar.js, toast.js
  screens/                 home.js, find.js, map.js, detail.js, saved.js, profile.js
supabase/
  schema.sql               Tables, security rules (RLS), triggers
  seed.sql                 The 8 sample Lilongwe facilities
```

## 1. Put it on GitHub Pages

1. Copy everything in this folder to the root of your repository and push.
2. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, pick `main` and `/ (root)`.
3. Open `https://<your-username>.github.io/<repo-name>/`.

Until Supabase is connected, the app runs in **demo mode** on sample data and keeps saved places in the browser.

## 2. Connect Supabase

1. Create a project at supabase.com.
2. **SQL Editor → New query**, paste `supabase/schema.sql`, click **Run**.
3. New query again, paste `supabase/seed.sql`, click **Run** (optional sample data).
4. **Project Settings → API**: copy the **Project URL** and the **anon / publishable key** into `js/config.js`:
   ```js
   SUPABASE_URL: 'https://abcdefghijkl.supabase.co',
   SUPABASE_ANON_KEY: 'eyJhbGciOi...',
   ```
   The anon key is meant to be public; Row Level Security in `schema.sql` protects the data.
   **Never commit the `service_role` / secret key.**
5. **Authentication → URL Configuration**: set **Site URL** to your GitHub Pages address and add it under **Redirect URLs**, so email confirmation links come back to the app.
6. Commit and push `js/config.js`.

By default Supabase asks new users to confirm their email before they can sign in. To turn that off while testing: **Authentication → Providers (Sign In / Providers) → Email → Confirm email**.

## Managing facilities

Add or edit pharmacies and hospitals in **Table Editor → facilities**:

| Column | Notes |
| --- | --- |
| `type` | `pharmacy` or `hospital` |
| `lat`, `lng` | Decimal coordinates (right-click a spot in Google Maps / OSM to copy) |
| `is_24h` | `true` for 24-hour places; then hours are ignored |
| `open_time`, `close_time` | Local Malawi time, e.g. `07:30` and `19:00`. Overnight works (`20:00` → `06:00`) |
| `stock` | List of medicines/services, e.g. `{Paracetamol,Insulin}` |
| `is_active` | Set `false` to hide a place without deleting it |

"Open now" is worked out live from the hours, in the `TIMEZONE` set in `config.js`.
The public can only **read** facilities; editing is done from the dashboard.

## Run locally

JavaScript modules don't load from `file://`, so use a small server:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Location needs `https` or `localhost`. If someone declines location access the app uses `DEFAULT_LOCATION` from `config.js`.
