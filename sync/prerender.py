# -*- coding: utf-8 -*-
"""
Italians.ch — pre-rendering SEO/GEO.
Genera una pagina HTML statica per ogni articolo in site/news/<slug>/index.html,
con contenuto reale + meta + Open Graph + hreflang + JSON-LD (NewsArticle +
BreadcrumbList). I contenuti diventano crawlabili da Google e dalle AI senza JS.
Rilanciabile a ogni sync. Uso: python sync/prerender.py
"""
import os, re, json, glob, html
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.normpath(os.path.join(HERE, "..", "site"))
DATA_A = os.path.join(SITE, "data", "a")
OUT_ROOT = os.path.join(SITE, "news")
BASE = "https://italians.ch"
ASSET_V = "20260630h"

LANGS = ["it", "de", "fr", "en"]
OG_LOCALE = {"it": "it_CH", "de": "de_CH", "fr": "fr_CH", "en": "en_US"}

T = {
    "it": {"home": "Home", "by": "di", "related": "Continua a leggere", "back": "Torna alla home",
           "tagline": "Il nuovo media italiano in Svizzera", "since": "Dal 2003",
           "motto": "L'Italia, ovunque siano gli italiani.", "adv": "Pubblicità",
           "search": "Cerca", "sections": "Sezioni", "read": "Leggi", "published": "Pubblicato il"},
    "de": {"home": "Home", "by": "von", "related": "Weiterlesen", "back": "Zur Startseite",
           "tagline": "Das neue italienische Medium in der Schweiz", "since": "Seit 2003",
           "motto": "Italien, wo immer Italiener sind.", "adv": "Werbung",
           "search": "Suche", "sections": "Rubriken", "read": "Lesen", "published": "Veröffentlicht am"},
    "fr": {"home": "Accueil", "by": "par", "related": "À lire aussi", "back": "Retour à l'accueil",
           "tagline": "Le nouveau média italien en Suisse", "since": "Depuis 2003",
           "motto": "L'Italie, où que soient les Italiens.", "adv": "Publicité",
           "search": "Rechercher", "sections": "Rubriques", "read": "Lire", "published": "Publié le"},
    "en": {"home": "Home", "by": "by", "related": "Keep reading", "back": "Back to home",
           "tagline": "The new Italian media in Switzerland", "since": "Since 2003",
           "motto": "Italy, wherever Italians are.", "adv": "Advertisement",
           "search": "Search", "sections": "Sections", "read": "Read", "published": "Published on"},
}

# categorie: key -> etichette per lingua (per la nav)
CATS = [
    ("attualita",   {"it": "Attualità", "de": "Aktuelles", "fr": "Actualité", "en": "News"}),
    ("cinema",      {"it": "Cinema", "de": "Kino", "fr": "Cinéma", "en": "Cinema"}),
    ("eventi",      {"it": "Eventi", "de": "Events", "fr": "Événements", "en": "Events"}),
    ("gastronomia", {"it": "Gastronomia", "de": "Gastronomie", "fr": "Gastronomie", "en": "Food"}),
    ("imprese",     {"it": "Imprese", "de": "Unternehmen", "fr": "Entreprises", "en": "Business"}),
    ("motori",      {"it": "Motori", "de": "Motor", "fr": "Moteurs", "en": "Motors"}),
    ("musica",      {"it": "Musica", "de": "Musik", "fr": "Musique", "en": "Music"}),
    ("sport",       {"it": "Sport", "de": "Sport", "fr": "Sport", "en": "Sport"}),
    ("turismo",     {"it": "Turismo", "de": "Tourismus", "fr": "Tourisme", "en": "Tourism"}),
    ("wellness",    {"it": "Wellness & Salute", "de": "Wellness & Gesundheit", "fr": "Bien-être & Santé", "en": "Wellness & Health"}),
]

