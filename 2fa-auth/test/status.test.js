import { buildApp } from '../backend/server.js';
import { request } from 'undici';

const BASE_URL = 'http://localhost:4000';

export async function testStatus() {
    const app = await buildApp();
    await app.listen({ port: 4000 });

    console.log('🔐 Testing GET /2fa/status');

    const response = await request(`${BASE_URL}/2fa/status`);
    const body = await response.body.json();

    console.log('Status:', response.statusCode);
    console.log('Body:', body);

    if (response.statusCode === 200 && body.status) {
        console.log('✅ status passed');
    } else {
        console.error('❌ status check failed');
    }

    await app.close();
}
