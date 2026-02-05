/**
 * Firestore compatibility shim (DEPRECATED)
 * The project migrated to Supabase. This file keeps function signatures to ease migration,
 * but will not initialize Firebase/Firestore at runtime. Calls will return null and log warnings.
 */

let firebaseApp = null;
let firestoreInstance = null;

export function getFirebaseAppInstance() {
  console.warn('Deprecated: Firebase removed from runtime. getFirebaseAppInstance() returns null. Use Supabase services instead.');
  return null;
}

export function ensureFirestore() {
  console.warn('Deprecated: Firestore removed from runtime. ensureFirestore() returns null. Use Supabase services instead.');
  return null;
}

import { BUS_LINES } from '../models/entities';
import { supabase } from '../supabase/supabaseClient';
import * as studentService from './studentService';
import * as controllerService from './controllerService';
import * as userService from './supabaseUserService';
import * as scanService from './scanService';
import { historyService } from './historyService';

const LINES_STORAGE_KEY = 'custom_bus_lines';

// GESTION DES UTILISATEURS

export async function fetchUsers() {
  try {
    return await userService.fetchUsers();
  } catch (error) {
    console.error('fetchUsers (Supabase):', error);
    return [];
  }
}

export function subscribeUsers(callback) {
  return userService.subscribeUsers(callback);
}

export async function createUser(userData, options = {}) {
  try {
    return await userService.createUser(userData, options);
  } catch (error) {
    console.error('createUser (Supabase):', error);
    throw error;
  }
}

export async function updateUser(userId, updates, options = {}) {
  try {
    return await userService.updateUser(userId, updates);
  } catch (error) {
    console.error('updateUser (Supabase):', error);
    throw error;
  }
}

export async function deleteUser(userId, options = {}) {
  try {
    return await userService.deleteUser(userId);
  } catch (error) {
    console.error('deleteUser (Supabase):', error);
    throw error;
  }
}

// GESTION DES ÉTUDIANTS
export async function fetchStudentById(studentId) {
  try {
    return await studentService.getStudentById(studentId);
  } catch (error) {
    console.error('fetchStudentById (Supabase):', error);
    return null;
  }
}

export async function fetchStudents() {
  try {
    return await studentService.getAllStudents();
  } catch (error) {
    console.error('fetchStudents (Supabase):', error);
    return [];
  }
}

export function subscribeStudents(callback, opts = { intervalMs: 5000 }) {
  // Fallback polling subscription for students (Supabase Realtime can be plugged here later)
  let cancelled = false;
  async function fetchAndNotify() {
    if (cancelled) return;
    try {
      const students = await fetchStudents();
      callback(students);
    } catch (err) {
      console.warn('subscribeStudents fetch failed', err);
    }
  }
  fetchAndNotify();
  const id = setInterval(fetchAndNotify, opts.intervalMs || 5000);
  return () => { cancelled = true; clearInterval(id); };
}

export async function createStudent(studentData, options = {}) {
  try {
    return await studentService.createStudent(studentData);
  } catch (error) {
    console.error('createStudent (Supabase):', error);
    throw error;
  }
}

export async function updateStudent(studentId, updates, options = {}) {
  try {
    return await studentService.updateStudent(studentId, updates);
  } catch (error) {
    console.error('updateStudent (Supabase):', error);
    throw error;
  }
}

export async function deleteStudent(studentId, options = {}) {
  try {
    return await studentService.deleteStudent(studentId);
  } catch (error) {
    console.error('deleteStudent (Supabase):', error);
    throw error;
  }
}

// GESTION DES CONTRÔLEURS
export async function fetchControllers() {
  try {
    return await controllerService.fetchControllers();
  } catch (error) {
    console.error('fetchControllers (Supabase):', error);
    return [];
  }
}

export function subscribeControllers(callback) {
  return controllerService.subscribeControllers(callback);
}

function generateControllerCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export async function createController(controllerData, options = {}) {
  try {
    return await controllerService.createController(controllerData, options);
  } catch (error) {
    console.error('createController (Supabase):', error);
    throw error;
  }
}

export async function updateController(controllerId, updates, options = {}) {
  try {
    return await controllerService.updateController(controllerId, updates, options);
  } catch (error) {
    console.error('updateController (Supabase):', error);
    throw error;
  }
}

export async function deleteController(controllerId, options = {}) {
  try {
    return await controllerService.deleteController(controllerId, options);
  } catch (error) {
    console.error('deleteController (Supabase):', error);
    throw error;
  }
}

// GESTION DES LIGNES

export async function fetchLines() {
  try {
    const custom = JSON.parse(localStorage.getItem(LINES_STORAGE_KEY) || '[]');
    return [...BUS_LINES, ...custom];
  } catch (error) {
    console.warn('fetchLines fallback to BUS_LINES:', error);
    return BUS_LINES;
  }
}

export async function saveLine(lineData, options = {}) {
  try {
    const custom = JSON.parse(localStorage.getItem(LINES_STORAGE_KEY) || '[]');
    if (lineData.id) {
      const idx = custom.findIndex(c => c.id === lineData.id);
      if (idx !== -1) custom[idx] = { ...custom[idx], ...lineData };
      else custom.push({ ...lineData });
    } else {
      const id = `line_${Date.now()}`;
      custom.push({ id, name: lineData.name, color: lineData.color || '#888888' });
    }
    localStorage.setItem(LINES_STORAGE_KEY, JSON.stringify(custom));
    return { success: true };
  } catch (error) {
    console.error('saveLine error:', error);
    throw error;
  }
}

