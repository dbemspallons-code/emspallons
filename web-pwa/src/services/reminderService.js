/**
 * Service de gestion des rappels
 * Gère la configuration et l'envoi des rappels
 */

import { supabase } from '../supabase/supabaseClient';
import { getStudentById } from './studentService';

const REMINDERS_CONFIG_COLLECTION = 'remindersConfig';
const REMINDERS_LOG_COLLECTION = 'remindersLog';

/**
 * Types de rappels disponibles
 */
export const REMINDER_TYPES = {
  EXPIRING_SOON: 'expiring_soon', // Proche expiration (7 jours avant)
  EXPIRING_TODAY: 'expiring_today', // Jour d'expiration
  PAYMENT_OVERDUE: 'payment_overdue', // Retard de paiement
  SUBSCRIPTION_ENDED: 'subscription_ended', // Abonnement terminé
};

/**
 * Canaux d'envoi disponibles
 */
export const REMINDER_CHANNELS = {
  SMS: 'sms',
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
};

/**
 * Récupère la configuration des rappels (Supabase)
 */
export async function fetchRemindersConfig() {
  try {
    const { data, error } = await supabase.from('reminders_config').select('*').eq('id', 'global').maybeSingle();
    if (error) throw error;
    if (data) return data.config || getDefaultConfig();

    // Insert default config
    const defaultConfig = getDefaultConfig();
    const { data: ins, error: insErr } = await supabase.from('reminders_config').insert([{ id: 'global', config: defaultConfig }]).select().maybeSingle();
    if (insErr) { console.warn('Could not create default reminders_config:', insErr); }
    return defaultConfig;
  } catch (error) {
    console.error('Erreur récupération config rappels (Supabase):', error);
    return getDefaultConfig();
  }
}