MONTHS = {
    "it": ["", "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"],
    "de": ["", "Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
    "fr": ["", "janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
    "en": ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
}


def esc(s):
    return html.escape("" if s is None else str(s), quote=True)


def strip_html(s):
    s = re.sub(r"<[^>]+>", " ", s or "")
    s = html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


def clip(s, n=158):
    s = strip_html(s)
    if len(s) <= n:
        return s
    cut = s[:n].rsplit(" ", 1)[0].rstrip(",.;:—- ")
    return cut + "…"


def parse_dt(iso):
    if not iso:
        return None
    try:
        return datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except Exception:
        return None


def fmt_date(iso, lang):
    dt = parse_dt(iso)
    if not dt:
        return ""
    m = MONTHS.get(lang, MONTHS["it"])[dt.month]
    if lang == "en":
        return "%s %d, %d" % (m, dt.day, dt.year)
    return "%d %s %d" % (dt.day, m, dt.year)


def cat_label(slug, lang):
    for key, labels in CATS:
        if key == slug:
            return labels.get(lang, labels["it"])
    return slug.capitalize() if slug else ""


def url_for(slug):
    return "%s/news/%s/" % (BASE, slug)


def nav_html(lang):
    t = T[lang]
    items = ['<a class="navitem" href="/?lang=%s">%s</a>' % (lang, esc(t["home"]))]
    for key, labels in CATS:
        items.append('<a class="navitem" href="/?cat=%s&amp;lang=%s">%s</a>' % (key, lang, esc(labels[lang])))
    return "\n        ".join(items)


def lang_links(art, all_by_slug):
    """Link IT/EN/DE/FR: alla versione tradotta se esiste, altrimenti alla home in quella lingua."""
    versions = art.get("versions") or {}
    cur = art.get("lang", "it")
    out = []
    for lg in ["it", "en", "de", "fr"]:
        if lg == cur:
            href = url_for(art["slug"])
            pressed = "true"
        elif versions.get(lg) and versions[lg] in all_by_slug:
            href = url_for(versions[lg])
            pressed = "false"
        else:
            href = "/?lang=%s" % lg
            pressed = "false"
        out.append('<a class="lang" href="%s" aria-pressed="%s">%s</a>' % (esc(href), pressed, lg.upper()))
    return "\n          ".join(out)


def hreflang_tags(art, all_by_slug):
    versions = art.get("versions") or {}
    cur = art.get("lang", "it")
    tags = []
    pairs = {cur: art["slug"]}
    for lg, sl in versions.items():
        if sl in all_by_slug:
            pairs[lg] = sl
    for lg, sl in pairs.items():
        tags.append('<link rel="alternate" hreflang="%s" href="%s">' % (lg, url_for(sl)))
    # x-default -> versione italiana se c'è, altrimenti la corrente
    xd = pairs.get("it", art["slug"])
    tags.append('<link rel="alternate" hreflang="x-default" href="%s">' % url_for(xd))
    return "\n  ".join(tags)


def related_cards(art, by_cat, all_by_slug):
    lang = art.get("lang", "it")
    key = (lang, art.get("categorySlug"))
    pool = [a for a in by_cat.get(key, []) if a["slug"] != art["slug"]]
    pool = pool[:3]
    if not pool:
        return ""
    cards = []
    for a in pool:
        img = a.get("thumb") or a.get("image") or ""
        cards.append(
            '<a class="card" href="%s">'
            '<div class="card__media tile" style="background-image:url(%s);background-size:cover;background-position:center"></div>'
            '<div class="card__body">'
            '<div class="kicker">%s</div>'
            '<h3>%s</h3>'
            '</div></a>' % (esc(url_for(a["slug"])), esc(img), esc(cat_label(a.get("categorySlug"), lang)), esc(a.get("title")))
        )
    t = T[lang]
    return (
        '<section class="related">'
        '<div class="block-head"><h2>%s</h2></div>'
        '<div class="cards3">%s</div>'
        '</section>' % (esc(t["related"]), "".join(cards))
    )


def jsonld(art):
    lang = art.get("lang", "it")
    dt = parse_dt(art.get("date"))
    iso = dt.isoformat() if dt else ""
    img = art.get("image") or art.get("thumb") or ""
    gallery = [g for g in (art.get("gallery") or []) if g]
    images = [img] + [g for g in gallery if g != img]
    images = [i for i in images if i][:6]
    node_article = {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        "mainEntityOfPage": {"@type": "WebPage", "@id": url_for(art["slug"])},
        "headline": strip_html(art.get("title"))[:110],
        "description": clip(art.get("subtitle"), 200),
        "image": images or [BASE + "/og-cover.png"],
        "datePublished": iso,
        "dateModified": iso,
        "inLanguage": lang,
        "articleSection": art.get("category") or "",
        "keywords": ", ".join(art.get("tags") or []),
        "author": {"@type": "Person", "name": art.get("author") or "Italians.ch"},
        "publisher": {
            "@type": "Organization",
            "name": "Italians.ch",
            "logo": {"@type": "ImageObject", "url": BASE + "/assets/icon-512.png", "width": 512, "height": 512},
        },
    }
    crumbs = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": T[lang]["home"], "item": BASE + "/"},
            {"@type": "ListItem", "position": 2, "name": art.get("category") or "", "item": "%s/?cat=%s&lang=%s" % (BASE, art.get("categorySlug") or "", lang)},
            {"@type": "ListItem", "position": 3, "name": strip_html(art.get("title"))},
        ],
    }
    dump = lambda o: json.dumps(o, ensure_ascii=False, separators=(",", ":"))
    return ('<script type="application/ld+json">%s</script>\n'
            '  <script type="application/ld+json">%s</script>') % (dump(node_article), dump(crumbs))


