#!/usr/bin/env node
// Simple local test script to invoke netlify function handler directly.
// Usage:
//  TEST_MODE=1 node scripts/test-send-whatsapp-twilio.js
// or (with secret validation):
//  SCHEDULED_JOB_SECRET=abc node scripts/test-send-whatsapp-twilio.js --secret abc

const path = require('path');
const fn = require(path.join(__dirname, '..', 'netlify', 'functions', 'send-whatsapp-twilio.js'));

async function run() {
  // Simple arg parsing: --secret=... and --test
  const argv = process.argv.slice(2);
  const secretArg = argv.find(a => a.startsWith('--secret='));
  const secret = secretArg ? secretArg.split('=')[1] : process.env.SCHEDULED_JOB_SECRET;
  const testFlag = argv.includes('--test') || process.env.TEST_MODE === '1';

  const event = {
    httpMethod: 'POST',
    headers: {},
    body: JSON.stringify({ phone: 'whatsapp:+33612345678', message: 'Test message depuis script local' })
  };

  if (secret) event.headers['x-scheduled-secret'] = secret;
  if (testFlag) event.headers['x-test'] = '1';

  const res = await fn.handler(event);
  console.log('Result:', res);
}

run().catch(err => { console.error(err); process.exit(1); });
