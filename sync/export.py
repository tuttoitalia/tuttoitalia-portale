#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
export.py — Esporta News + Autori(team) + Categorie da Webflow (tuttoitalia.ch)
in JSON ottimizzati per il sito statico Italians.ch (site/data/).

Output:
  site/data/index.<lang>.json  — lista leggera (senza corpo) per home/rubriche
  site/data/a/<slug>.json      — articolo completo (corpo, gallery, autore, versioni)
  site/data/team.json          — autori (nome, ruolo, bio, foto) per la pagina team
  site/data/meta.json          — categorie per lingua + conteggi

Legge WEBFLOW_TOKEN da D:\\Upload articoli\\.env. Rilanciabile come step di sync.
"""
import os, re, json, time
import requests

ENV_PATH = r"D:\Upload articoli\.env"
SITE = r"D:\Claude Design\nuovo portale tuttoitalia\site"
OUT  = os.path.join(SITE, "data")
ADIR = os.path.join(OUT, "a")

COLL = {"news":"65a801e1cd7a04f9cb743056","tags":"65a801e1cd7a04f9cb743053",
        "authors":"65a801e1cd7a04f9cb743054","categories":"65a801e1cd7a04f9cb743055"}
LANG = {"7ac7bb7acf0c493369af6ac15bc454e0":"en","e12d6e0f5e83c94064ae51bcb9413b44":"it",
        "b86a773d8de0e1b5fbc3a766cf6fa3a1":"fr","94468b996f931cfcdb5cf26f38d0f68e":"de"}

def load_token():
    with open(ENV_PATH, encoding="utf-8") as f:
        for line in f:
            if line.strip().startswith("WEBFLOW_TOKEN="):
                return line.split("=",1)[1].strip().strip('"').strip("'")
    raise SystemExit("WEBFLOW_TOKEN non trovato")

H = {"Authorization": f"Bearer {load_token()}", "accept":"application/json"}

def fetch_all(cid, label):
    items, offset = [], 0
    while True:
        r = requests.get(f"https://api.webflow.com/v2/collections/{cid}/items",
                         headers=H, params={"limit":100,"offset":offset}, timeout=90)
        r.raise_for_status()
        j = r.json(); b = j.get("items",[]); items += b
        total = j.get("pagination",{}).get("total",len(items))
        print(f"  {label}: {len(items)}/{total}", flush=True)
        offset += 100
        if offset >= total or not b: break
    return items

def url_of(v): return v.get("url") if isinstance(v, dict) else None

# --- rebrand contenuti: niente "Tuttoitalia" (richiesta utente) ---
def rebrand(s):
    if not s: return s
    s = s.replace("Tuttoitalia.ch", "Italians.ch").replace("tuttoitalia.ch", "italians.ch")
    s = s.replace("Tuttoitalia", "Italians.ch")
    return s

AUTHOR_SUFFIX = re.compile(r"\s*\((?:ENG|FRA|GER|ITA|IT|EN|FR|DE)\)\s*$", re.I)
def clean_name(n):
    return AUTHOR_SUFFIX.sub("", n).strip() if n else n

def main():
    os.makedirs(ADIR, exist_ok=True)
    t0 = time.time()
    print("Scarico collezioni…", flush=True)
    authors = fetch_all(COLL["authors"], "autori")
    cats    = fetch_all(COLL["categories"], "categorie")
    tags    = fetch_all(COLL["tags"], "tag")
    news    = fetch_all(COLL["news"], "news")

    amap = {a["id"]: a.get("fieldData",{}) for a in authors}
    cmap = {c["id"]: c.get("fieldData",{}) for c in cats}
    tmap = {t["id"]: t.get("fieldData",{}) for t in tags}
    id2slug = {it["id"]: it.get("fieldData",{}).get("slug") for it in news}

    def versions_of(fd):
        out = {}
        for lng, ref in (("it",fd.get("italian-version-2")),("de",fd.get("german-version-2")),
                         ("fr",fd.get("french-version-3")),("en",fd.get("english-version-2"))):
            if ref and id2slug.get(ref): out[lng] = id2slug[ref]
        return out

    full, light = {}, {"it":[],"de":[],"fr":[],"en":[]}
    for it in news:
        if it.get("isDraft") or it.get("isArchived"): continue
        fd = it.get("fieldData",{})
        slug = fd.get("slug");
        if not slug or not fd.get("name"): continue
        lang = LANG.get(fd.get("article-language"),"it")
        afd = amap.get(fd.get("author"),{}); cfd = cmap.get(fd.get("category"),{})
        date = fd.get("data") or it.get("lastPublished") or it.get("createdOn")
        title = rebrand(fd.get("name")); subtitle = rebrand(fd.get("brief-summary"))
        thumb = url_of(fd.get("thumbnail-image"))
        image = url_of(fd.get("main-image")) or url_of(fd.get("foto-copertina-per-cinema")) or thumb
        ver = versions_of(fd)
        cat = cfd.get("name"); catslug = cfd.get("slug")
        light[lang].append({"slug":slug,"title":title,"subtitle":subtitle,"date":date,
                            "category":cat,"categorySlug":catslug,"author":clean_name(afd.get("name")),
                            "thumb":thumb,"image":image,"featured":bool(fd.get("featured-post")),
                            "videoWeek":bool(fd.get("video-della-settimana")),"versions":ver})
        full[slug] = {"slug":slug,"lang":lang,"title":title,"subtitle":subtitle,
                      "date":date,"category":cat,"categorySlug":catslug,
                      "author":clean_name(afd.get("name")),"authorPhoto":url_of(afd.get("picture")),
                      "authorRole":afd.get("position"),
                      "tags":[tmap.get(t,{}).get("name") for t in (fd.get("tags") or []) if tmap.get(t)],
                      "image":image,"thumb":thumb,
                      "gallery":[url_of(g) for g in (fd.get("galleria-articolo") or []) if url_of(g)],
                      "body":rebrand(fd.get("article-body")),"videoLink":fd.get("video-link"),
                      "versions":ver}

    for lng in light:
        light[lng].sort(key=lambda a:(a["date"] or ""), reverse=True)
        json.dump(light[lng], open(os.path.join(OUT,f"index.{lng}.json"),"w",encoding="utf-8"),
                  ensure_ascii=False, separators=(",",":"))
    for slug, art in full.items():
        json.dump(art, open(os.path.join(ADIR, slug+".json"),"w",encoding="utf-8"),
                  ensure_ascii=False, separators=(",",":"))

    # categorie raggruppate per lingua (da articoli reali)
    cats_by_lang = {"it":{}, "de":{}, "fr":{}, "en":{}}
    for lng, arr in light.items():
        for a in arr:
            if a["category"] and a["categorySlug"]:
                cats_by_lang[lng][a["categorySlug"]] = a["category"]
    meta = {"counts":{k:len(v) for k,v in light.items()},
            "categories":{lng:[{"slug":s,"name":n} for s,n in d.items()] for lng,d in cats_by_lang.items()},
            "total": sum(len(v) for v in light.values())}
    json.dump(meta, open(os.path.join(OUT,"meta.json"),"w",encoding="utf-8"), ensure_ascii=False, indent=1)

    # team
    team = []
    seen = set()
    for a in sorted(authors, key=lambda x: x.get("fieldData",{}).get("ordine",999) or 999):
        fd = a.get("fieldData",{}); nm = clean_name(fd.get("name"))
        if not nm or nm in seen: continue
        seen.add(nm)
        team.append({"name":nm,"role":fd.get("position"),"bio":rebrand(fd.get("bio-summary")),
                     "photo":url_of(fd.get("picture")),"email":fd.get("email")})
    json.dump(team, open(os.path.join(OUT,"team.json"),"w",encoding="utf-8"), ensure_ascii=False, indent=1)

    # rimuovi il vecchio news.json monolitico se presente
    old = os.path.join(OUT,"news.json")
    if os.path.exists(old): os.remove(old)
    for f in ("categories.json","authors.json"):
        p=os.path.join(OUT,f)
        if os.path.exists(p): os.remove(p)

    print("\n=== RISULTATO ===")
    print("per lingua:", meta["counts"], "| articoli-file:", len(full), "| team:", len(team))
    print(f"Fatto in {time.time()-t0:.0f}s")

if __name__ == "__main__":
    main()