def gallery_html(art):
    gallery = [g for g in (art.get("gallery") or []) if g]
    main = art.get("image") or art.get("thumb")
    extra = [g for g in gallery if g != main]
    if len(extra) < 2:
        return ""
    figs = "".join(
        '<img src="%s" alt="%s" loading="lazy">' % (esc(g), esc(art.get("title")))
        for g in extra[:6]
    )
    return '<div class="art-gallery">%s</div>' % figs


PAGE = """<!doctype html>
<html lang="{lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title_txt} — Italians.ch</title>
  <meta name="description" content="{desc}">
  <meta name="author" content="{author}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="canonical" href="{url}">
  {hreflang}

  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Italians.ch">
  <meta property="og:locale" content="{og_locale}">
  <meta property="og:url" content="{url}">
  <meta property="og:title" content="{title_attr}">
  <meta property="og:description" content="{desc}">
  <meta property="og:image" content="{image}">
  <meta property="article:published_time" content="{iso}">
  <meta property="article:section" content="{category}">
  {og_tags}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{title_attr}">
  <meta name="twitter:description" content="{desc}">
  <meta name="twitter:image" content="{image}">
  <meta name="theme-color" content="#15110F">

  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/assets/favicon.ico" sizes="48x48">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,700;0,900;1,400;1,700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/styles.css?v={v}">
  <link rel="stylesheet" href="/assets/css/portale.css?v={v}">
  <link rel="stylesheet" href="/assets/css/vodafone.css?v={v}">

  {jsonld}

  <style>
    .art-hero{{width:100%;height:auto;border-radius:12px;margin:6px 0 22px;display:block}}
    .art-gallery{{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin:26px 0}}
    .art-gallery img{{width:100%;height:180px;object-fit:cover;border-radius:10px;display:block}}
    .breadcrumb{{font-size:13px;color:var(--gray,#6b6b6b);margin:26px 0 4px}}
    .breadcrumb a{{color:inherit;text-decoration:none}}
    .breadcrumb a:hover{{text-decoration:underline}}
    .art-tags{{margin:26px 0 0;display:flex;flex-wrap:wrap;gap:8px}}
    .art-tags span{{font-size:12px;padding:6px 12px;border:1px solid var(--line,#e6e0d2);border-radius:999px;color:var(--gray,#6b6b6b)}}
  </style>
</head>
<body>
  <div class="utility">
    <div class="container utility__inner">
      <div class="utility__meta">
        <span class="utility__temp">{tagline}</span>
      </div>
      <div class="utility__actions">
        <a class="utility__link" href="/portale.html">Portale</a>
        <span class="utility__divider">|</span>
        <div class="langs" role="group" aria-label="Lingua">
          {lang_links}
        </div>
      </div>
    </div>
  </div>

  <header class="container masthead">
    <div class="masthead__side masthead__tagline-left">
      <div class="masthead__since">{since}</div>
      <div>{tagline}</div>
    </div>
    <div class="masthead__center">
      <a href="/?lang={lang}" class="wordmark" aria-label="Italians.ch — home">Italians<span class="tld">.ch</span></a>
      <div class="masthead__motto">{motto}</div>
    </div>
    <div class="masthead__side masthead__search">
      <form class="search" role="search" action="/" method="get">
        <input type="search" name="s" placeholder="{search}" aria-label="{search}">
      </form>
    </div>
  </header>

  <nav class="sectionnav" aria-label="{sections}">
    <div class="container sectionnav__inner">
        {nav}
    </div>
  </nav>

  <main>
    <div class="article-wrap">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="/?lang={lang}">{home}</a> › <a href="/?cat={cat_slug}&amp;lang={lang}">{category}</a>
      </nav>
      <article class="reader__content article-page">
        <div class="kicker">{category}</div>
        <h1 class="reader__title">{title_h1}</h1>
        <p class="reader__deck">{subtitle}</p>
        <div class="reader__meta"><span>{by} {author}</span><span>{date_h}</span></div>
        <img class="art-hero" src="{image}" alt="{title_attr}" width="1200" height="675">
        <div class="reader__body">{body}</div>
        {gallery}
        {tags_html}
      </article>
      {related}
    </div>
  </main>

  <footer class="footer">
    <div class="footer__top">
      <div>
        <div class="wordmark">Italians<span class="tld">.ch</span></div>
        <div class="footer__motto">{motto}</div>
        <div class="footer__meta">Italians.ch · Zurigo · {since}</div>
      </div>
    </div>
    <div class="footer__rule"></div>
    <div class="footer__legal">
      <span>© 2026 Italians.ch</span>
      <span><a href="/?lang={lang}" style="color:inherit">{back}</a></span>
    </div>
  </footer>
</body>
</html>
"""


