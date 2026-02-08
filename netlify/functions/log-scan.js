import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Variables Supabase manquantes (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export default async (req, context) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  if (req.method === 'OPTIONS') return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  try {
    const payload = JSON.parse(req.body || '{}');
    const { studentId, status, paymentStatus, controllerId, controllerName, controllerCode, reason } = payload;
    if (!controllerId || !controllerCode) {
      return new Response(JSON.stringify({ error: 'controllerId et controllerCode requis' }), { status: 400, headers });
    }

    // Verify controller exists, is active and code matches
    const { data: controller, error: ctrlErr } = await supabase
      .from('controllers')
      .select('id, name, code, active, assigned_line_id')
      .eq('id', controllerId)
      .maybeSingle();
    if (ctrlErr) {
      console.error('Supabase select controller error', ctrlErr);
      return new Response(JSON.stringify({ error: 'Controleur invalide' }), { status: 403, headers });
    }
    if (!controller || controller.active === false) {
      return new Response(JSON.stringify({ error: 'Controleur inactif' }), { status: 403, headers });
    }
    const expectedCode = (controller.code || '').toUpperCase();
    const providedCode = String(controllerCode || '').trim().toUpperCase();
    if (!expectedCode || providedCode !== expectedCode) {
      return new Response(JSON.stringify({ error: 'Code controleur invalide' }), { status: 403, headers });
    }

    // Optional line check if student exists
    if (studentId) {
      const { data: student, error: studentErr } = await supabase
        .from('subscribers')
        .select('id, bus_line')
        .eq('id', studentId)
        .maybeSingle();
      if (studentErr) {
        console.warn('Supabase select student error', studentErr);
      }
      if (student && controller.assigned_line_id && student.bus_line && student.bus_line !== controller.assigned_line_id) {
        return new Response(JSON.stringify({ error: 'Ligne non autorisee' }), { status: 403, headers });
      }
    }

    // Insert into scan_logs
    const { data, error } = await supabase
      .from('scan_logs')
      .insert([{
        student_id: studentId || null,
        status,
        payment_status: paymentStatus || null,
        controller_id: controllerId || null,
        controller_name: controllerName || controller.name || null,
        reason: reason || null,
      }])
      .select();

    if (error) {
      console.error('Supabase insert scan_logs error', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
    }

    // Also insert educator activity
    const { data: act, error: actErr } = await supabase
      .from('educator_activities')
      .insert([{ educator_id: controllerId || null, action: `SCAN_${status}`, meta: { studentId, paymentStatus, reason } }])
      .select();

    if (actErr) console.warn('Could not insert educator activity', actErr.message || actErr);

    return new Response(JSON.stringify({ success: true, scan: data[0] }), { status: 201, headers });
  } catch (err) {
    console.error('log-scan function error', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
};
