# Backend redazione Italians.ch — workflow n8n

Il portale `https://italians.ch/redazione.html` è il frontend. Il backend sono **3 webhook su n8n** (`work.tuttoitalia.ch`) che tengono il **token Webflow lato server** (mai nel browser).

Collezione News: `65a801e1cd7a04f9cb743056`. Token Webflow: come nei tuoi script (`D:\Upload articoli\.env`, ha permesso di scrittura — `publish.py` pubblica).

## Impostazioni comuni (ogni webhook)
- Metodo **POST**, **Respond: Using 'Respond to Webhook' node**.
- **CORS → Allowed Origins:** `https://italians.ch` (n8n risponde da solo al preflight OPTIONS).
- Una **credenziale HTTP Header Auth** Webflow: `Authorization: Bearer <TOKEN>` (riusala nei nodi HTTP).
- Un **secret** condiviso per i token di sessione (es. variabile n8n `RED_SECRET`).

---

## 1) `POST /webhook/redazione-login`
Input: `{ "user": "...", "pass": "..." }`

**Code node** (verifica credenziali + genera token firmato):
```js
const crypto = require('crypto');
const SECRET = $env.RED_SECRET || 'CAMBIAMI';
const USERS = { cirano: 'PASSWORD1', mario: 'PASSWORD2' };   // utenti giornalisti
const { user, pass } = $json.body || $json;
if (!USERS[user] || USERS[user] !== pass) return [{ json: { ok: false, error: 'Credenziali non valide.' } }];
const exp = Date.now() + 8 * 3600 * 1000;                    // 8 ore
const sig = crypto.createHmac('sha256', SECRET).update(user + '.' + exp).digest('hex');
const token = Buffer.from(user + '.' + exp + '.' + sig).toString('base64');
return [{ json: { ok: true, token, name: user } }];
```
→ **Respond to Webhook** con il JSON del Code node.

## Snippet di verifica token (riusa in get/save, Code node iniziale)
```js
const crypto = require('crypto');
const SECRET = $env.RED_SECRET || 'CAMBIAMI';
function check(token){
  try { const [u,e,s] = Buffer.from(token,'base64').toString().split('.');
    if (Date.now() > +e) return null;
    const ok = crypto.createHmac('sha256', SECRET).update(u+'.'+e).digest('hex') === s;
    return ok ? u : null; } catch(_) { return null; }
}
const b = $json.body || $json;
if (!check(b.token)) return [{ json: { __halt:true, ok:false, error:'Sessione scaduta, rifai il login.' } }];
return [{ json: b }];
```
(Se `__halt` → ramo che risponde subito con l'errore; altrimenti prosegui.)

---

## 2) `POST /webhook/redazione-get`
Input: `{ token, id }` → verifica token →
**HTTP Request** `GET https://api.webflow.com/v2/collections/65a801e1cd7a04f9cb743056/items/{{$json.id}}` (header auth Webflow) →
**Set/Code** mappa la risposta:
```js
const fd = $json.fieldData || {};
return [{ json: { ok:true, item:{ name: fd.name, subtitle: fd['brief-summary'], body: fd['article-body'] } } }];
```
→ Respond.

## 3) `POST /webhook/redazione-save`
Input: `{ token, id, name, subtitle, body }` → verifica token →
**HTTP Request** `PATCH https://api.webflow.com/v2/collections/65a801e1cd7a04f9cb743056/items/{{$json.id}}/live`
(il suffisso **`/live`** aggiorna E pubblica in un colpo), body JSON:
```json
{ "fieldData": { "name": "={{$json.name}}", "brief-summary": "={{$json.subtitle}}", "article-body": "={{$json.body}}" } }
```
→ **Code**: `return [{ json: { ok:true } }];` → Respond. (Su errore HTTP, rispondi `{ ok:false, error:'...' }`.)

---

## Dopo aver creato i workflow
1. Attivali (Active) → gli URL diventano `https://work.tuttoitalia.ch/webhook/redazione-login` ecc. (devono combaciare con `N8N` in `site/assets/js/redazione.js`).
2. Imposta `RED_SECRET` e gli utenti/password in `USERS`.
3. Prova: vai su `https://italians.ch/redazione.html`, accedi, apri un articolo, modifica, **Salva** → controlla su Webflow/sul sito che la modifica ci sia.

> Nota: per i campi e gli endpoint esatti puoi rifarti ai tuoi `update_translations.py` / `publish.py`, che già scrivono e pubblicano su questa stessa collezione.
