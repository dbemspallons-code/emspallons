/**
 * Service de notifications automatiques
 * Gère les rappels de paiement, alertes d'expiration, etc.
 */

import { openWhatsAppWithMessage } from './whatsappService';
import { computePaymentStatus, computeSubscriptionStatus } from '../models/entities';
import { PAYMENT_STATUS } from '../models/entities';

// Cache pour éviter les notifications multiples
const notificationCache = new Map();
const NOTIFICATION_COOLDOWN = 24 * 60 * 60 * 1000; // 24 heures

/**
 * Vérifie si une notification a déjà été envoyée récemment
 */
function hasNotificationBeenSent(studentId, type) {
  const key = `${studentId}-${type}`;
  const lastSent = notificationCache.get(key);
  if (!lastSent) return false;
  
  const now = Date.now();
  return (now - lastSent) < NOTIFICATION_COOLDOWN;
}

/**
 * Marque une notification comme envoyée
 */
function markNotificationSent(studentId, type) {
  const key = `${studentId}-${type}`;
  notificationCache.set(key, Date.now());
}

/**
 * Envoie un rappel de paiement 3 jours avant expiration
 */
export async function sendPaymentReminder(student) {
  if (!student || !student.contact) return false;
  
  if (hasNotificationBeenSent(student.id, 'payment-reminder')) {
    return false;
  }

  try {
    const status = await computeSubscriptionStatus(student);
    
    // Envoyer un rappel si l'abonnement expire dans 3 jours ou moins
    if (status.daysRemaining <= 3 && status.daysRemaining > 0) {
      const message = `🔔 *Rappel de Paiement - Abonnement Transport*\n\n👤 Étudiant: ${student.name}\n📅 Votre abonnement expire dans ${status.daysRemaining} jour(s).\n💵 Veuillez régulariser votre paiement pour continuer à utiliser le service.\n\nMerci de votre compréhension.`;
      
      await openWhatsAppWithMessage(student.contact, message);
      markNotificationSent(student.id, 'payment-reminder');
      return true;
    }
  } catch (error) {
    console.warn('Erreur envoi rappel paiement:', error);
  }
  
  return false;
}

/**
 * Envoie une notification d'expiration le jour d'expiration
 */
export async function sendExpirationAlert(student) {
  if (!student || !student.contact) return false;
  
  if (hasNotificationBeenSent(student.id, 'expiration-alert')) {
    return false;
  }

  try {
    const status = await computeSubscriptionStatus(student);
    
    // Envoyer une alerte si l'abonnement expire aujourd'hui ou est expiré
    if (status.status === 'EXPIRÉ' || status.daysRemaining === 0) {
      const message = `⚠️ *Alerte d'Expiration - Abonnement Transport*\n\n👤 Étudiant: ${student.name}\n📅 Votre abonnement a expiré.\n💵 Veuillez renouveler votre abonnement pour continuer à utiliser le service.\n\nMerci de votre compréhension.`;
      
      await openWhatsAppWithMessage(student.contact, message);
      markNotificationSent(student.id, 'expiration-alert');
      return true;
    }
  } catch (error) {
    console.warn('Erreur envoi alerte expiration:', error);
  }
  
  return false;
}

/**
 * Envoie une notification pendant la période de grâce
 */
export async function sendGracePeriodAlert(student) {
  if (!student || !student.contact) return false;
  
  if (hasNotificationBeenSent(student.id, 'grace-alert')) {
    return false;
  }

  try {
    const status = await computeSubscriptionStatus(student);
    
    // Envoyer une alerte si l'étudiant est en période de grâce
    if (status.status === 'EN RETARD') {
      const message = `⏰ *Période de Grâce - Abonnement Transport*\n\n👤 Étudiant: ${student.name}\n📅 Votre abonnement est en période de grâce.\n⏳ Il vous reste ${status.daysRemaining} jour(s) pour régulariser votre paiement.\n💵 Veuillez régulariser rapidement pour éviter l'interruption du service.\n\nMerci de votre compréhension.`;
      
      await openWhatsAppWithMessage(student.contact, message);
      markNotificationSent(student.id, 'grace-alert');
      return true;
    }
  } catch (error) {
    console.warn('Erreur envoi alerte grâce:', error);
  }
  
  return false;
}

/**
 * Envoie une confirmation après paiement
 */
export async function sendPaymentConfirmation(student, paymentDetails) {
  if (!student || !student.contact) return false;

  try {
    const monthsText = paymentDetails.monthsLedger?.join(', ') || `${paymentDetails.monthsCount || 1} mois`;
    const total = (Number(paymentDetails.amountPerMonth || 0) * (paymentDetails.monthsCount || 1)).toLocaleString('fr-FR');
    const perMonth = Number(paymentDetails.amountPerMonth || 0).toLocaleString('fr-FR');
    
    const message = `✅ *Confirmation de Paiement - Abonnement Transport*\n\n👤 Étudiant: ${student.name}\n📅 Paiement enregistré le: ${new Date(paymentDetails.paidAt || Date.now()).toLocaleDateString('fr-FR')}\n🗓️ Mois couverts: ${monthsText}\n💵 Montant mensuel: ${perMonth} FCFA\n🧮 Total: ${total} FCFA\n\nMerci pour votre paiement. Votre abonnement est maintenant actif.`;
    
    await openWhatsAppWithMessage(student.contact, message);
    return true;
  } catch (error) {
    console.warn('Erreur envoi confirmation paiement:', error);
    return false;
  }
}

/**
 * Vérifie et envoie les notifications automatiques pour tous les étudiants
 */
export async function checkAndSendAutomaticNotifications(students) {
  if (!Array.isArray(students)) return { sent: 0, errors: 0 };
  
  let sent = 0;
  let errors = 0;
  
  for (const student of students) {
    try {
      // Rappel 3 jours avant expiration
      if (await sendPaymentReminder(student)) sent++;
      
      // Alerte d'expiration
      if (await sendExpirationAlert(student)) sent++;
      
      // Alerte période de grâce
      if (await sendGracePeriodAlert(student)) sent++;
    } catch (error) {
      console.warn(`Erreur notification pour ${student.id}:`, error);
      errors++;
    }
  }
  
  return { sent, errors };
}

/**
 * Réinitialise le cache des notifications (utile pour les tests)
 */
export function resetNotificationCache() {
  notificationCache.clear();
}

