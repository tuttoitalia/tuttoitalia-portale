# -*- coding: utf-8 -*-
"""
Italians.ch — pulizia slug: rimuove 'tuttoitalia' dagli slug (traccia per la
strategia antagonista). 'tuttoitalia' -> 'italians' (quindi 'tuttoitaliach' ->
'italiansch'). Rinomina i file data/a/<slug>.json, aggiorna il campo `slug` e
tutte le `versions`, e le voci in index.<lang>.json.
Sicuro pre-lancio: le pagine /news/ non sono mai state pubbliche (niente redirect).
Uso: python sync/clean_slugs.py   (poi ri-lanciare prerender.py)
"""
import os, json, glob

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.normpath(os.path.join(HERE, "..", "site"))
DATA_A = os.path.join(SITE, "data", "a")


def clean(slug):
    return slug.replace("tuttoitalia", "italians") if slug else slug


def load(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def save(p, obj):
    with open(p, "w", encoding="utf-8", newline="") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))


def main():
    files = glob.glob(os.path.join(DATA_A, "*.json"))

    # 1) mappa rename old->new (solo slug che cambiano)
    rename = {}
    for f in files:
        a = load(f)
        s = a.get("slug")
        if s and "tuttoitalia" in s:
            rename[s] = clean(s)

    # controllo collisioni
    news = list(rename.values())
    dupes = set([x for x in news if news.count(x) > 1])
    if dupes:
        print("!! COLLISIONE slug:", dupes)
        return
    print("Slug da rinominare:", len(rename))

    # 2) aggiorna ogni articolo (slug + versions) e riscrivi col NUOVO nome file
    renamed = 0
    for f in files:
        a = load(f)
        changed = False
        if a.get("slug") in rename:
            a["slug"] = rename[a["slug"]]
            changed = True
        v = a.get("versions") or {}
        for lg in list(v.keys()):
            if v[lg] in rename:
                v[lg] = rename[v[lg]]
                changed = True
        newpath = os.path.join(DATA_A, a["slug"] + ".json")
        if newpath != f:
            save(newpath, a)
            os.remove(f)
            renamed += 1
        elif changed:
            save(f, a)
    print("File rinominati:", renamed)

    # 3) aggiorna index.<lang>.json (slug + versions di ogni voce)
    for lang in ["it", "de", "fr", "en"]:
        p = os.path.join(SITE, "data", "index.%s.json" % lang)
        if not os.path.exists(p):
            continue
        arr = load(p)
        for e in arr:
            if e.get("slug") in rename:
                e["slug"] = rename[e["slug"]]
            v = e.get("versions") or {}
            for lg in list(v.keys()):
                if v[lg] in rename:
                    v[lg] = rename[v[lg]]
        save(p, arr)
        print("index.%s.json aggiornato" % lang)


if __name__ == "__main__":
    main()