function getDefaultConfig() {
  return {
    types: {
      [REMINDER_TYPES.EXPIRING_SOON]: {
        enabled: true,
        daysBefore: 7,
        template: 'Bonjour {nom_complet},\n\nVotre abonnement expire dans {jours_restants} jour(s) ({date_expiration}).\n\nVeuillez renouveler votre abonnement pour continuer à bénéficier du service.\n\nMerci.',
        channel: REMINDER_CHANNELS.WHATSAPP,
      },
      [REMINDER_TYPES.EXPIRING_TODAY]: {
        enabled: true,
        daysBefore: 0,
        template: 'Bonjour {nom_complet},\n\nVotre abonnement expire aujourd\'hui ({date_expiration}).\n\nVeuillez renouveler votre abonnement immédiatement.\n\nMerci.',
        channel: REMINDER_CHANNELS.WHATSAPP,
      },
      [REMINDER_TYPES.PAYMENT_OVERDUE]: {
        enabled: true,
        daysAfter: 3,
        template: 'Bonjour {nom_complet},\n\nVotre paiement est en retard de {jours_retard} jour(s).\n\nMontant dû : {montant} FCFA\n\nVeuillez régulariser votre situation.\n\nMerci.',
        channel: REMINDER_CHANNELS.WHATSAPP,
      },
      [REMINDER_TYPES.SUBSCRIPTION_ENDED]: {
        enabled: true,
        template: 'Bonjour {nom_complet},\n\nVotre abonnement a expiré le {date_expiration}.\n\nVotre accès au service a été révoqué. Veuillez renouveler votre abonnement.\n\nMerci.',
        channel: REMINDER_CHANNELS.WHATSAPP,
      },
    },
    schedule: {
      enabled: false,
      frequency: 'daily', // daily, weekly
      time: '08:00',
      daysOfWeek: [1, 2, 3, 4, 5], // Lundi à Vendredi
    },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Sauvegarde la configuration des rappels (Supabase)
 */
export async function saveRemindersConfig(config, options = {}) {
  try {
    const payload = { id: 'global', config: config, updated_by: options.userId || null };
    const { data, error } = await supabase.from('reminders_config').upsert([payload]).select().maybeSingle();
    if (error) throw error;
    return config;
  } catch (error) {
    console.error('Erreur saveRemindersConfig (Supabase):', error);
    throw error;
  }
}

/**
 * Envoie un rappel individuel (Supabase)
 */
export async function sendIndividualReminder(student, reminderType, options = {}) {
  const config = await fetchRemindersConfig();
  const typeConfig = config.types[reminderType];
  
  if (!typeConfig || !typeConfig.enabled) {
    throw new Error('Ce type de rappel n\'est pas activé');
  }

  const message = replaceTemplateVariables(typeConfig.template, student, reminderType);

  try {
    const logRow = {
      student_id: student.id,
      student_name: student.name || '',
      student_contact: student.contact || '',
      reminder_type: reminderType,
      channel: typeConfig.channel,
      message,
      status: 'pending',
      created_by: options.userId || null,
    };

    const { data: inserted, error: insertErr } = await supabase.from('reminders_log').insert([logRow]).select().maybeSingle();
    if (insertErr) throw insertErr;

    const logId = inserted.id;

    let sendResult = null;

    try {
      if (typeConfig.channel === REMINDER_CHANNELS.WHATSAPP) {
        const { openWhatsAppWithMessage } = await import('./whatsappService');
        if (!student.contact) throw new Error('Contact étudiant manquant');
        openWhatsAppWithMessage(student.contact, message);
        sendResult = 'WhatsApp ouvert';
      } else if (typeConfig.channel === REMINDER_CHANNELS.SMS) {
        throw new Error('Envoi SMS non encore implémenté');
      } else if (typeConfig.channel === REMINDER_CHANNELS.EMAIL) {
        throw new Error('Envoi Email non encore implémenté');
      }

      await supabase.from('reminders_log').update({ status: 'sent', sent_at: new Date().toISOString(), send_result: sendResult }).eq('id', logId);
      return { success: true, logId, sendResult };
    } catch (err) {
      await supabase.from('reminders_log').update({ status: 'failed', error: err.message, sent_at: new Date().toISOString() }).eq('id', logId);
      throw err;
    }
  } catch (error) {
    console.error('Erreur sendIndividualReminder (Supabase):', error);
    throw error;
  }
}

/**
 * Envoie des rappels groupés (Supabase)
 */
export async function sendBulkReminders(studentIds, reminderType, options = {}) {
  const results = [];
  for (const studentId of studentIds) {
    try {
      const student = await getStudentById(studentId);
      if (!student) continue;
      const result = await sendIndividualReminder(student, reminderType, options);
      results.push({ studentId, success: true, ...result });
    } catch (error) {
      results.push({ studentId, success: false, error: error.message });
    }
  }
  return results;
}

/**
 * Remplacer les variables dans un template
 */
function replaceTemplateVariables(template, student, reminderType) {
  const now = new Date();
  const expirationDate = student.subscription?.expiresAt ? new Date(student.subscription.expiresAt) : null;
  
  const variables = {
    nom: student.name?.split(' ')[0] || '',
    prenom: student.name?.split(' ').slice(1).join(' ') || '',
    nom_complet: student.name || '',
    contact: student.contact || '',
    ligne: student.busLine || '',
    date_expiration: expirationDate ? expirationDate.toLocaleDateString('fr-FR') : '',
    jours_restants: expirationDate ? Math.max(0, Math.ceil((expirationDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))) : 0,
    jours_retard: expirationDate ? Math.max(0, Math.ceil((now.getTime() - expirationDate.getTime()) / (24 * 60 * 60 * 1000))) : 0,
    montant: student.monthlyFee || 0,
  };
  
  let message = template;
  for (const [key, value] of Object.entries(variables)) {
    message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  
  return message;
}

/**
 * Récupère les logs de rappels (Supabase)
 */
export async function fetchRemindersLog(filters = {}) {
  try {
    let query = supabase.from('reminders_log').select('*').order('created_at', { ascending: false });

    if (filters.studentId) query = query.eq('student_id', filters.studentId);
    if (filters.reminderType) query = query.eq('reminder_type', filters.reminderType);
    if (filters.status) query = query.eq('status', filters.status);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(d => ({
      id: d.id,
      studentId: d.student_id,
      studentName: d.student_name,
      studentContact: d.student_contact,
      reminderType: d.reminder_type,
      channel: d.channel,
      message: d.message,
      status: d.status,
      sendResult: d.send_result,
      error: d.error,
      sentAt: d.sent_at,
      createdAt: d.created_at,
    }));
  } catch (error) {
    console.error('Erreur fetchRemindersLog (Supabase):', error);
    return [];
  }
}


