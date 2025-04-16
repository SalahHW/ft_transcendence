import { buildApp } from '../backend/server.js';

const app = await buildApp();

const res = await app.inject({
    method: 'POST',
    url: '/jwt/sign',
    payload: { address: '0xabc123...' }
});

console.log('Status:', res.statusCode);
console.log('Body:', res.body);
