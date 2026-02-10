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
    const payload = await readJson(req);
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
      const { data: profile, error: profileErr } = await supabase
        .from('educators')
        .select('id, role')
        .eq('id', authData.user.id)
        .maybeSingle();
      if (profileErr) {
        return json(500, { error: `Erreur profil admin: ${profileErr.message}` });
      }
      if (!profile || profile.role !== 'admin') {
        return json(403, { error: 'Admin requis' });
      }
      adminUserId = profile.id;
    } else {
      const { data: existing, error: existingErr } = await supabase.from('educators').select('id').limit(1);
      if (existingErr) {
        return json(500, { error: `Erreur lecture educators: ${existingErr.message}` });
      }
      if (existing && existing.length > 0) {
        return json(401, { error: 'Acces refuse' });
      }
    }

    let authUser = null;
    let createdNewUser = false;
    let createRes = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role,
        created_by: adminUserId || null,
        must_change_password: adminUserId ? true : false,
      },
    });

    if (createRes.error) {
      const msg = String(createRes.error.message || '').toLowerCase();
      if (msg.includes('already registered') || msg.includes('already') || msg.includes('exists')) {
        const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
        if (listErr) {
          return json(500, { error: `Erreur list users: ${listErr.message}` });
        }
        authUser = (list?.users || []).find(u => (u.email || '').toLowerCase() === email) || null;
        if (!authUser) {
          return json(409, { error: 'Email deja utilise' });
        }
      } else {
        return json(400, { error: createRes.error.message || 'Erreur creation auth' });
      }
    } else {
      authUser = createRes.data?.user || null;
      createdNewUser = Boolean(authUser?.id);
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
      if (createdNewUser && authUser?.id) {
        try {
          await supabase.auth.admin.deleteUser(authUser.id);
        } catch (cleanupErr) {
          console.warn('Cleanup auth user failed:', cleanupErr?.message || cleanupErr);
        }
      }
      return json(400, { error: `Erreur creation profil: ${eduErr.message}` });
    }

    return json(200, { ok: true, user: edu });
  } catch (err) {
    console.error('admin-create-user error', err);
    return json(500, { error: err?.message ? `Erreur interne: ${err.message}` : 'Erreur interne' });
  }
};
