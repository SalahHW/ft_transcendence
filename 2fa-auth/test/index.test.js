import { testEnable2FA } from './enable2fa.test.js';
import { testVerify2FA } from './verify.test.js';
import { testStatus } from './status.test.js';

console.log('🔁 Running all 2FA tests...\n');

await testStatus();
await testVerify2FA();
await testEnable2FA();

console.log('\n✅ All 2FA tests executed.\n');
