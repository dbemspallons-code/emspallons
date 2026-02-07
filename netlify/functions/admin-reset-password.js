import { createClient } from '@supabase/supabase-js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function json(status, payload) {
  return new Response(JSON.stringify(payload), { status, headers });
}

function getBearer(req) {
  const auth = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

export default async (req) => {
  if (req.method === 'OPTIONS') {
    return json(200, { ok: true });
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Method Not Allowed' });
  }

  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: 'Missing Supabase service configuration' });
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

    const payload = JSON.parse(req.body || '{}');
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
    return json(500, { error: 'Internal error' });
  }
};

