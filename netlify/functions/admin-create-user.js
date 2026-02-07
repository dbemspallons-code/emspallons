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
    const payload = JSON.parse(req.body || '{}');
    const email = (payload.email || '').trim().toLowerCase();
    const password = (payload.password || '').trim();
    const name = (payload.name || payload.nom || '').trim();
    const role = payload.role === 'admin' ? 'admin' : 'educateur';

    if (!email) return json(400, { error: 'Email requis' });
    if (!password || password.length < 6) return json(400, { error: 'Mot de passe invalide' });

    // Auth check: allow if admin OR if this is the first educator
    const token = getBearer(req);
    let adminUserId = null;
    if (token) {
      const { data: authData, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !authData?.user) {
        return json(401, { error: 'Acces refuse' });
      }
      const { data: profile } = await supabase
        .from('educators')
        .select('id, role')
        .eq('id', authData.user.id)
        .maybeSingle();
      if (!profile || profile.role !== 'admin') {
        return json(403, { error: 'Admin requis' });
      }
      adminUserId = profile.id;
    } else {
      const { data: existing } = await supabase.from('educators').select('id').limit(1);
      if (existing && existing.length > 0) {
        return json(401, { error: 'Acces refuse' });
      }
    }

    let authUser = null;
    let createRes = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role },
    });

    if (createRes.error) {
      const msg = String(createRes.error.message || '').toLowerCase();
      if (msg.includes('already registered') || msg.includes('already') || msg.includes('exists')) {
        const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
        authUser = (list?.users || []).find(u => (u.email || '').toLowerCase() === email) || null;
        if (!authUser) {
          return json(409, { error: 'Email deja utilise' });
        }
      } else {
        return json(400, { error: createRes.error.message || 'Erreur creation auth' });
      }
    } else {
      authUser = createRes.data?.user || null;
    }

    if (!authUser) {
      return json(500, { error: 'Utilisateur auth introuvable' });
    }

    const mustChange = adminUserId ? true : false;
    const educatorRow = {
      id: authUser.id,
      email,
      name,
      role,
      active: true,
      must_change_password: mustChange,
      created_by: adminUserId,
    };

    const { data: edu, error: eduErr } = await supabase
      .from('educators')
      .upsert(educatorRow)
      .select()
      .maybeSingle();
    if (eduErr) {
      return json(400, { error: eduErr.message || 'Erreur creation profil' });
    }

    return json(200, { ok: true, user: edu });
  } catch (err) {
    console.error('admin-create-user error', err);
    return json(500, { error: 'Internal error' });
  }
};