def build_page(art, by_cat, all_by_slug):
    lang = art.get("lang", "it")
    t = T[lang]
    image = art.get("image") or art.get("thumb") or (BASE + "/og-cover.png")
    tags = art.get("tags") or []
    tags_html = ""
    if tags:
        tags_html = '<div class="art-tags">' + "".join("<span>%s</span>" % esc(x) for x in tags) + "</div>"
    og_tags = "".join('\n  <meta property="article:tag" content="%s">' % esc(x) for x in tags)
    return PAGE.format(
        lang=lang,
        title_txt=esc(art.get("title")),
        title_h1=esc(art.get("title")),
        title_attr=esc(art.get("title")),
        desc=esc(clip(art.get("subtitle"))),
        author=esc(art.get("author") or "Italians.ch"),
        url=url_for(art["slug"]),
        hreflang=hreflang_tags(art, all_by_slug),
        og_locale=OG_LOCALE.get(lang, "it_CH"),
        image=esc(image),
        iso=esc(parse_dt(art.get("date")).isoformat() if parse_dt(art.get("date")) else ""),
        category=esc(art.get("category") or ""),
        cat_slug=esc(art.get("categorySlug") or ""),
        og_tags=og_tags,
        jsonld=jsonld(art),
        v=ASSET_V,
        tagline=esc(t["tagline"]),
        since=esc(t["since"]),
        motto=esc(t["motto"]),
        search=esc(t["search"]),
        sections=esc(t["sections"]),
        home=esc(t["home"]),
        by=esc(t["by"]),
        back=esc(t["back"]),
        lang_links=lang_links(art, all_by_slug),
        nav=nav_html(lang),
        subtitle=esc(strip_html(art.get("subtitle"))),
        date_h=esc(fmt_date(art.get("date"), lang)),
        body=art.get("body") or "",
        gallery=gallery_html(art),
        tags_html=tags_html,
        related=related_cards(art, by_cat, all_by_slug),
    )


