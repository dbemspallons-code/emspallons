import { createClient } from '@supabase/supabase-js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

function json(status, payload) {
  return new Response(JSON.stringify(payload), { status, headers });
}

function getHeader(req, name) {
  if (!req) return '';
  if (req.headers?.get) {
    return req.headers.get(name) || req.headers.get(name.toLowerCase()) || '';
  }
  if (req.headers) {
    return req.headers[name] || req.headers[name.toLowerCase()] || '';
  }
  return '';
}

function getBearer(req) {
  const auth = getHeader(req, 'authorization') || getHeader(req, 'Authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

async function readJson(req) {
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

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return json(200, { ok: true });
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: 'Configuration Supabase manquante. Verifiez SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY.' });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const token = getBearer(req);
    if (!token) return json(401, { error: 'Acces refuse' });

    const { data: authData, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !authData?.user) return json(401, { error: 'Acces refuse' });

    const { data: profile } = await supabase
      .from('educators')
      .select('id, role')
      .eq('id', authData.user.id)
      .maybeSingle();
    if (!profile || profile.role !== 'admin') return json(403, { error: 'Admin requis' });

    const payload = await readJson(req);
    const userId = payload.userId;
    const newPassword = (payload.newPassword || '').trim();

    if (!userId) return json(400, { error: 'userId requis' });
    if (!newPassword || newPassword.length < 6) return json(400, { error: 'Mot de passe invalide' });

    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
    if (updateErr) return json(400, { error: updateErr.message || 'Erreur reset password' });

    await supabase.from('educators').update({ must_change_password: true }).eq('id', userId);

    return json(200, { ok: true });
  } catch (err) {
    console.error('admin-reset-password error', err);
    return json(500, { error: 'Erreur interne' });
  }
};