export async function deleteLine(lineId, options = {}) {
  try {
    const custom = JSON.parse(localStorage.getItem(LINES_STORAGE_KEY) || '[]').filter(l => l.id !== lineId);
    localStorage.setItem(LINES_STORAGE_KEY, JSON.stringify(custom));
    return { success: true };
  } catch (error) {
    console.error('deleteLine error:', error);
    throw error;
  }
}

// GESTION DES PAIEMENTS
export async function recordPaymentV2(paymentData, options = {}) {
  try {
    return await studentService.createPayment(paymentData);
  } catch (error) {
    console.error('recordPaymentV2 (Supabase):', error);
    throw error;
  }
}

export async function fetchPaymentsByMonth(year, month) {
  try {
    const start = new Date(year, month - 1, 1).toISOString();
    const end = new Date(year, month, 0, 23, 59, 59, 999).toISOString();
    const { data, error } = await supabase.from('payments').select('*').gte('created_at', start).lte('created_at', end).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('fetchPaymentsByMonth (Supabase):', error);
    return [];
  }
}

export async function fetchActivePaymentsForMonth(year, month) {
  try {
    const monthStart = new Date(year, month - 1, 1).toISOString();
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999).toISOString();
    // Assuming payments.period_date is stored as date; filter by created_at or period_date as appropriate
    const { data, error } = await supabase.from('payments').select('*').gte('created_at', monthStart).lte('created_at', monthEnd).order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('fetchActivePaymentsForMonth (Supabase):', error);
    return [];
  }
}

export async function recordPayment(studentId, paymentData, options = {}) {
  try {
    // Delegate to createPayment which handles business logic and history
    const payload = { studentId, ...paymentData };
    return await studentService.createPayment(payload);
  } catch (error) {
    console.error('recordPayment (Supabase):', error);
    throw error;
  }
}

// GESTION DES PARAMÈTRES GLOBAUX
export async function fetchGlobalSettings() {
  try {
    return JSON.parse(localStorage.getItem('global_settings') || '{}');
  } catch (error) {
    return {};
  }
}

export async function saveGlobalSettings(settings, options = {}) {
  try {
    const prev = await fetchGlobalSettings();
    const merged = { ...prev, ...settings };
    localStorage.setItem('global_settings', JSON.stringify(merged));
    return { success: true };
  } catch (error) {
    console.error('saveGlobalSettings (fallback):', error);
    return { success: false };
  }
}

export async function setPausePlatform(paused, options = {}) {
  return saveGlobalSettings({ pausePlatform: paused }, options);
}

// GESTION DES ACTIVITÉS ÉDUCATEUR
export async function logEducatorActivity(activity, options = {}) {
  try {
    return await historyService.log({ ...activity, userId: options.userId || null });
  } catch (error) {
    console.error('logEducatorActivity (Supabase/history):', error);
    throw error;
  }
}

export async function fetchEducatorActivity(limitCount = 100) {
  try {
    return await historyService.getAll(limitCount);
  } catch (error) {
    console.error('fetchEducatorActivity (Supabase/history):', error);
    return [];
  }
}

// GESTION DES SCANS
export async function resetTodayScanLogs() {
  // Prefer server-side deletion (requires service role). Try POST to admin Netlify function.
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch('/.netlify/functions/reset-scan-logs', { method: 'POST', headers });
    if (!res.ok) {
      console.warn('resetTodayScanLogs: server returned', res.status);
      return { success: false };
    }
    return { success: true };
  } catch (error) {
    console.warn('resetTodayScanLogs (fallback) failed:', error);
    return { success: false };
  }
}

export async function fetchScanLogs(filters = {}) {
  return await scanService.getScanLogs(filters.limit || 100);
}

// GESTION DES PASSES QR
export async function issueNewPass(studentId, options = {}) {
  try {
    const res = await (await import('./qrCodeService')).qrCodeService.requestServerQrToken(studentId);
    if (res && res.offline) return { offline: true };
    return res;
  } catch (error) {
    console.error('issueNewPass (server) failed, attempting local fallback:', error);
    // Fallback: create token locally and persist to qr_codes
    try {
      const token = `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const { data, error } = await supabase.from('qr_codes').insert([{ subscriber_id: studentId, token, status: 'active', created_at: new Date().toISOString() }]).select().maybeSingle();
      if (error) throw error;
      return { token: data.token, studentId };
    } catch (err) {
      console.error('issueNewPass fallback failed:', err);
      throw err;
    }
  }
}

export async function revokeStudentPass(studentId, options = {}) {
  try {
    const updates = { status: 'revoked', revoked_at: new Date().toISOString(), revoked_by: options.userId || null };
    const { data, error } = await supabase.from('qr_codes').update(updates).eq('subscriber_id', studentId);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('revokeStudentPass (Supabase):', error);
    throw error;
  }
}

// GESTION DES RAPPORTS MENSUELS
export async function saveMonthlyReport(reportData, options = {}) {
  try {
    const payload = { ...reportData, created_at: new Date().toISOString(), created_by: options.userId || null };
    const { data, error } = await supabase.from('monthly_reports').insert([payload]).select().maybeSingle();
    if (error) throw error;
    return { id: data.id, ...data };
  } catch (error) {
    console.error('saveMonthlyReport (Supabase):', error);
    throw error;
  }
}

export async function fetchMonthlyReports(limitCount = 12) {
  try {
    const count = Math.max(1, Math.min(500, limitCount));
    const { data, error } = await supabase.from('monthly_reports').select('*').order('created_at', { ascending: false }).limit(count);
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('fetchMonthlyReports (Supabase):', error);
    return [];
  }
}
