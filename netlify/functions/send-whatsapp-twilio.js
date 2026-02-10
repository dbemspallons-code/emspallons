// Netlify Function: send-whatsapp-twilio
// Requires env: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
// Optional env: SCHEDULED_JOB_SECRET (header X-SCHEDULED-SECRET)
// TEST_MODE=1 to skip real API call

export default async (req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-TEST, X-SCHEDULED-SECRET',
  };

  const getHeader = (name) => {
    if (!req) return '';
    if (req.headers?.get) {
      return req.headers.get(name) || req.headers.get(name.toLowerCase()) || '';
    }
    if (req.headers) {
      return req.headers[name] || req.headers[name.toLowerCase()] || '';
    }
    return '';
  };

  async function readJson() {
    try {
      if (req?.json) {
        return await req.json();
      }
    } catch (err) {
      // fallthrough
    }
    const raw = req?.body ?? req?.rawBody;
    if (!raw) return {};
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return {}; }
    }
    if (raw instanceof Uint8Array) {
      try { return JSON.parse(Buffer.from(raw).toString('utf8')); } catch { return {}; }
    }
    return raw || {};
  }

  if (req.method === 'OPTIONS') {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers });
  }

  try {
    const scheduledSecret = process.env.SCHEDULED_JOB_SECRET;
    if (scheduledSecret) {
      const provided = getHeader('x-scheduled-secret') || getHeader('X-SCHEDULED-SECRET') || '';
      if (!provided || provided !== scheduledSecret) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
      }
    }

    const payload = await readJson();
    const { phone, message } = payload;
    if (!phone || !message) {
      return new Response(JSON.stringify({ error: 'phone and message are required' }), { status: 400, headers });
    }

    const testMode = process.env.TEST_MODE === '1' || getHeader('x-test') === '1' || getHeader('X-TEST') === '1';
    if (testMode) {
      return new Response(JSON.stringify({ ok: true, sid: 'test-sid', test: true }), { status: 200, headers });
    }

    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM;
    if (!sid || !token || !from) {
      return new Response(JSON.stringify({ error: 'Twilio credentials not configured' }), { status: 500, headers });
    }

    const body = new URLSearchParams({
      To: phone,
      From: from,
      Body: message,
    });

    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error('Twilio error', data);
      return new Response(JSON.stringify({ error: data.message || 'Twilio error', details: data }), { status: resp.status, headers });
    }

    return new Response(JSON.stringify({ ok: true, sid: data.sid }), { status: 200, headers });
  } catch (err) {
    console.error('send-whatsapp-twilio error', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers });
  }
};
