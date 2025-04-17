import { buildApp } from '../backend/server.js';
import jwt from 'jsonwebtoken';

const app = await buildApp();

const token = jwt.sign(
    { address: '0xabc123...', iat: Math.floor(Date.now() / 1000) },
    app.jwtKeys.private,
    { algorithm: 'RS256', expiresIn: '1h' }
);

const resLogout = await app.inject({
    method: 'POST',
    url: '/jwt/logout',
    headers: { Authorization: `Bearer ${token}` }
});

console.log('LOGOUT - Status:', resLogout.statusCode);
if (resLogout.statusCode !== 200) {
    console.log('LOGOUT - Error:', resLogout.body);
}

const resVerifyAfterLogout = await app.inject({
    method: 'GET',
    url: '/jwt/verify',
    headers: { Authorization: `Bearer ${token}` }
});

console.log('LOGOUT - Verify After Logout Status:', resVerifyAfterLogout.statusCode);
if (resVerifyAfterLogout.statusCode === 200) {
    console.log('LOGOUT - Error: Token should be revoked');
}
