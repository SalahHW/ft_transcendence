import fs from 'fs';
import path from 'path';
import { generateKeyPairSync } from 'crypto';

const keyDir = path.resolve('backend', 'keys');
const privateKeyPath = path.join(keyDir, 'private.key');
const publicKeyPath = path.join(keyDir, 'public.key');

if (!fs.existsSync(keyDir)) {
    fs.mkdirSync(keyDir, { recursive: true });
}

if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
    console.log('✅ Keys already exist — skipping generation.');
    process.exit(0);
}

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
fs.writeFileSync(publicKeyPath, publicKey, { mode: 0o644 });

console.log('✅ RSA key pair generated successfully.');
