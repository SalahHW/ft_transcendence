import { buildApp } from '../backend/server.js';

const app = await buildApp();

const testAddress = '0xabc123...';

console.log('🔐 Testing /auth/wallet/request-message');

const response = await app.inject({
    method: 'POST',
    url: '/auth/wallet/request-message',
    payload: { address: testAddress }
});

console.log('Status:', response.statusCode);
console.log('Body:', response.body);

if (response.statusCode !== 200) {
    console.error('❌ Failed to request message');
    process.exit(1);
}

const { message } = response.json();
if (!message || !message.includes('Nonce')) {
    console.error('❌ Message format is incorrect');
    process.exit(1);
}

console.log('✅ request-message passed');
