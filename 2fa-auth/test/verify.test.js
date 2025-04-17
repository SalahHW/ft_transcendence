import { buildApp } from '../backend/server.js';
import { request } from 'undici';

const BASE_URL = 'http://localhost:4000';

export async function testVerify2FA() {
    const app = await buildApp();
    await app.listen({ port: 4000 });

    console.log('🔐 Testing POST /2fa/verify');

    const response = await request(`${BASE_URL}/2fa/verify`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            address: '0xabc123...',
            token: '123456',
            secret: 'MYSECRET'
        })
    });

    const body = await response.body.json();
    console.log('Status:', response.statusCode);
    console.log('Body:', body);

    if (response.statusCode === 200 && body.valid === false) {
        console.log('✅ verify passed');
    } else {
        console.error('❌ Failed to verify 2FA');
    }

    await app.close();
}
