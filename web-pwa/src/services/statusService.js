import { supabase } from '../supabase/supabaseClient';

// Recalculate subscriber status based on payments and grace period
export async function recalcStatuses({ graceDays = 5 } = {}) {
  // Fetch subscribers and latest payment per subscriber
  const { data: subs, error: subsErr } = await supabase.from('subscribers').select('*');
  if (subsErr) throw subsErr;

  const results = [];
  for (const s of subs) {
    const { data: payments } = await supabase
      .from('payments')
      .select('period_date')
      .eq('subscriber_id', s.id)
      .order('period_date', { ascending: false })
      .limit(1);

    let status = 'inactive';
    if (payments && payments.length > 0) {
      const lastPeriod = new Date(payments[0].period_date);
      const now = new Date();

      // If lastPeriod is this month or later, active
      if (lastPeriod.getFullYear() === now.getFullYear() && lastPeriod.getMonth() === now.getMonth()) {
        status = 'active';
      } else {
        // compute days since end of lastPeriod month
        const endOfMonth = new Date(lastPeriod.getFullYear(), lastPeriod.getMonth() + 1, 0);
        const diffDays = Math.ceil((now - endOfMonth) / (1000 * 60 * 60 * 24));
        if (diffDays <= graceDays) status = 'grace';
        else status = 'expired';
      }
    }

    results.push({ id: s.id, status });
  }

  // Optionally update statuses in DB (requires write permissions)
  // We return computed statuses so the UI can choose to sync
  return results;
}
