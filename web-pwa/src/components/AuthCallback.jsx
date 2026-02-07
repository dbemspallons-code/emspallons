import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../supabase/supabaseClient';

export default function AuthCallback() {
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('Verification en cours...');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
        if (error) throw error;
        if (!cancelled) {
          setStatus('success');
          setMessage('Votre lien est valide. Vous pouvez vous connecter.');
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setMessage('Lien invalide ou expire. Veuillez recommencer.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen app-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="ui-card ui-card--auth p-8">
          <div className="text-center mb-6">
            <div className="brand-emblem inline-flex items-center justify-center w-16 h-16 mb-4">
              {status === 'success' ? (
                <CheckCircle className="w-8 h-8 text-white" />
              ) : (
                <AlertCircle className="w-8 h-8 text-white" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1 brand-title">Confirmation</h1>
            <p className="text-gray-600">{message}</p>
          </div>

          <button
            type="button"
            onClick={() => { window.location.href = '/'; }}
            className="ui-btn ui-btn--primary w-full py-3"
          >
            Retour a la connexion
          </button>
        </div>
      </div>
    </div>
  );
}
