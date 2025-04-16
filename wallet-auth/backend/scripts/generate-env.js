import fs from 'fs';
import crypto from 'crypto';

const envPath = './.env';

if (fs.existsSync(envPath)) {
    console.log('.env already exists — skipping generation.');
    process.exit(0);
}

const jwtSecret = crypto.randomBytes(64).toString('hex');

const content = `JWT_SECRET=${jwtSecret}
PORT=4000
JWT_EXPIRE=900
`;

fs.writeFileSync(envPath, content);
console.log('.env generated successfully ✅');
