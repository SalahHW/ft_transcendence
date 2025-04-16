import { buildApp } from '../backend/server.js';
import jwt from 'jsonwebtoken';

const app = await buildApp();

const signRes = await app.inject({
    method: 'POST',
    url: '/jwt/sign',
    payload: { address: '0xabc123...' }
});

const { refreshToken } = signRes.json();

const refreshRes = await app.inject({
    method: 'POST',
    url: '/jwt/refresh',
    payload: { refreshToken }
});

console.log('REFRESH - Status:', refreshRes.statusCode);
console.log('REFRESH - Body:', refreshRes.body);
if (refreshRes.statusCode !== 200) {
    console.log('REFRESH - Error:', refreshRes.body);
}

const { accessToken, refreshToken: newRefreshToken } = refreshRes.json();

const decodedAccess = jwt.decode(accessToken);

if (!decodedAccess) {
    console.log('REFRESH - Decoding failed: Token is invalid');
} else if (!decodedAccess.address || !decodedAccess.iat) {
    console.log('REFRESH - Invalid access token structure');
} else {
    console.log('REFRESH - Decoded Access Token:', decodedAccess);
}

if (!newRefreshToken) {
    console.log('REFRESH - No new refresh token received');
} else {
    console.log('REFRESH - New Refresh Token:', newRefreshToken);
}

const logoutRes = await app.inject({
    method: 'POST',
    url: '/jwt/logout',
    payload: {}
});

console.log('LOGOUT - Status:', logoutRes.statusCode);
console.log('LOGOUT - Body:', logoutRes.body);

const retryRefreshRes = await app.inject({
    method: 'POST',
    url: '/jwt/refresh',
    payload: { refreshToken: newRefreshToken }
});

console.log('REFRESH after LOGOUT - Status:', retryRefreshRes.statusCode);
console.log('REFRESH after LOGOUT - Body:', retryRefreshRes.body);
