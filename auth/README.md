# Auth Service – ft_transcendence

Microservice d'authentification basé sur Fastify avec support JWT.

## 🔎 Introduction aux concepts

- **JWT (JSON Web Token)** :
  Un format sécurisé permettant de représenter des identifiants utilisateur dans un token signé.
  Le serveur génère ce token lors de la connexion, et le client l’envoie ensuite dans chaque requête via le header :
    `Authorization: Bearer <token>`

- **Fastify** :
  Framework web rapide et moderne pour Node.js, utilisé ici à la place d’Express.
  Il permet de gérer facilement les routes, middlewares et plugins (comme `@fastify/jwt`).

- **2FA (Two-Factor Authentication)** :  
  L'utilisateur peut activer une vérification par code TOTP (Google Authenticator, etc.)  
  Même avec un mot de passe correct, il doit fournir un code temporaire à usage unique.

- **Middleware authenticate** :
  Fonction enregistrée globalement qui vérifie la validité d’un JWT reçu.
  Si le token est bon, les données sont accessibles via `request.user`. Sinon, la route retourne `401 Unauthorized`.

## ⚙️ Fonctionnalités

- Authentification via JWT (access token + refresh token)
- Authentification forte via 2FA (code TOTP)
- Middleware `app.authenticate` pour sécuriser les routes
- Routes disponibles :
  - `POST /auth/register`       → créer un compte
  - `POST /auth/login`          → se connecter
  - `POST /auth/refresh`        → obtenir un nouveau access token à partir du refresh token
  - `GET  /auth/me`             → récupérer les infos utilisateur à partir du token
  - `GET  /auth/verify-token`   → vérifier un token (usage par les autres services)
  - `POST /auth/2fa/setup`
  - `POST /auth/2fa/verify`
  - `GET /auth/2fa/status`
  - `POST /auth/2fa/login` 

## 📚 Description des routes

### `POST /auth/register`
→ Enregistre un nouvel utilisateur (email + mot de passe).
→ Retourne un access token (15 min) et un refresh token (7 jours).
⚠️ Si l’email est déjà utilisé, la requête échoue.

### `POST /auth/login`
→ Permet à un utilisateur existant de se connecter.
→ Si l’email + mot de passe sont corrects, retourne un access token et un refresh token.

### `POST /auth/refresh`
→ À utiliser quand l’access token expire.
→ Prend un refresh token valide dans le body et renvoie une nouvelle paire access + refresh token.
→ Ne nécessite pas d’authentification préalable (le token suffit dans le body).

### `GET /auth/me`
→ Route protégée. Retourne les informations de l’utilisateur connecté, extraites du token JWT.
→ Nécessite un header `Authorization: Bearer <accessToken>` valide.

### `GET /auth/verify-token`
→ Route protégée. Permet aux autres services de vérifier un token JWT et d’en extraire les infos utilisateur.
→ Retourne les données du user si le token est valide.

### `POST /auth/2fa/login`  
→ À utiliser si la 2FA est activée. Prend un code TOTP et un `tempToken`, retourne alors access + refresh tokens.

### `POST /auth/2fa/setup`  
→ Génère une clé TOTP et retourne un QR Code + une clé manuelle.

### `POST /auth/2fa/verify`  
→ Active la 2FA si le code TOTP fourni est valide.

### `GET /auth/2fa/status`  
→ Retourne si 2FA est activée pour l’utilisateur courant.


## 🚀 Lancer le service

```bash
make all
```

> Le `.env` est généré automatiquement avec `JWT_SECRET` et `PORT`

## 📦 Endpoints

### POST `/auth/register`

**Body JSON** :
```json
{
  "email": "test@example.com",
  "password": "azerty123"
}
```

**Réponse** :
```json
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

### POST `/auth/login`

**Body JSON** :
```json
{
  "email": "test@example.com",
  "password": "azerty123"
}
```

**Réponse (si 2FA désactivée)** :
```json
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

