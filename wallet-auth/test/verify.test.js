import { buildApp } from '../backend/server.js';
import { Wallet } from 'ethers';

const app = await buildApp();

console.log('🔐 Testing /auth/wallet/verify');

const wallet = Wallet.createRandom();

const requestRes = await app.inject({
    method: 'POST',
    url: '/auth/wallet/request-message',
    payload: { address: wallet.address }
});

const { message } = requestRes.json();

const signature = await wallet.signMessage(message);

const verifyRes = await app.inject({
    method: 'POST',
    url: '/auth/wallet/verify',
    payload: {
        address: wallet.address,
        signature
    }
});

console.log('Status:', verifyRes.statusCode);
console.log('Body:', verifyRes.body);

if (verifyRes.statusCode !== 200 || !verifyRes.json().accessToken) {
    console.error('❌ Failed to verify wallet');
    process.exit(1);
}

console.log('✅ verify passed');
