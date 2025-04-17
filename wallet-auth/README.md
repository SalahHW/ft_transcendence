# 🦊 wallet-auth

`wallet-auth` is a microservice that authenticates users by verifying the ownership of an Ethereum wallet address.

Instead of using email/password, this service issues a message (with a nonce) that the user must sign with MetaMask or any EVM-compatible wallet. The signature proves the user owns the private key of the given address.

This service is designed to work alongside other services like:
- `jwt-service` → to issue access & refresh tokens
- `2fa-service` → for optional TOTP-based two-factor authentication

---

## 📌 How it works

### Step-by-step authentication flow:

1. **Client requests a message to sign**:
   - Sends its public Ethereum address to `/wallet/request-message`
   - Receives a message like:  
     `"Sign to login.\nNonce: 726384"`

2. **Client signs this message using MetaMask**

3. **Client sends the address and signature to `/wallet/verify`**

4. **Server verifies the signature**:
   - Reconstructs the original message (with nonce)
   - Uses `ethers.verifyMessage()` to recover the address
   - Compares it to the one received in the request

5. **If it matches**: returns the address and whether 2FA is required

---

## 📋 API Endpoints

### `POST /wallet/request-message`

Returns a unique message (with nonce) that the wallet must sign.

#### Request
```json
{
  "address": "0xAbC123..."
}
```

#### Response
```json
{
  "message": "Sign to login.\nNonce: 726384"
}
```

---

### `POST /wallet/verify`

Verifies the signature against the expected message and address.

#### Request
```json
{
  "address": "0xAbC123...",
  "signature": "0xdeadbeef..."
}
```

#### Response
```json
{
  "address": "0xAbC123...",
  "is2faRequired": false
}
```

> This is where the system could later call `jwt-service` to issue tokens, or `2fa-service` if needed.

---

## 🚀 Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Start the server
```bash
npm start
```

The server will run on:
```
http://localhost:4000
```

---

## 📚 Swagger Documentation

Swagger UI is available at:
```
http://localhost:4000/docs
```

The OpenAPI spec file is located at:
```
backend/openapi.yaml
```

---

## 🗂 Project Structure

```
wallet-auth/
├── backend/
│   ├── server.js                # Fastify server + Swagger
│   ├── openapi.yaml             # OpenAPI documentation (loaded by Swagger)
│   ├── routes/
│   │   ├── request-message.js   # Returns nonce message
│   │   └── verify.js            # Verifies signature
│   └── models/
│       └── walletUsers.js       # In-memory user store
├── package.json
└── README.md
```

---

## 🧪 Run Tests

This service includes a test suite using Fastify's native test engine via `inject()`.

To run all tests:

```bash
npm test
```

This will execute all test files in the `test/` directory, including:

- `request-message.test.js` → tests the `/auth/wallet/request-message` endpoint
- `verify.test.js` → tests the `/auth/wallet/verify` endpoint

Each test simulates actual requests using the Fastify instance, without launching a real HTTP server.

If you need to run a specific test file manually:

```bash
node test/request-message.test.js
```

Make sure dependencies are installed beforehand:

```bash
npm install
```


## 🧩 Next steps

You can now connect `wallet-auth` to:

- ✅ `jwt-service` to issue and refresh access tokens
- ✅ `2fa-service` to require TOTP verification after signature

---