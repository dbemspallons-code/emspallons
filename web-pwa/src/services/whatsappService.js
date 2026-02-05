/**
 * Ouvre WhatsApp avec un message pré-rempli
 * Utilise le lien direct WhatsApp (whatsapp://send) qui ouvre l'application WhatsApp
 * @param {string} phone - Numéro de téléphone au format international (ex: +225123456789)
 * @param {string} text - Message à envoyer
 */
export function openWhatsAppWithMessage(phone, text) {
  // Nettoyer le numéro de téléphone (enlever espaces, tirets, etc.)
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // S'assurer que le numéro commence par +
  const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
  
  // Encoder le message pour l'URL
  const encodedMessage = encodeURIComponent(text);
  
  // Créer le lien WhatsApp
  // Format: whatsapp://send?phone=+225123456789&text=message
  const whatsappUrl = `whatsapp://send?phone=${formattedPhone}&text=${encodedMessage}`;
  const webUrl = `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodedMessage}`;
  
  // Détecter si on est sur desktop: ouvrir WhatsApp Web directement (évite blocages)
  const isDesktop = typeof navigator !== 'undefined' && !/Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent);
  if (isDesktop) {
    // Essayer d'ouvrir dans un nouvel onglet pour éviter les blocages
    try {
      window.open(webUrl, '_blank');
    } catch {}
  }
  
  // Tenter l'application native (mobile)
  try {
    window.location.href = whatsappUrl;
  } catch {}
  
  // Fallback: si WhatsApp n'est pas installé, ouvrir WhatsApp Web
  setTimeout(() => {
    // Ouvrir Web si l'app native n'a pas pris le relais
    try {
      window.open(webUrl, '_blank');
    } catch {}
  }, 500);
}

/**
 * Ouvre WhatsApp avec un message et une image (QR code)
 * Note: WhatsApp ne supporte pas l'envoi d'images directement via URL
 * Solution: Télécharger l'image automatiquement et ouvrir WhatsApp avec le message
 * L'utilisateur peut ensuite glisser-déposer l'image dans WhatsApp
 * @param {string} phone - Numéro de téléphone au format international
 * @param {string} text - Message à envoyer
 * @param {string} imageDataUrl - Image en base64 (data URL)
 */
export function openWhatsAppWithImage(phone, text, imageDataUrl) {
  // Nettoyer le numéro de téléphone
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
  
  // Encoder le message
  const encodedMessage = encodeURIComponent(text);
  
  // Télécharger l'image automatiquement pour que l'utilisateur puisse l'ajouter facilement
  try {
    const link = document.createElement('a');
    link.href = imageDataUrl;
    link.download = `QR-EMSP-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.warn('Impossible de télécharger l\'image QR:', err);
  }
  
  // Ouvrir WhatsApp avec le message
  const whatsappUrl = `whatsapp://send?phone=${formattedPhone}&text=${encodedMessage}`;
  window.location.href = whatsappUrl;
  
  // Afficher une instruction pour l'utilisateur après un court délai
  setTimeout(() => {
    // Ne pas afficher d'alerte si on est sur mobile (WhatsApp s'ouvre automatiquement)
    if (window.innerWidth > 768) {
      // Sur desktop, afficher une instruction
      const instruction = 'L\'image QR code a été téléchargée.\n\nInstructions:\n1. Glissez-déposez l\'image dans WhatsApp\n2. Ou ajoutez-la depuis vos téléchargements\n\nLe message est déjà pré-rempli dans WhatsApp.';
      if (window.confirm(instruction)) {
        // Si l'utilisateur confirme, ouvrir WhatsApp Web comme fallback
        const webUrl = `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodedMessage}`;
        window.open(webUrl, '_blank');
      }
    }
  }, 1500);
  
  // Fallback WhatsApp Web si WhatsApp mobile n'est pas installé
  setTimeout(() => {
    const webUrl = `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodedMessage}`;
    // Ne pas afficher de confirmation automatique, laisser l'utilisateur décider
  }, 2000);
}

// Service simple pour envoyer des messages via CallMeBot (test/dev) - CONSERVÉ POUR COMPATIBILITÉ
export async function sendWhatsAppMessage(phone, text, apiKey='VOTRE_CALLMEBOT_KEY') {
  // Par défaut, utiliser le lien direct WhatsApp au lieu de l'API CallMeBot
  // car c'est plus fiable et ne nécessite pas de clé API
  openWhatsAppWithMessage(phone, text);
  return Promise.resolve('WhatsApp ouvert');
  
  /* Ancien code CallMeBot (désactivé par défaut)
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apiKey)}`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Erreur envoi WhatsApp');
    return await resp.text();
  } catch (e) {
    console.error('WhatsApp send error', e);
    throw e;
  }
  */
}