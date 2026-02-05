import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  createStudent,
  deleteStudent as deleteStudentRemote,
  recordPayment,
  subscribeStudents,
  updateStudent as updateStudentRemote,
  fetchLines,
  saveLine as saveLineRemote,
  deleteLine as deleteLineRemote,
  issueNewPass,
  revokeStudentPass,
} from '../services/firestoreService';
import { BUS_LINES, PAYMENT_STATUS, getInitialStudent, isSubscriptionActive } from '../models/entities';

// MIGRATION FIRESTORE - Plus de cache localStorage, tout est synchronisé via Firestore

export function useStudents() {
  const [students, setStudents] = useState([]);
  const [lines, setLines] = useState(BUS_LINES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = subscribeStudents(remoteStudents => {
        try {
          setStudents(remoteStudents || []);
            setSynced(true);
        } catch (err) {
          console.warn('Erreur lors de la synchronisation:', err);
          setSynced(false);
        } finally {
          setLoading(false);
        }
      });
      fetchLines().then(setLines).catch(err => {
        console.warn('Erreur lors du chargement des lignes:', err);
        setLines(BUS_LINES);
      });
    } catch (err) {
      console.error('Erreur initialisation useStudents:', err);
      setSynced(false);
      setLoading(false);
    }
    return unsubscribe;
  }, []);

  const actions = useMemo(() => {
    // Plus de mise à jour locale, tout passe par Firestore

    return {
    async addStudent(payload, options = {}) {
      setLoading(true);
      try {
        const result = await createStudent(payload, options);
        setError(null);
        return result;
      } catch (err) {
        console.error('createStudent failed', err);
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    async updateStudent(studentId, updates, options = {}) {
      setLoading(true);
      try {
        const result = await updateStudentRemote(studentId, updates, options);
        setError(null);
        return result;
      } catch (err) {
        console.error('updateStudent failed', err);
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    async deleteStudent(studentId, options = {}) {
      try {
        await deleteStudentRemote(studentId, options);
        setError(null);
      } catch (err) {
        console.error('deleteStudent failed', err);
        setError(err);
        throw err;
      }
    },
    async registerPayment(studentId, { monthsCount, planId, paidAt, amountPerMonth }, extraOptions = {}) {
      setLoading(true);
      try {
        const result = await recordPayment(
          studentId,
          { monthsCount, paidAt, amountPerMonth },
          { planId, ...extraOptions },
        );
        // Mettre à jour immédiatement l'état local avec l'étudiant retourné (monthsPaid, monthsLedger, subscription, etc.)
        if (result && result.id) {
          updateStudentsLocal(prev =>
            prev.map(s => (s.id === result.id ? { ...s, ...result } : s))
          );
        }
        setError(null);
        return result;
      } catch (err) {
        console.error('recordPayment failed', err);
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    async toggleStatus(student, options = {}) {
      const nextStatus = computeNextStatus(student.paymentStatus, student);
      updateStudentsLocal(prev => prev.map(item => (item.id === student.id ? { ...item, paymentStatus: nextStatus } : item)));
      try {
        await updateStudentRemote(student.id, { paymentStatus: nextStatus }, options);
        setError(null);
      } catch (err) {
        console.error('toggleStatus failed', err);
        setError(err);
        throw err;
      }
    },
    async refreshPass(student, options) {
      try {
        return await issueNewPass(student.id, options);
      } catch (err) {
        console.error('issueNewPass failed', err);
        setError(err);
        throw err;
      }
    },
    async revokePass(studentId) {
      try {
        await revokeStudentPass(studentId);
        setError(null);
      } catch (err) {
        console.error('revokePass failed', err);
        setError(err);
        throw err;
      }
    },
    async saveLine(line) {
      try {
        const id = await saveLineRemote(line);
        setLines(prev => {
          const next = [...prev];
          const index = next.findIndex(item => item.id === (line.id || id));
          if (index >= 0) {
            next[index] = { ...line, id: line.id || id };
          } else {
            next.push({ ...line, id });
          }
          return next;
        });
        // Recharger les lignes depuis Firestore
        fetchLines().then(setLines).catch(err => {
          console.warn('Erreur lors du rechargement des lignes:', err);
        });
      } catch (err) {
        console.error('saveLine failed', err);
        setError(err);
        throw err;
      }
    },
    async deleteLine(lineId) {
      try {
        await deleteLineRemote(lineId);
        setLines(prev => prev.filter(line => line.id !== lineId));
        // Recharger les lignes depuis Firestore
        fetchLines().then(setLines).catch(err => {
          console.warn('Erreur lors du rechargement des lignes:', err);
        });
      } catch (err) {
        console.error('deleteLine failed', err);
        setError(err);
        throw err;
      }
    },
  };
  }, []);

  return {
    students: Array.isArray(students) ? students : [],
    lines: Array.isArray(lines) ? lines : BUS_LINES,
    loading: Boolean(loading),
    error: error || null,
    synced: Boolean(synced),
    addStudent: actions.addStudent || (() => Promise.resolve()),
    deleteStudent: actions.deleteStudent || (() => Promise.resolve()),
    toggleStatus: actions.toggleStatus || (() => Promise.resolve()),
    updateStudent: actions.updateStudent || (() => Promise.resolve()),
    registerPayment: actions.registerPayment || (() => Promise.resolve()),
    refreshPass: actions.refreshPass || (() => Promise.resolve()),
    revokePass: actions.revokePass || (() => Promise.resolve()),
    saveLine: actions.saveLine || (() => Promise.resolve()),
    deleteLine: actions.deleteLine || (() => Promise.resolve()),
  };
}

// Plus de cache localStorage - tout est synchronisé via Firestore en temps réel

function computeNextStatus(currentStatus, student) {
  if (currentStatus === PAYMENT_STATUS.OUT_OF_SERVICE) {
    return PAYMENT_STATUS.UP_TO_DATE;
  }
  if (isSubscriptionActive(student)) {
    return PAYMENT_STATUS.LATE;
  }
  return PAYMENT_STATUS.OUT_OF_SERVICE;
}