def write_sitemap(arts):
    urls = ['<url><loc>%s/</loc><changefreq>hourly</changefreq><priority>1.0</priority></url>' % BASE]
    for slug, a in sorted(arts.items(), key=lambda kv: kv[1].get("date") or "", reverse=True):
        lang = a.get("lang", "it")
        alts = {lang: slug}
        for lg, sl in (a.get("versions") or {}).items():
            if sl in arts:
                alts[lg] = sl
        alt = "".join('<xhtml:link rel="alternate" hreflang="%s" href="%s"/>' % (lg, url_for(sl)) for lg, sl in alts.items())
        dt = parse_dt(a.get("date"))
        lastmod = ("<lastmod>%s</lastmod>" % dt.date().isoformat()) if dt else ""
        urls.append("<url><loc>%s</loc>%s%s</url>" % (url_for(slug), lastmod, alt))
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
           'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + "\n".join(urls) + "\n</urlset>\n")
    with open(os.path.join(SITE, "sitemap.xml"), "w", encoding="utf-8", newline="") as fh:
        fh.write(xml)
    return len(urls) - 1


def write_robots():
    txt = (
        "# Italians.ch — robots (lancio)\n"
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /gestione.html\n"
        "Disallow: /redazione.html\n\n"
        "# AI / GEO crawlers benvenuti\n"
        "User-agent: GPTBot\nAllow: /\n"
        "User-agent: OAI-SearchBot\nAllow: /\n"
        "User-agent: ChatGPT-User\nAllow: /\n"
        "User-agent: ClaudeBot\nAllow: /\n"
        "User-agent: PerplexityBot\nAllow: /\n"
        "User-agent: Google-Extended\nAllow: /\n\n"
        "Sitemap: %s/sitemap.xml\n" % BASE
    )
    with open(os.path.join(SITE, "robots.txt"), "w", encoding="utf-8", newline="") as fh:
        fh.write(txt)


def write_llms(count):
    txt = (
        "# Italians.ch\n\n"
        "> Il nuovo media italiano in Svizzera dal 2003. Notizie, eventi, cultura, "
        "cinema, musica, motori, gastronomia, sport e turismo per la comunità italofona "
        "in Svizzera, in italiano, tedesco, francese e inglese.\n\n"
        "Italians.ch è una testata indipendente con sede a Zurigo. Copre l'attualità "
        "italiana in Svizzera e i grandi eventi (concerti, festival, mostre) dei quali è "
        "spesso media partner ufficiale.\n\n"
        "## Contenuti\n"
        "- Articoli: %d pagine sotto /news/<slug>/ in 4 lingue (it, de, fr, en)\n"
        "- Rubriche: Attualità, Cinema, Eventi, Gastronomia, Imprese, Motori, Musica, Sport, Turismo, Wellness & Salute\n\n"
        "## Risorse\n"
        "- Sitemap: %s/sitemap.xml\n"
        "- Home: %s/\n" % (count, BASE, BASE)
    )
    with open(os.path.join(SITE, "llms.txt"), "w", encoding="utf-8", newline="") as fh:
        fh.write(txt)


def main():
    files = glob.glob(os.path.join(DATA_A, "*.json"))
    arts = {}
    for f in files:
        try:
            a = json.load(open(f, encoding="utf-8"))
            if a.get("slug") and a.get("title"):
                arts[a["slug"]] = a
        except Exception as e:
            print("skip", f, e)
    by_cat = {}
    for a in arts.values():
        by_cat.setdefault((a.get("lang", "it"), a.get("categorySlug")), []).append(a)
    for k in by_cat:
        by_cat[k].sort(key=lambda x: x.get("date") or "", reverse=True)

    n = 0
    for slug, a in arts.items():
        page = build_page(a, by_cat, arts)
        d = os.path.join(OUT_ROOT, slug)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "index.html"), "w", encoding="utf-8", newline="") as fh:
            fh.write(page)
        n += 1
    print("Generate:", n, "pagine articolo in", OUT_ROOT)
    sm = write_sitemap(arts)
    write_robots()
    write_llms(n)
    print("Sitemap:", sm, "url + robots.txt + llms.txt scritti in", SITE)


if __name__ == "__main__":
    main()
