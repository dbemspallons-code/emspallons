import { getCurrentUser } from './authService';
import { supabase } from '../supabase/supabaseClient';
import { historyService } from './historyService';


const SESSION_STORAGE_KEY = 'active_controller_session';
const MAX_CONNECTION_HISTORY = 20;

function ensureArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [];
}

function normalizeController(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    nom: raw.nom,
    code: raw.code,
    actif: raw.actif !== false,
    creePar: raw.creePar || null,
    dateCreation: raw.dateCreation || null,
    derniereConnexion: raw.derniereConnexion || null,
    connexions: ensureArray(raw.connexions),
  };
}

function sanitizeController(controller) {
  if (!controller) return null;
  const { code, ...rest } = controller;
  return rest;
}

function formatCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    const index = Math.floor(Math.random() * alphabet.length);
    code += alphabet[index];
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

async function generateUniqueCode(existingControllers) {
  const controllers = existingControllers || await getAllControllers();
  let tries = 0;
  while (tries < 25) {
    const candidate = formatCode();
    const exists = controllers.some((controller) => {
      const code = controller.code || controller.password;
      return code?.toUpperCase() === candidate;
    });
    if (!exists) {
      return candidate;
    }
    tries += 1;
  }
  throw new Error('Impossible de générer un code contrôleur unique. Réessayez.');
}

export async function getAllControllers() {
  try {
    const { data, error } = await supabase.from('controllers').select('*');
    if (error) throw error;
    return (data || []).map(d => ({
      id: d.id,
      nom: d.name,
      name: d.name,
      code: d.code,
      actif: d.active,
      active: d.active,
      assignedLineId: d.assigned_line_id,
    })).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr'));
  } catch (error) {
    console.error('Erreur getAllControllers (Supabase):', error);
    return [];
  }
}

export function subscribeControllers(callback) {
  const channel = supabase.channel('public:controllers').on('postgres_changes', { event: '*', schema: 'public', table: 'controllers' }, () => {
    getAllControllers().then(callback).catch(err => console.error('subscribeControllers fetch failed', err));
  }).subscribe();

  return () => supabase.removeChannel(channel);
}

// Alias for legacy callers
export async function fetchControllers() {
  return getAllControllers();
}

export async function createController({ nom, code, actif = true, assignedLineId = null, password = null }) {
  if (!nom || !nom.trim()) {
    throw new Error('Le nom du contrôleur est requis');
  }
  if (!assignedLineId) {
    throw new Error('La ligne assignée est obligatoire');
  }

  const trimmedName = nom.trim();
  const upperCode = (code || password || '').trim().toUpperCase();
  const controllers = await getAllControllers();
  const finalCode = upperCode || await generateUniqueCode(controllers);

  if (controllers.some((controller) => {
    const controllerCode = controller.code || controller.password;
    return controllerCode?.toUpperCase() === finalCode;
  })) {
    throw new Error('Ce code est déjà utilisé par un autre contrôleur');
  }

  const currentUser = await getCurrentUser().catch(() => null);

  try {
    const row = {
      name: trimmedName,
      code: finalCode,
      password: password || finalCode,
      active: actif !== false,
      assigned_line_id: assignedLineId || null,
      created_by: currentUser?.id || null,
    };
    const { data, error } = await supabase.from('controllers').insert([row]).select().maybeSingle();
    if (error) throw error;
    await historyService.log({ type: 'CONTROLLER_CREATED', entityId: data.id, entityType: 'CONTROLLER', action: 'CONTROLLER_CREATED', details: { name: trimmedName } });
    return { id: data.id, nom: data.name, name: data.name, code: data.code, actif: data.active, active: data.active, assignedLineId: data.assigned_line_id };
  } catch (error) {
    console.error('Erreur createController (Supabase):', error);
    throw error;
  }
}

