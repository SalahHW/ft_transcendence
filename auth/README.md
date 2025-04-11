# Auth Service – ft_transcendence

Microservice d'authentification basé sur Fastify avec support JWT.

===============================
🔎 Introduction aux concepts
===============================

- JWT (JSON Web Token) :
  Un format sécurisé permettant de représenter des identifiants utilisateur dans un token signé.
  Le serveur génère ce token lors de la connexion, et le client l’envoie ensuite dans chaque requête via le header :
    Authorization: Bearer <token>

- Fastify :
  Framework web rapide et moderne pour Node.js, utilisé ici à la place d’Express.
  Il permet de gérer facilement les routes, middlewares et plugins (comme @fastify/jwt).

- Middleware authenticate :
  C’est une fonction enregistrée globalement qui vérifie la validité d’un JWT reçu.
  Si le token est bon, les données sont accessibles via request.user.
  Si le token est absent ou invalide, la route retourne 401 Unauthorized.

===============================
⚙️ Fonctionnalités
===============================

- Authentification via JWT
- Middleware app.authenticate pour sécuriser les routes
- Routes disponibles :
  POST /auth/register       → créer un compte
  POST /auth/login          → se connecter
  GET  /auth/me             → récupérer les infos utilisateur à partir du token
  GET  /auth/verify-token   → vérifier un token (pour les autres services)

===============================
🚀 Lancer le service
===============================

make all

> Le .env est généré automatiquement avec JWT_SECRET et PORT

===============================
📦 Endpoints
===============================

POST /auth/register

  Body JSON :
    {
      "email": "test@example.com",
      "password": "azerty123"
    }

  Réponse :
    {
      "token": "eyJhbGciOiJIUzI1NiIs..."
    }

POST /auth/login

  Body JSON :
    {
      "email": "test@example.com",
      "password": "azerty123"
    }

  Réponse :
    {
      "token": "eyJhbGciOiJIUzI1NiIs..."
    }

GET /auth/me

  Headers requis :
    Authorization: Bearer <token>

  Réponse :
    {
      "user": {
        "id": 2,
        "email": "test@example.com",
        "iat": 1744372254
      }
    }

GET /auth/verify-token

  Headers requis :
    Authorization: Bearer <token>

  Réponse si valide :
    {
      "valid": true,
      "user": {
        "id": 2,
        "email": "test@example.com",
        "iat": 1744372254
      }
    }

===============================
🔐 Authentification dans vos requêtes
===============================

Tous les autres services doivent appeler GET /auth/verify-token
avec le token JWT dans le header Authorization.

Ne stockez pas JWT côté client. Ne vérifiez pas le token vous-mêmes.

===============================
📁 Structure du projet
===============================

backend/
├── server.js
├── routes/
│   └── auth/
│       ├── index.js
│       ├── login.js
│       ├── me.js
│       ├── register.js
│       └── verify-token.js
├── models/
│   └── users.js
├── scripts/
│   └── generate-env.js

===============================
🧠 Fonctionnement interne
===============================

- Création du token :

  Dans login.js ou register.js :
    const token = app.jwt.sign({ id: user.id, email: user.email });

- Middleware authenticate (dans server.js) :

    app.decorate('authenticate', async function (request, reply) {
      try {
        await request.jwtVerify();
      } catch (err) {
        return reply.send(err);
      }
    });

- Routes sécurisées :

    app.get('/auth/me', { preValidation: [app.authenticate] }, ...)

- Les routes auth sont enregistrées dans routes/auth/index.js :

    export default async function authRoutes(app) {
      await app.register(import('./login.js'));
      await app.register(import('./me.js'));
      await app.register(import('./register.js'));
      await app.register(import('./verify-token.js'));
    }

- Les utilisateurs sont stockés en mémoire dans models/users.js (tableau JS).  
  Ce tableau est réinitialisé à chaque redémarrage.

===============================
🧾 Notes
===============================

- Les utilisateurs sont non persistés (mock JS).
- Pour une vraie application, connecter une base de données.
- JWT est stocké côté client (ex : navigateur ou microservice frontend).
