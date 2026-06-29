#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
mirror_media.py — Mirror Webflow images referenced in site/data/ onto the
Hostpoint media server (media.italians.ch) and rewrite the JSON to point there.

Idempotent: only NEW images are downloaded (server-side, datacenter→datacenter).
Best-effort: if SSH is unavailable the JSON is left untouched (images keep
loading from Webflow), so a failed mirror never breaks the site.

Used as a post-step by export.py; can also be run standalone:
    python mirror_media.py
"""
import os, re, json, glob, subprocess, urllib.parse, tempfile

SITE = r"D:\Claude Design\nuovo portale tuttoitalia\site"
DATA = os.path.join(SITE, "data")

SSH_KEY = os.path.expanduser(r"~/.ssh/hostpoint_italians")
SSH_HOST = "rofipade@sl163.web.hostpoint.ch"
IMG_URL = "https://media.italians.ch/img/"

HOSTS = r"(?:uploads-ssl\.webflow\.com|cdn\.prod\.website-files\.com)"
PAT = re.compile(r'https?://' + HOSTS + r'/[^"\\ ]+?\.(?:jpg|jpeg|png|gif|webp|svg|avif)', re.I)

SSH_OPTS = ["-i", SSH_KEY, "-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=accept-new",
            "-o", "ConnectTimeout=20"]

# server-side downloader: reads ~/manifest_sync.tsv, fetches only missing files
REMOTE_DL = r'''
IMG="$HOME/www/media.italians.ch/img"; MAN="$HOME/manifest_sync.tsv"; FAIL="$HOME/sync_fail.log"
mkdir -p "$IMG"; cd "$IMG" || exit 1; : > "$FAIL"
dl(){ name="$1"; path="$2"; [ -s "$name" ] && return 0
  for h in cdn.prod.website-files.com uploads-ssl.webflow.com; do
    c=$(curl -s -m 60 -o "$name.part" -w "%{http_code}" "https://$h/$path")
    [ "$c" = "200" ] && [ -s "$name.part" ] && { mv -f "$name.part" "$name"; return 0; }
  done; rm -f "$name.part"; printf '%s\n' "$name" >> "$FAIL"; return 1; }
n=0
while IFS="$(printf '\t')" read -r name path; do
  [ -z "$name" ] && continue
  dl "$name" "$path" & n=$((n+1)); [ $((n%16)) -eq 0 ] && wait
done < "$MAN"; wait
echo "downloaded_total=$(ls -1 "$IMG" | grep -v '\.part$' | wc -l) failed=$(wc -l < "$FAIL" | tr -d ' ')"
'''


def safe_name(seg):
    seg = urllib.parse.unquote(seg).replace('’', "'")
    base, _, ext = seg.rpartition('.')
    base = re.sub(r'-{2,}', '-', re.sub(r'[^A-Za-z0-9._-]+', '-', base)).strip('-._') or 'img'
    ext = re.sub(r'[^A-Za-z0-9]+', '', ext).lower() or 'jpg'
    return base + '.' + ext


def build(data_dir):
    files = sorted(glob.glob(os.path.join(data_dir, '*.json')) +
                   glob.glob(os.path.join(data_dir, 'a', '*.json')))
    path_to_name, url_to_name = {}, {}
    for f in files:
        for u in PAT.findall(open(f, encoding='utf-8').read()):
            path = u.split('/', 3)[3]
            nm = safe_name(path.split('/')[-1])
            path_to_name[path] = nm
            url_to_name[u] = nm
    return files, path_to_name, {u: IMG_URL + nm for u, nm in url_to_name.items()}


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def mirror(data_dir=DATA, verbose=True):
    files, path_to_name, urlmap = build(data_dir)
    if not path_to_name:
        if verbose: print("[mirror] nessuna immagine Webflow nei dati, niente da fare.")
        return {"images": 0}
    if verbose: print(f"[mirror] {len(path_to_name)} immagini referenziate, sincronizzo su Hostpoint...")

    tmp = tempfile.mkdtemp(prefix="mirror_")
    man = os.path.join(tmp, "manifest_sync.tsv")
    with open(man, "w", encoding="utf-8", newline="\n") as out:
        for path, nm in sorted(path_to_name.items()):
            out.write(nm + "\t" + path + "\n")

    try:
        scp = run(["scp"] + SSH_OPTS + [man, SSH_HOST + ":~/manifest_sync.tsv"])
        if scp.returncode != 0:
            raise RuntimeError("scp manifest: " + (scp.stderr or "").strip())
        # ensure LF then download (only missing files)
        prep = run(["ssh"] + SSH_OPTS + [SSH_HOST,
                   "tr -d '\\r' < ~/manifest_sync.tsv > ~/m.lf && mv ~/m.lf ~/manifest_sync.tsv"])
        dl = run(["ssh"] + SSH_OPTS + [SSH_HOST, REMOTE_DL])
        if dl.returncode != 0:
            raise RuntimeError("ssh download: " + (dl.stderr or "").strip())
        if verbose: print("[mirror] server:", dl.stdout.strip())
        # which names failed (so we keep their Webflow URL)
        fl = run(["ssh"] + SSH_OPTS + [SSH_HOST, "cat ~/sync_fail.log 2>/dev/null"])
        failed = set(l.strip() for l in fl.stdout.splitlines() if l.strip())
    except Exception as e:
        print(f"[mirror] ATTENZIONE: mirroring saltato ({e}). I JSON restano su URL Webflow.")
        return None

    # rewrite JSONs (skip failed names -> keep original)
    def repl(m):
        u = m.group(0); new = urlmap.get(u)
        if not new: return u
        return u if new[len(IMG_URL):] in failed else new

    changed = 0
    for f in files:
        txt = open(f, encoding='utf-8').read()
        new, n = PAT.subn(repl, txt)
        if n and new != txt:
            open(f, 'w', encoding='utf-8', newline='\n').write(new)
            changed += 1
    if verbose:
        print(f"[mirror] JSON aggiornati: {changed}/{len(files)} | falliti (restano su Webflow): {len(failed)}")
    return {"images": len(path_to_name), "failed": len(failed), "files_rewritten": changed}


if __name__ == "__main__":
    mirror()