export async function updateController(controllerId, updates) {
  if (!controllerId) {
    throw new Error('Identifiant contrôleur invalide');
  }

  const updateData = {};
  if (updates.nom !== undefined || updates.name !== undefined) {
    const name = (updates.nom || updates.name || '').trim();
    if (!name) throw new Error('Le nom du contrôleur est requis');
    updateData.name = name;
  }
  if (updates.actif !== undefined || updates.active !== undefined) {
    updateData.active = Boolean(updates.actif !== undefined ? updates.actif : updates.active);
  }

  if (updates.code !== undefined || updates.password !== undefined) {
    const requestedCode = (updates.code || updates.password || '').trim().toUpperCase();
    if (!requestedCode) throw new Error('Le code contrôleur ne peut pas être vide');
    const controllers = await getAllControllers();
    const exists = controllers.some((item) => {
      if (item.id === controllerId) return false;
      return (item.code || '').toUpperCase() === requestedCode;
    });
    if (exists) throw new Error('Ce code est déjà utilisé par un autre contrôleur');
    updateData.code = requestedCode;
    if (updates.password) updateData.password = updates.password;
  }

  if (updates.assignedLineId !== undefined) {
    if (!updates.assignedLineId) {
      throw new Error('La ligne assignée est obligatoire');
    }
    updateData.assigned_line_id = updates.assignedLineId || null;
  }

  const currentUser = await getCurrentUser().catch(() => null);

  try {
    const { data, error } = await supabase.from('controllers').update(updateData).eq('id', controllerId).select().maybeSingle();
    if (error) throw error;
    await historyService.log({ type: 'CONTROLLER_UPDATED', entityId: controllerId, entityType: 'CONTROLLER', action: 'CONTROLLER_UPDATED', details: { updates } });
    return data;
  } catch (error) {
    console.error('Erreur updateController (Supabase):', error);
    throw error;
  }
}

export async function regenerateControllerCode(controllerId) {
  const controllers = await getAllControllers();
  const controller = controllers.find((c) => c.id === controllerId);
  if (!controller) throw new Error('Contrôleur introuvable');

  const newCode = await generateUniqueCode(controllers);
  return updateController(controllerId, { code: newCode, password: newCode });
}

export async function deleteController(controllerId) {
  if (!controllerId) return;

  const currentUser = await getCurrentUser().catch(() => null);
  try {
    const { error } = await supabase.from('controllers').delete().eq('id', controllerId);
    if (error) throw error;
    await historyService.log({ type: 'CONTROLLER_DELETED', entityId: controllerId, entityType: 'CONTROLLER', action: 'CONTROLLER_DELETED', details: { deletedBy: currentUser?.id } });
    return { success: true };
  } catch (error) {
    console.error('Erreur deleteController (Supabase):', error);
    throw error;
  }
}

export async function authenticateController(accessCode) {
  const code = (accessCode || '').trim().toUpperCase();
  if (!code) throw new Error('Le code contrôleur est requis');

  try {
    const { data } = await supabase.from('controllers').select('*').eq('code', code).limit(1).maybeSingle();
    if (!data) throw new Error('Code invalide. Contactez l\'administration.');

    const controller = data;
    if (controller.active === false) throw new Error('Ce contrôleur est inactif. Contactez l\'administration.');

    const now = new Date();
    const entry = { timestamp: now.toISOString() };
    const connexions = Array.isArray(controller.connexions) ? controller.connexions : [];
    const newConnexions = [entry, ...connexions].slice(0, MAX_CONNECTION_HISTORY);

    await supabase.from('controllers').update({ derniere_connexion: entry.timestamp, connexions: newConnexions, last_login: now.toISOString() }).eq('id', controller.id);

    const sessionController = {
      id: controller.id,
      nom: controller.name,
      assignedLineId: controller.assigned_line_id || null,
    };

    saveControllerSession(sessionController);
    return sessionController;
  } catch (error) {
    console.error('Erreur authenticateController (Supabase):', error);
    throw error;
  }
}

export function saveControllerSession(controller) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
      ...controller,
      connectedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.warn('Impossible de sauvegarder la session contrôleur:', error);
  }
}

export function getControllerSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Impossible de récupérer la session contrôleur:', error);
    return null;
  }
}

export function clearControllerSession() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.warn('Impossible de supprimer la session contrôleur:', error);
  }
}

export function maskControllerCode(code) {
  if (!code) return '';
  const clean = code.replace(/\s+/g, '').toUpperCase();
  if (clean.length <= 4) return clean;
  return `${'•'.repeat(Math.max(0, clean.length - 4))}${clean.slice(-4)}`;
}

export async function getControllerById(controllerId) {
  if (!controllerId) return null;

  try {
    const { data, error } = await supabase
      .from('controllers')
      .select('*')
      .eq('id', controllerId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id,
      nom: data.name,
      name: data.name,
      code: data.code,
      actif: data.active,
      active: data.active,
      assignedLineId: data.assigned_line_id || null,
      connexions: Array.isArray(data.connexions) ? data.connexions : [],
      lastLogin: data.last_login || null,
      lastConnection: data.derniere_connexion || null,
    };
  } catch (error) {
    console.error('Erreur getControllerById (Supabase):', error);
    return null;
  }
}

export async function deactivateController(controllerId) {
  return updateController(controllerId, { actif: false });
}

export async function activateController(controllerId) {
  return updateController(controllerId, { actif: true });
}
