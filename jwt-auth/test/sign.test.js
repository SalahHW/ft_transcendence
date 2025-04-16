import { buildApp } from '../backend/server.js';
import jwt from 'jsonwebtoken';

const app = await buildApp();

const res = await app.inject({
    method: 'POST',
    url: '/jwt/sign',
    payload: { address: '0xabc123...' }
});

console.log('SIGN - Status:', res.statusCode);
if (res.statusCode !== 200) {
    console.log('SIGN - Error:', res.body);
}
const { accessToken, refreshToken } = res.json();

console.log('SIGN - Access Token:', accessToken);
console.log('SIGN - Refresh Token:', refreshToken);
if (!accessToken || !refreshToken) {
    console.log('SIGN - Tokens missing');
}

const decodedAccess = jwt.decode(accessToken);
console.log('SIGN - Decoded Access Token:', decodedAccess);

if (!decodedAccess.address || !decodedAccess.iat) {
    console.log('SIGN - Invalid access token structure');
}

console.log('SIGN - Test completed successfully');
