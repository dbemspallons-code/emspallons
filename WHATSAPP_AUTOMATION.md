# Automatisation des relances WhatsApp (wa.me)

But: This project currently uses a simple Netlify Function to construct a wa.me deep link. Sending automated WhatsApp messages at scale requires WhatsApp Business API or a messaging provider (Twilio, MessageBird, 360dialog etc.) and credentials.

## 1) Fonction Netlify (fourni)
- `netlify/functions/send-whatsapp.js` accepte POST JSON { phone, message } et retourne `{ ok: true, waLink }`.
- Exemple d'appel client (fetchWithQueue):

```js
const res = await fetchWithQueue('/.netlify/functions/send-whatsapp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: '+33612345678', message: 'Bonjour, rappel paiement...' })
});
// si res.ok === true -> ouvrir res.waLink dans une nouvelle fenêtre
```

## 2) Option d'envoi automatique (requiert API externe)
- Pour envoyer automatiquement (sans action utilisateur) :
  - S'inscrire à WhatsApp Business API via un provider (Twilio, MessageBird, 360dialog, etc.).
  - Mettre les clés dans Netlify env vars (e.g., `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`).
  - Utiliser la fonction `netlify/functions/send-whatsapp-twilio.js` fournie pour envoyer via Twilio (configure sandbox / sender number on Twilio side).
  - Exemple d'appel sécurisé depuis le client :

```js
const res = await fetchWithQueue('/.netlify/functions/send-whatsapp-twilio', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: 'whatsapp:+33...', message: 'Bonjour, rappel paiement...' })
});

if (res && res.offline) {
  // mis en file
} else if (res && res.ok) {
  // message envoyé
}

**Sécurité & tests**:
- Si vous planifiez des exécutions (scheduler/cron), configurez une variable secrète `SCHEDULED_JOB_SECRET` et envoyez-la dans l'en-tête `X-SCHEDULED-SECRET` (le endpoint vérifie la valeur). Cela empêche les déclenchements non autorisés depuis l'extérieur.
- Pour les tests locaux, vous pouvez activer `TEST_MODE` (`TEST_MODE=1`) dans vos variables d'environnement ou ajouter l'en-tête `X-TEST: 1` à la requête; dans ce mode la fonction renvoie une réponse simulée sans appeler Twilio.

```

- Notes:
  - Twilio WhatsApp requires approved senders and templates for business messages in some regions.
  - Respecter RGPD et conserver le consentement des parents/guardian.
  - Voir `netlify/functions/send-whatsapp-twilio.js` pour l'exemple d'implémentation.

## 3) Template et bonnes pratiques
- Message préformaté : inclure identifiants (matricule, nom), session et lien de paiement si nécessaire.
- Respect RGPD : ne pas envoyer sans consentement. Loguer chaque envoi dans `educator_activities`.
- Limiter la fréquence (ex: 1 relance par semaine) et ajouter opt-out.

## 4) Exemple de webhook automatique
- Vous pouvez déclencher la fonction depuis un scheduler (external cron) ou via un trigger Supabase (cron + edge function):
  - 1) Récupérer abonnés impayés; 2) Appeler `/send-whatsapp` pour générer le wa.me link; 3) Envoyer pour approbation ou ouvrir link côté opérateur.

--

Si tu veux, je peux :
- intégrer l'envoi via Twilio (exemple de code + variables env), ou
- créer un script qui parcourt `payments` impayés et génère des messages en batch (à exécuter comme job Netlify).