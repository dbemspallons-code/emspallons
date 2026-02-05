/**
 * Service d'historique
 * MIGRATION FIRESTORE - Utilise Firestore au lieu de localStorage
 */

import { supabase } from '../supabase/supabaseClient';
import { getCurrentUser } from './authService';

const HISTORY_COLLECTION = 'systemHistory';

export class HistoryService {
  async log(entry) {
    const currentUser = await getCurrentUser().catch(() => null);
    const row = {
      user_id: entry.userId || currentUser?.id || null,
      user_name: entry.userName || currentUser?.name || currentUser?.nom || null,
      type: entry.type,
      entity_id: entry.entityId || null,
      entity_type: entry.entityType || null,
      action: entry.action,
      details: entry.details || {},
    };

    try {
      const { data, error } = await supabase.from('system_history').insert([row]).select().maybeSingle();
      if (error) throw error;
      return { id: data.id, ...row, createdAt: data.created_at };
    } catch (error) {
      console.error('Erreur historyService.log (Supabase):', error);
      return null;
    }
  }

  async getAll(limitCount = 1000) {
    try {
      const { data, error } = await supabase.from('system_history').select('*').order('created_at', { ascending: false }).limit(limitCount);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erreur historyService.getAll (Supabase):', error);
      return [];
    }
  }

  async getByEntity(entityId, limitCount = 100) {
    try {
      const { data, error } = await supabase.from('system_history').select('*').eq('entity_id', entityId).order('created_at', { ascending: false }).limit(limitCount);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erreur historyService.getByEntity (Supabase):', error);
      return [];
    }
  }

  async getByType(type, limitCount = 100) {
    try {
      const { data, error } = await supabase.from('system_history').select('*').eq('type', type).order('created_at', { ascending: false }).limit(limitCount);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erreur historyService.getByType (Supabase):', error);
      return [];
    }
  }

  async getByDateRange(start, end, limitCount = 100) {
    try {
      const { data, error } = await supabase.from('system_history').select('*').gte('created_at', new Date(start).toISOString()).lte('created_at', new Date(end).toISOString()).order('created_at', { ascending: false }).limit(limitCount);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erreur historyService.getByDateRange (Supabase):', error);
      return [];
    }
  }

  async clear() {
    // Deleting all history requires an admin endpoint (service role key)
    console.warn('clear() non implémenté ici - utilisez une fonction server-side sécurisée');
  }
}

export const historyService = new HistoryService();

/**
 * Adaptateur pour logAction (compatibilité avec le nouveau code)
 * Convertit le format logAction vers le format log existant
 */
export async function logAction(actionData) {
  const db = ensureFirestore();
  if (!db) {
    console.warn('Firestore non disponible pour logAction');
    return null;
  }

  const currentUser = await getCurrentUser().catch(() => null);
  
  // Convertir le format logAction vers le format log
  const entry = {
    type: actionData.action || 'USER_ACTION',
    entityId: actionData.targetId || null,
    entityType: actionData.targetRole || actionData.subjectType || 'user',
    action: actionData.action || 'UNKNOWN',
    details: {
      actorId: actionData.actorId,
      actorName: actionData.actorName,
      actorRole: actionData.actorRole,
      targetId: actionData.targetId,
      targetName: actionData.targetName,
      targetRole: actionData.targetRole,
      metadata: actionData.metadata || {},
    },
    userId: actionData.actorId || currentUser?.id || null,
    userName: actionData.actorName || currentUser?.name || currentUser?.nom || null,
  };

  return await historyService.log(entry);
}

