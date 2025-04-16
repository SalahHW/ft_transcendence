console.log('🔁 Running all tests...\n');

await import('./sign.test.js');
await import('./verify.test.js');
await import('./logout.test.js');
await import('./refresh.test.js');

console.log('\n✅ All tests executed.');
