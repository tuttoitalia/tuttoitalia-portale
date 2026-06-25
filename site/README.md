# Italians.ch — Homepage restyle 2026

Static, framework-free implementation of the *“Italians.ch Home – restyle 2026”*
design (editorial 2026 layout: cream + verde Italia + oro, Playfair + Inter).

This is a **single static page** — no build step, no server-side code, no database.
That choice is deliberate and serves every requirement that was set out:

| Requirement | How it’s met |
|---|---|
| **Velocità (desktop + mobile)** | Pre-rendered HTML, ~6 KB of JS, system + Google fonts. Nothing to “boot”. |
| **SEO + ricercabile (Google, ChatGPT…)** | All content is real HTML; `<title>`/meta/Open Graph/Twitter tags; JSON-LD structured data (`NewsMediaOrganization` + `WebSite` w/ search action); `sitemap.xml`; `robots.txt` that explicitly allows AI crawlers (GPTBot, ClaudeBot, PerplexityBot, …). |
| **Sicurezza** | No backend = almost no attack surface. Strict Content-Security-Policy (scripts self-hosted only), `X-Frame-Options`, `nosniff`, HSTS — see `_headers`. |
| **1 milione di utenti senza crash** | Static files scale ~infinitely on a CDN. The free tiers of GitHub Pages / Cloudflare Pages / Netlify already do this. |
| **Piattaforme gratuite / sul tuo computer** | Runs locally with one command; deploys free to any static host. |
| **Responsive / mobile** | Fluid layout with breakpoints at 1080 / 860 / 600 / 420 px; the desktop-only prototype is now fully usable on phones. |

## Run it on your computer

No installation needed — just serve the `site/` folder. Pick whichever you have:

```bash
# Python (pre-installed on macOS/Linux)
cd site && python3 -m http.server 8080

# Node
npx serve site

# PHP
php -S localhost:8080 -t site
```

Then open <http://localhost:8080>. (Opening `index.html` directly also works,
but a local server is closer to production.)

## Deploy free, at scale

- **Cloudflare Pages / Netlify:** point it at this repo, set the publish
  directory to `site/`. `_headers` is applied automatically.
- **GitHub Pages:** serve `site/` (or move its contents to the repo root / `docs/`).

For **Nginx/Apache** on your own dedicated server, replicate the headers from
`_headers` in the server config, and serve the folder as static files behind
HTTPS (e.g. Let’s Encrypt). Putting Cloudflare in front gives you the CDN +
DDoS protection for free.

## Two surfaces

- **`index.html` — il Quotidiano** (homepage editoriale): news, eventi, cinema,
  motori/turismo, reader modal, newsletter.
- **`portale.html` — il Portale** (app/community), che implementa la strategia a
  *flywheel*:
  - **Servizi che catturano l'utente** (gratis): Incontri, Lavoro, Mercatino,
    Immobiliare in Italia, Concorsi & Premi.
  - **Registrazione → account** (first-party data): login/registrazione reali
    lato client (localStorage), con stato condiviso tra le due pagine.
  - **Stile di vita mediterraneo** (monetizzazione): Sport & CONI, Benessere,
    Alimentazione mediterranea, Beauty, e **Membership** (Gratuito vs Membro).

## What’s interactive

Both pages read fine with JavaScript disabled (progressive enhancement). With JS:
live clock, language switch, section-nav highlight, article reader modal, and the
newsletter form. The **account system** (`account.js`) adds: register/login modal,
session persistence, an avatar chip in the utility bar, and **content gating** —
locked sections (e.g. profili Incontri) and actions (Candidati, Vendi, Partecipa,
Diventa Membro) prompt registration, then unlock with a confirmation toast.

> Note: auth is client-side only (localStorage) for the static demo. Swap
> `storeUser()/findUser()` in `account.js` for real API calls to go to production.

## Files

```
site/
├── index.html              # Quotidiano (homepage, SEO-rich)
├── portale.html            # Portale (servizi + lifestyle + account)
├── pubblicita.html         # Media kit + Area Agenzie + prenotazione spazi
├── gestione.html           # Admin: gestione banner pubblicitari
├── case-vacanze.html       # Italians.ch Stays — UI in stile Airbnb (case in Italia)
├── assets/css/styles.css   # base styling + responsive + print
├── assets/css/portale.css  # portal/components (auth modal, buttons, toast, ads, cards)
├── assets/css/airbnb.css   # Airbnb design tokens & components (Stays)
├── assets/js/main.js       # homepage interactivity
├── assets/js/portale.js    # portal chrome (clock, nav scroll-spy)
├── assets/js/account.js    # shared auth/account/gating/toast
├── assets/js/ads.js        # ad engine (slots, rotation, house promo)
├── assets/js/gestione.js   # banner manager CRUD
├── assets/js/pubblicita.js # booking form
├── assets/js/airbnb.js     # Stays listings, wishlist, detail overlay
├── assets/                 # favicon set, PWA icons, OG cover
├── robots.txt · sitemap.xml · site.webmanifest · _headers
```

> `case-vacanze.html` ("Italians.ch Stays") riproduce fedelmente il design system
> di Airbnb (canvas bianco, accento Rausch #ff385c, search pill, griglia foto,
> rating 64px, reservation card). Riferimento: `../DESIGN-airbnb.md`, generato con
> `npx getdesign@latest add airbnb`.

## Notes / next steps

- The article images are **placeholder gradients** with text labels, exactly as
  in the design prototype. Swap them for real photos (`<img>` with `width`,
  `height`, `loading="lazy"`, descriptive `alt`) when available.
- `og:image` / favicons reference `assets/og-cover.png` and icons that aren’t
  bundled yet — add a 1200×630 cover image and PWA icons before going live.
- When real article pages exist, give each its own URL + `NewsArticle` JSON-LD
  and expand `sitemap.xml`.
