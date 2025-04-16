# 🔐 jwt-service

`jwt-service` is a microservice responsible for issuing, verifying, refreshing, and revoking JSON Web Tokens (JWTs).  
It uses **RS256 asymmetric cryptography** and is designed to work within a modular authentication system (e.g., with `wallet-auth`, `2fa-service`, etc.).

---

## 📌 Why a separate service?

JWT operations (signing/verifying) are security-critical. This service:
- Centralizes **token creation and validation**
- Uses its own private/public RSA key pair
- Prevents secrets from leaking to other microservices
- Makes rotation and revocation easier to manage
- Can scale independently (horizontal or serverless-ready)

---

## 🔐 RS256 Key Management

- Uses **asymmetric cryptography** (RS256)
- Keys are stored in `backend/keys/`
  - `private.key` → used to sign tokens
  - `public.key` → used to verify tokens
- Keys are generated using the script:

```bash
npm run prepare-env
```

> This script will create keys only if they don't exist.

---

## 🧱 Token Structure

Both access and refresh tokens contain:
- `address` → the user's wallet address
- `iat` → issued-at timestamp (used for revocation)
- **Signed using RS256**

---

## 🔁 Refresh Token Rotation

- `accessToken` is valid for **15 minutes**
- `refreshToken` is valid for **7 days**
- Every call to `/jwt/refresh` returns a new pair

---

## 🔥 Token Revocation

- Revocation is **timestamp-based**
- When `/jwt/logout` is called, all tokens for that address **issued before now** become invalid
- No blacklist needed → just store a `revokedAt` timestamp per address

---

## 📋 API Endpoints

### `POST /jwt/sign`

Issues a new pair of access and refresh tokens.

#### Request
```json
{
  "address": "0xAbC123..."
}
```

#### Response
```json
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

---

### `POST /jwt/refresh`

Accepts a valid refresh token and returns a new access+refresh pair.

#### Request
```json
{
  "refreshToken": "..."
}
```

#### Response
```json
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

---

### `POST /jwt/logout`

Revokes all tokens previously issued for the user.

#### Headers
```
Authorization: Bearer <accessToken or refreshToken>
```

#### Response
```json
{
  "success": true
}
```

---

### `GET /jwt/verify`

Verifies any token (access or refresh) and returns its decoded payload if valid.

#### Headers
```
Authorization: Bearer <token>
```

#### Response
```json
{
  "valid": true,
  "payload": {
    "address": "0xAbC123...",
    "iat": 1744750000
  }
}
```

---

## 🏗 Project Structure

```
jwt-service/
├── backend/
│   ├── server.js                # Fastify + Swagger + route loader
│   ├── openapi.yaml             # Full OpenAPI documentation
│   ├── routes/
│   │   ├── sign.js
│   │   ├── refresh.js
│   │   ├── verify.js
│   │   └── logout.js
│   ├── models/
│   │   └── revokedTokens.js     # In-memory revocation timestamp store
│   ├── scripts/
│   │   └── generate-keys.js     # Generates RSA keys if missing
│   └── keys/
│       ├── private.key
│       └── public.key
├── package.json
└── README.md
```

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Generate keys (if not present) and start server
npm start
```

The service will start on:

```
http://localhost:5000
```

Swagger UI available at:

```
http://localhost:5000/docs
```

---

## 📦 Example: Using this service from another microservice

```http
POST /jwt/sign
Content-Type: application/json

{
  "address": "0x123..."
}
```

Used by `wallet-auth` after wallet signature verification.

---

## 🧩 Intended integration

- ✅ `wallet-auth` → calls `/jwt/sign` after verifying wallet signature
- ✅ `2fa-service` → can call `/jwt/sign` only after 2FA passes
- ✅ Client → uses `/jwt/refresh` and `/jwt/logout`

---

## 🧪 Testing tokens manually

You can use [jwt.io](https://jwt.io/) to inspect your tokens.  
The **public key** can be used to verify them.

---

## 🧠 Security Notes

- Always store `accessToken` and `refreshToken` securely (e.g., HttpOnly cookies)
- Never expose `private.key`
- Use HTTPS in production
- Consider key rotation (currently timestamp-based revocation is sufficient)

---

## 📌 Maintainer notes

- All token verification uses `iat` to support clean revocation.
- `revokedTokens.js` is in-memory — should be moved to Redis or DB in production.
- Refresh and Access tokens are **rotated** each time.

---

## ✅ To do (future)

- [ ] JTI-based blacklist (optional)
- [ ] Key rotation support (with multiple public keys)
- [ ] Redis support for `revokedTokens`

---
