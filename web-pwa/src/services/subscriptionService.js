/**
 * Service de gestion des réabonnements et historique des abonnements
 */

import { supabase } from '../supabase/supabaseClient';

const SUBSCRIPTION_HISTORY_COLLECTION = 'subscriptionHistory';

/**
 * Récupère l'historique des abonnements pour un étudiant (Supabase)
 */
export async function fetchSubscriptionHistory(studentId) {
  try {
    const { data, error } = await supabase
      .from('subscription_history')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(d => ({
      id: d.id,
      studentId: d.student_id,
      startDate: d.start_date,
      expiresAt: d.expires_at,
      durationMonths: d.duration_months,
      amountPaid: d.amount_paid,
      paymentMethod: d.payment_method,
      busLine: d.bus_line,
      previousSubscriptionId: d.previous_subscription_id,
      createdAt: d.created_at,
      createdBy: d.created_by,
      createdByName: d.created_by_name,
      createdByEmail: d.created_by_email,
    }));
  } catch (error) {
    console.error('Erreur récupération historique abonnements (Supabase):', error);
    return [];
  }
}

/**
 * Enregistre un réabonnement (Supabase)
 */
export async function recordResubscription(resubscriptionData, options = {}) {
  const {
    studentId,
    startDate,
    durationMonths,
    amountPaid,
    paymentMethod,
    busLine,
    previousSubscriptionId,
  } = resubscriptionData;

  const startDateObj = new Date(startDate);
  const expiresAt = new Date(startDateObj);
  expiresAt.setMonth(expiresAt.getMonth() + durationMonths);

  const entry = {
    student_id: studentId,
    start_date: startDateObj.toISOString(),
    expires_at: expiresAt.toISOString(),
    duration_months: durationMonths,
    amount_paid: amountPaid,
    payment_method: paymentMethod || 'Non spécifié',
    bus_line: busLine || null,
    previous_subscription_id: previousSubscriptionId || null,
    created_by: options.userId || null,
    created_by_name: options.userName || null,
    created_by_email: options.userEmail || null,
  };

  try {
    const { data, error } = await supabase.from('subscription_history').insert([entry]).select().maybeSingle();
    if (error) throw error;
    return { id: data.id, ...entry, createdAt: data.created_at };
  } catch (error) {
    console.error('Erreur recordResubscription (Supabase):', error);
    throw error;
  }
}


