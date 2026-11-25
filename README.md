# Rakama — Gacha & Guess anime

Site privé pour 2 joueurs : gacha de cartes anime (packs, fusion, recyclage, pity, événements hebdomadaires) et quiz quotidien « Devine l'anime ».

- `web/` : le site (Vite + React), publié sur **GitHub Pages**
- `api/` : le serveur (Node 24 + SQLite), hébergé sur un **nouveau service Railway** (séparé du bot Discord)

## Règles du jeu

| | |
|---|---|
| Pack normal | 5 cartes, coûte 100 points |
| Points passifs | +200 / jour (1 point toutes les 7 min 12 s), sans plafond |
| Quiz du jour | 100 / 60 / 30 / 10 points selon l'indice où l'anime est trouvé, 3 essais par indice |
| Pity | UR garantie après 13 packs sans UR |
| Recyclage | 100 C, 50 R ou 25 SR → 1 pack bonus (les favoris et la vitrine ne sont jamais recyclés) |
| Fusion | 3× la même SSR → UR, 2× la même UR → MYTH |
| Événements | 1 par semaine (52 / an), 1 pack gratuit par jour (7 max), cumulables, 1 carte sans rareté, persos connus plus rares |
| Broyer | Une carte événement → +25 points |
| Archives | Cartes Discord sans rang : style télé cathodique, rang relevé à la migration, hors rareté, fusion et recyclage |

Le rang de favori AniList est **figé au moment du drop**.

## Développement local

```powershell
cd api; npm install; $env:SETUP_CODE = "dev"; npm run dev
```

```powershell
cd web; npm install; npm run dev
```

Le site tourne sur http://localhost:5173 et l'API sur http://localhost:8787.

## Déploiement

### 1. API sur Railway

1. Nouveau projet Railway → *Deploy from GitHub repo* → ce repo.
2. Dans le service : *Settings → Root Directory* = `api` (Railway utilise `api/Dockerfile`).
3. Ajouter un **volume** monté sur `/data`.
4. Variables d'environnement :
   - `SETUP_CODE` : un code secret (sert à la première connexion et à l'import)
   - `WEB_ORIGIN` : `https://<utilisateur>.github.io`
5. *Settings → Networking → Generate Domain* pour obtenir l'URL publique de l'API.

### 2. Import des données Discord (une seule fois)

```powershell
curl.exe -X POST "https://<api>.up.railway.app/api/admin/import" -H "X-Setup-Code: <SETUP_CODE>" -H "Content-Type: application/json" --data-binary "@data_import/gacha_data.json"
```

Suivre l'avancement (environ 2 minutes) :

```powershell
curl.exe "https://<api>.up.railway.app/api/admin/import" -H "X-Setup-Code: <SETUP_CODE>"
```

### 3. Site sur GitHub Pages

1. Repo GitHub → *Settings → Pages → Source* = **GitHub Actions**.
2. *Settings → Secrets and variables → Actions → Variables* : ajouter `API_URL` = `https://<api>.up.railway.app`.
3. Chaque push sur `main` qui touche `web/` redéploie le site.

### 4. Première connexion

Chaque joueur choisit son compte, tape son mot de passe et le `SETUP_CODE`. Le mot de passe est ensuite enregistré.
