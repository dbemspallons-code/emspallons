/**
 * Service de gestion des classes et promotions d'étudiants
 */

import { supabase } from '../supabase/supabaseClient';

const CLASSES_COLLECTION = 'classes';
const PROMOS_COLLECTION = 'promos';

/**
 * Récupère toutes les promotions
 */
export async function fetchPromos() {
  try {
    const { data, error } = await supabase.from('promos').select('*').order('order_num', { ascending: true });
    if (error) throw error;
    return (data || []).map(d => ({ id: d.id, name: d.name, order: d.order_num, active: d.active }));
  } catch (error) {
    console.error('Erreur récupération promos (Supabase):', error);
    return [];
  }
}

/**
 * Crée une nouvelle promotion
 */
export async function createPromo(promoData, options = {}) {
  try {
    const row = { name: promoData.name.trim(), order_num: promoData.order || 0, active: promoData.active !== false, created_by: options.userId || null };
    const { data, error } = await supabase.from('promos').insert([row]).select().maybeSingle();
    if (error) throw error;
    return { id: data.id, name: data.name, order: data.order_num, active: data.active };
  } catch (error) {
    console.error('Erreur createPromo (Supabase):', error);
    throw error;
  }
}

/**
 * Met à jour une promotion
 */
export async function updatePromo(promoId, updates, options = {}) {
  try {
    const updateData = {};
    if (updates.name !== undefined) updateData.name = updates.name.trim();
    if (updates.order !== undefined) updateData.order_num = updates.order;
    if (updates.active !== undefined) updateData.active = updates.active;
    updateData.updated_by = options.userId || null;

    const { data, error } = await supabase.from('promos').update(updateData).eq('id', promoId).select().maybeSingle();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erreur updatePromo (Supabase):', error);
    throw error;
  }
}

/**
 * Supprime une promotion
 */
export async function deletePromo(promoId) {
  try {
    const { error } = await supabase.from('promos').delete().eq('id', promoId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erreur deletePromo (Supabase):', error);
    throw error;
  }
}

/**
 * Récupère toutes les classes
 */
export async function fetchClasses() {
  try {
    const { data, error } = await supabase.from('classes').select('*').order('name', { ascending: true });
    if (error) throw error;
    return (data || []).map(d => ({ id: d.id, name: d.name, promoId: d.promo_id, active: d.active }));
  } catch (error) {
    console.error('Erreur récupération classes (Supabase):', error);
    return [];
  }
}

/**
 * Crée une nouvelle classe
 */
export async function createClass(classData, options = {}) {
  try {
    const row = { name: classData.name.trim(), promo_id: classData.promoId || null, active: classData.active !== false, created_by: options.userId || null };
    const { data, error } = await supabase.from('classes').insert([row]).select().maybeSingle();
    if (error) throw error;
    return { id: data.id, name: data.name, promoId: data.promo_id, active: data.active };
  } catch (error) {
    console.error('Erreur createClass (Supabase):', error);
    throw error;
  }
}

/**
 * Met à jour une classe
 */
export async function updateClass(classId, updates, options = {}) {
  try {
    const updateData = {};
    if (updates.name !== undefined) updateData.name = updates.name.trim();
    if (updates.promoId !== undefined) updateData.promo_id = updates.promoId || null;
    if (updates.active !== undefined) updateData.active = updates.active;
    updateData.updated_by = options.userId || null;

    const { data, error } = await supabase.from('classes').update(updateData).eq('id', classId).select().maybeSingle();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erreur updateClass (Supabase):', error);
    throw error;
  }
}

/**
 * Supprime une classe
 */
export async function deleteClass(classId) {
  try {
    const { error } = await supabase.from('classes').delete().eq('id', classId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Erreur deleteClass (Supabase):', error);
    throw error;
  }
}

/**
 * Initialise les promotions par défaut (Licence 1, 2, 3, Master 1, 2)
 */
export async function initDefaultPromos(options = {}) {
  const db = ensureFirestore();
  if (!db) throw new Error('Firestore non disponible');
  
  const defaultPromos = [
    { name: 'Licence 1', order: 1 },
    { name: 'Licence 2', order: 2 },
    { name: 'Licence 3', order: 3 },
    { name: 'Master 1', order: 4 },
    { name: 'Master 2', order: 5 },
  ];
  
  try {
    // Vérifier si des promos existent déjà
    const existingPromos = await fetchPromos();
    if (existingPromos.length > 0) {
      return; // Ne pas créer si des promos existent déjà
    }
    
    // Créer les promos par défaut
    const ref = collection(db, PROMOS_COLLECTION);
    for (const promo of defaultPromos) {
      await addDoc(ref, {
        name: promo.name,
        order: promo.order,
        active: true,
        createdAt: serverTimestamp(),
        createdBy: options.userId || null,
      });
    }
  } catch (error) {
    console.error('Erreur initialisation promos par défaut:', error);
    throw error;
  }
}


