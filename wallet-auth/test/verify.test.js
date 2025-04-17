import { buildApp } from '../backend/server.js';
import { request } from 'undici';
import { Wallet } from 'ethers';

console.log('🔐 Testing /auth/wallet/verify');

const app = await buildApp();
await app.listen({ port: 4000 });

const wallet = Wallet.createRandom();
const address = wallet.address;

const messageResponse = await request('http://localhost:4000/auth/wallet/request-message', {
    method: 'POST',
    body: JSON.stringify({ address }),
    headers: { 'content-type': 'application/json' }
});

const { message } = await messageResponse.body.json();

const signature = await wallet.signMessage(message);

const verifyResponse = await request('http://localhost:4000/auth/wallet/verify', {
    method: 'POST',
    body: JSON.stringify({ address, signature }),
    headers: { 'content-type': 'application/json' }
});

const body = await verifyResponse.body.json();

console.log('Status:', verifyResponse.statusCode);
console.log('Body:', body);

if (
    verifyResponse.statusCode === 200 &&
    body.address?.toLowerCase() === address.toLowerCase() &&
    body.is2faRequired === false
) {
    console.log('✅ verify passed');
} else {
    console.error('❌ Failed to verify wallet');
}
