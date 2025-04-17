import { buildApp } from '../backend/server.js';
import jwt from 'jsonwebtoken';

const app = await buildApp();

const validToken = jwt.sign(
    { address: '0xabc123...', iat: Math.floor(Date.now() / 1000) },
    app.jwtKeys.private,
    { algorithm: 'RS256', expiresIn: '1h' }
);

const resValid = await app.inject({
    method: 'GET',
    url: '/jwt/verify',
    headers: { Authorization: `Bearer ${validToken}` }
});

console.log('VERIFY - Valid Token Status:', resValid.statusCode);
console.log('VERIFY - Valid Token Body:', resValid.body);
if (resValid.statusCode !== 200) {
    console.log('VERIFY - Error with valid token');
}

const expiredToken = jwt.sign(
    { address: '0xabc123...', iat: Math.floor(Date.now() / 1000) - 3600 },
    app.jwtKeys.private,
    { algorithm: 'RS256', expiresIn: '-1h' }
);

const resExpired = await app.inject({
    method: 'GET',
    url: '/jwt/verify',
    headers: { Authorization: `Bearer ${expiredToken}` }
});

console.log('VERIFY - Expired Token Status:', resExpired.statusCode);
if (resExpired.statusCode === 200) {
    console.log('VERIFY - Error: Expired token should fail');
}

const invalidToken = 'invalid_token';

const resInvalid = await app.inject({
    method: 'GET',
    url: '/jwt/verify',
    headers: { Authorization: `Bearer ${invalidToken}` }
});

console.log('VERIFY - Invalid Token Status:', resInvalid.statusCode);
if (resInvalid.statusCode === 200) {
    console.log('VERIFY - Error: Invalid token should fail');
}
