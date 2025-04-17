console.log('🔁 Running all wallet-auth tests...\n');

await import('./requestMessage.test.js');
await import('./verify.test.js');

console.log('\n✅ All wallet-auth tests executed.');
