// Netlify Function: send-whatsapp
// POST { phone, message } -> returns wa.me link

export default async (req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-TEST, X-SCHEDULED-SECRET',
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
    const payload = await readJson();
    const { phone, message } = payload;
    if (!phone || !message) {
      return new Response(JSON.stringify({ error: 'phone and message are required' }), { status: 400, headers });
    }

    const normalized = phone.replace(/[^0-9+]/g, '');
    const encoded = encodeURIComponent(message);
    const waLink = `https://wa.me/${normalized}?text=${encoded}`;

    return new Response(JSON.stringify({ ok: true, waLink }), { status: 200, headers });
  } catch (err) {
    console.error('send-whatsapp error', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers });
  }
};
