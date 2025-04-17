## 🔐 2FA Microservice

This microservice handles Time-based One-Time Password (TOTP) based two-factor authentication (2FA).

### ✅ Features

- `GET /2fa/status` – Check if the service is running.
- `POST /2fa/enable` – Enable 2FA for a given address.
- `POST /2fa/verify` – Verify a submitted TOTP token.

---

### 🚀 Start the Service

```bash
npm install
npm start
```

By default, the service listens on port `4000`.

---

### 🧪 Run Tests

```bash
npm test
```

Tests include:
- Service status check
- Enabling 2FA
- Verifying invalid TOTP tokens

---

### 📘 OpenAPI Documentation

You can view the Swagger docs at:

```
http://localhost:4000/docs
```

---
### 📡 Available Routes

#### `GET /2fa/status`
Check if the 2FA microservice is running.

**Response:**
```json
{
  "status": "2FA service is up and running"
}
```

---

#### `POST /2fa/enable`
Enable 2FA for a specific wallet address.

**Body:**
```json
{
  "address": "0xabc123...",
  "secret": "YOUR_TOTP_SECRET"
}
```

**Response:**
```json
{
  "success": true,
  "message": "2FA enabled"
}
```

---

#### `POST /2fa/verify`
Verify a TOTP token for a specific address.

**Body:**
```json
{
  "address": "0xabc123...",
  "token": "123456",
  "secret": "YOUR_TOTP_SECRET"
}
```

**Success Response:**
```json
{
  "valid": true
}
```

**Error Responses:**
- `400 Bad Request`: Missing address, token, or secret.
- `401 Unauthorized`: Invalid or expired token.

---

### 💡 Notes

- This microservice is intended to run in an **isolated container**.
- No database is used at the moment – secrets and data are simulated in memory for testing.
- Designed to be consumed by external services (e.g., `wallet-auth`).