**Réponse (si 2FA activée)** :
```json
{
  "tempToken": "..."
}
```

### POST `/auth/2fa/login`

**Body JSON** :
```json
{
  "tempToken": "...",
  "code": "123456"
}
```

**Réponse** :
```json
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

### POST `/auth/2fa/setup`

**Headers requis** :
```
Authorization: Bearer <accessToken>
```

**Réponse** :
```json
{
  "qrCode": "data:image/png;base64,...",
  "manualKey": "ABCD1234EFGH5678"
}
```

### POST `/auth/2fa/verify`

**Headers requis** :
```
Authorization: Bearer <accessToken>
```

**Body JSON** :
```json
{
  "code": "123456"
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "2FA successfully enabled"
}
```

### GET `/auth/2fa/status`

**Headers requis** :
```
Authorization: Bearer <accessToken>
```

**Réponse** :
```json
{
  "is2faEnabled": true
}
```

### POST `/auth/refresh`

**Body JSON** :
```json
{
  "refreshToken": "..."
}
```

**Réponse** :
```json
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

### GET `/auth/me`

**Headers requis** :
```
Authorization: Bearer <accessToken>
```

**Réponse** :
```json
{
  "user": {
    "id": 2,
    "email": "test@example.com",
    "iat": 1744372254
  }
}
```

### GET `/auth/verify-token`

**Headers requis** :
```
Authorization: Bearer <accessToken>
```

**Réponse si valide** :
```json
{
  "valid": true,
  "user": {
    "id": 2,
    "email": "test@example.com",
    "iat": 1744372254
  }
}
```

## 📖 Documentation Swagger

Le service expose une documentation Swagger interactive sur :
```
http://localhost:4000/docs
```

Cette page vous permet de tester toutes les routes et d'explorer les schémas d'entrée et de sortie.

Swagger est intégré via `@fastify/swagger` et `@fastify/swagger-ui`. Il lit les métadonnées (schemas) directement définies dans les routes.

## 🔐 Authentification dans vos requêtes

Tous les autres services doivent appeler `GET /auth/verify-token` avec le token JWT dans le header `Authorization`.

Ne stockez pas JWT côté client. Ne vérifiez pas le token vous-mêmes.

## 📁 Structure du projet

```
backend/
├── server.js
├── routes/
│   └── auth/
│       ├── index.js
│       ├── login.js
│       ├── me.js
│       ├── register.js
│       ├── refresh.js
│       └── verify-token.js
├── models/
│   └── users.js
├── scripts/
│   └── generate-env.js
```

## 🧠 Fonctionnement interne

- **Création des tokens** :

  Dans `login.js` ou `register.js` :
```js
const accessToken = app.jwt.sign({ id: user.id, email: user.email }, { expiresIn: '15m' });
const refreshToken = app.jwt.sign({ id: user.id }, { expiresIn: '7d' });
```

- **Middleware authenticate (dans `server.js`)** :
```js
app.decorate('authenticate', async function (request, reply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.send(err);
  }
});
```

- **Routes sécurisées** :
```js
app.get('/auth/me', { preValidation: [app.authenticate] }, ...)
```

- **Routes enregistrées dans `routes/auth/index.js`** :
```js
export default async function authRoutes(app) {
  await app.register(import('./login.js'));
  await app.register(import('./me.js'));
  await app.register(import('./register.js'));
  await app.register(import('./refresh.js'));
  await app.register(import('./verify-token.js'));
}
```

- **Utilisateurs mockés** dans `models/users.js` (tableau JS). Réinitialisé à chaque redémarrage.

## 🧾 Notes

- Les utilisateurs sont non persistés (mock JS).
- Pour une vraie application, connecter une base de données.
- JWT est stocké côté client (ex : navigateur ou microservice frontend).
- Le système est entièrement stateless : aucun token n’est stocké côté serveur.