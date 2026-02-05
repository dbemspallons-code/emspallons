import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async (req, context) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  if (req.method === 'OPTIONS') return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  try {
    const payload = JSON.parse(req.body || '{}');
    const { studentId, status, paymentStatus, controllerId, controllerName, reason } = payload;

    // Insert into scan_logs
    const { data, error } = await supabase
      .from('scan_logs')
      .insert([{ student_id: studentId || null, status, payment_status: paymentStatus || null, controller_id: controllerId || null, controller_name: controllerName || null, reason: reason || null }])
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
