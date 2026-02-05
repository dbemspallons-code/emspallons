import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initAuth, onAuthStateChanged, signIn, createUserWithEmailAndPassword, updatePassword, signOut, getEducatorById, setEducator, anyEducatorExists } from '../services/supabaseAuthAdapter';
import { Lock, User, Mail, Eye, EyeOff, Key } from 'lucide-react';
import { AuthProvider } from '../context/AuthContext';

// Initialiser le client Supabase (adaptateur)
try {
  initAuth();
  console.log('Supabase auth initialisé via adapter');
} catch (error) {
  console.warn('Erreur initialisation Supabase auth:', error);
}

export default function AuthGuard({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [requireTwoFactor, setRequireTwoFactor] = useState(false);
  const [twoFactorVerified, setTwoFactorVerified] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');
  const [accountExists, setAccountExists] = useState(false);
  const [checkingAccount, setCheckingAccount] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Vérifier s'il existe déjà un compte (Admin ou Éducateur)
  useEffect(() => {
    const checkExistingAccount = async () => {
      try {
        const exists = await anyEducatorExists();
        setAccountExists(Boolean(exists));
      } catch (error) {
        console.warn('Erreur lors de la vérification des comptes existants (Supabase):', error);
        setAccountExists(false);
      } finally {
        setCheckingAccount(false);
      }
    };

    checkExistingAccount();
  }, []);

  // Historique de connexion pour sécurité
  const [loginHistory, setLoginHistory] = useState([]);
  const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 heures

  useEffect(() => {
    // Session timeout and last activity tracking (independent of provider)
    const checkSessionExpiry = () => {
      const lastActivity = localStorage.getItem('last_activity');
      if (lastActivity) {
        const lastActivityTime = parseInt(lastActivity, 10);
        const now = Date.now();
        if (now - lastActivityTime > SESSION_TIMEOUT) {
          // Session expirée, déconnexion automatique via Supabase
          signOut().catch(err => console.warn('Erreur déconnexion session expirée (Supabase):', err));
        }
      }
    };

    const updateLastActivity = () => {
      localStorage.setItem('last_activity', Date.now().toString());
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, updateLastActivity, { passive: true });
    });

    const expiryInterval = setInterval(checkSessionExpiry, 60 * 1000);

    // Subscribe to Supabase auth state changes
    const unsubscribe = onAuthStateChanged(async (authUser) => {
      try {
        if (authUser) {
          const loginEntry = {
            timestamp: new Date().toISOString(),
            email: authUser.email,
            uid: authUser.id || authUser.uid || authUser.sub,
          };
          setLoginHistory(prev => [loginEntry, ...prev.slice(0, 9)]);

          try {
            const uid = authUser.id || authUser.uid || authUser.sub;
            const eduData = await getEducatorById(uid);
            if (eduData) {
              const role = eduData.role === 'admin' ? 'admin' : 'educator';
              setUser({ ...authUser, ...eduData, role, name: eduData.name || authUser.email?.split('@')[0] || 'Utilisateur' });
              const must2FA = !!(eduData?.twoFactor && eduData.twoFactor.enabled === true);
              setRequireTwoFactor(must2FA);
              setTwoFactorVerified(!must2FA);

              try {
                await setEducator(uid, {
                  ...eduData,
                  role,
                  lastLogin: new Date().toISOString(),
                  loginHistory: [...(eduData.loginHistory || []).slice(0, 9), loginEntry],
                });
              } catch (logError) {
                console.warn('Erreur enregistrement historique connexion (Supabase):', logError);
              }
            } else {
              const isFirstAccount = !(await anyEducatorExists());
              const defaultRole = isFirstAccount ? 'admin' : 'educator';
              const id = uid;
              await setEducator(id, {
                id,
                email: authUser.email,
                name: authUser.email?.split('@')[0] || 'Utilisateur',
                role: defaultRole,
                created_at: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                loginHistory: [loginEntry],
              });
              setUser({ ...authUser, role: defaultRole, name: authUser.email?.split('@')[0] || 'Utilisateur' });
              setRequireTwoFactor(false);
              setTwoFactorVerified(true);
            }
          } catch (dbError) {
            console.warn('Erreur Supabase, utilisation mode local:', dbError);
            setUser(authUser);
            setRequireTwoFactor(false);
            setTwoFactorVerified(true);
          }

          updateLastActivity();
        } else {
          setUser(null);
          setRequireTwoFactor(false);
          setTwoFactorVerified(false);
          localStorage.removeItem('last_activity');
        }
      } catch (error) {
        console.error('Erreur dans AuthGuard (Supabase):', error);
        setUser(null);
        setRequireTwoFactor(false);
        setTwoFactorVerified(false);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      clearInterval(expiryInterval);
      events.forEach(event => {
        document.removeEventListener(event, updateLastActivity);
      });
    };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await signIn({ email: formData.email, password: formData.password });
      if (res?.error) throw res.error;
      setShowLogin(false);
    } catch (err) {
      const message = err?.message || err?.error_description || 'Email ou mot de passe incorrect';
      setError(message);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      const res = await createUserWithEmailAndPassword({ email: formData.email, password: formData.password });
      if (res?.error) throw res.error;
      const newUser = res.user || res.data?.user || res;

      const isFirstAccount = !(await anyEducatorExists());
      const defaultRole = isFirstAccount ? 'admin' : 'educator';
      const id = newUser.id || newUser.uid;

      await setEducator(id, {
        id,
        email: formData.email,
        name: formData.email?.split('@')[0] || 'Utilisateur',
        role: defaultRole,
        created_at: new Date().toISOString(),
      });

      setAccountExists(true);
      setShowLogin(false);
    } catch (err) {
      const msg = (err?.message || '').includes('already') || err?.status === 409 ? 'Cet email est déjà utilisé' : (err?.message || 'Erreur création compte');
      setError(msg);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    try {
      const res = await updatePassword(formData.newPassword);
      if (res?.error) throw res.error;
      setError('');
      setShowChangePassword(false);
      setFormData({ ...formData, newPassword: '', confirmPassword: '' });
      alert('Mot de passe modifié avec succès !');
    } catch (err) {
      setError(err?.message || 'Veuillez vous reconnecter avant de changer votre mot de passe');
    }
  };

  const handleLogout = useCallback(async () => {
    try {
      if (user) {
        try {
          await setEducator(user.uid, { lastLogout: new Date().toISOString() });
        } catch (err) {
          console.warn('Erreur enregistrement déconnexion (Supabase):', err);
        }
      }
      await signOut();
    } catch (err) {
      console.warn('Erreur lors de la déconnexion (Supabase):', err);
    } finally {
      setUser(null);
      setShowLogin(true);
      setRequireTwoFactor(false);
      setTwoFactorVerified(false);
      localStorage.removeItem('last_activity');
    }
  }, [user]);

  const refreshUserProfile = useCallback(async () => {
    try {
      if (!user) return;
      const data = await getEducatorById(user.uid);
      if (data) {
        setUser(prev => (prev ? { ...prev, ...data } : { ...data, uid: user.uid }));
      }
    } catch (err) {
      console.warn('Impossible de rafraîchir le profil éducatrice (Supabase):', err);
    }
  }, [user]);

  const authContextValue = useMemo(() => ({
    user,
    loading,
    requireTwoFactor,
    twoFactorVerified,
    loginHistory,
    refreshUser: refreshUserProfile,
    logout: handleLogout,
  }), [user, loading, requireTwoFactor, twoFactorVerified, loginHistory, refreshUserProfile, handleLogout]);

  if (loading || checkingAccount) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Chargement...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #facc15 0%, #22c55e 100%)',
        padding: '2rem'
      }}>
        <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              marginBottom: '0.5rem',
              color: '#0f172a'
            }}>
              EMSP
            </div>
            <div style={{ 
              fontSize: '0.9rem', 
              color: '#475569',
              marginBottom: '0.25rem'
            }}>
              Ecole Multinationale Supérieure
            </div>
            <div style={{ 
              fontSize: '0.9rem', 
              color: '#475569'
            }}>
              des Postes d'Abidjan
            </div>
          </div>
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '1rem' }}>
            {showLogin ? 'Connexion Éducatrice' : 'Créer un compte Éducatrice'}
          </h2>
          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
            {showLogin 
              ? 'Accès protégé - Authentification requise pour les éducatrices'
              : 'Création du compte éducatrice (accès complet)'}
          </p>
          <div style={{
            padding: '0.75rem',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            color: '#2563eb',
            textAlign: 'center'
          }}>
            💡 <strong>Astuce :</strong> Si vous n'avez pas d'authentificateur ou souhaitez un accès libre, utilisez le rôle <strong>Chauffeur</strong> depuis le menu principal.
          </div>
          <button
            type="button"
            className="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.localStorage.setItem('bus_app_role', 'driver');
                window.location.reload();
              }
            }}
            style={{
              width: '100%',
              marginBottom: '1rem',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              color: 'white',
              border: 'none',
              fontWeight: 'bold'
            }}
          >
            🚌 Accéder en mode Chauffeur (sans authentification)
          </button>
          {error && (
            <div style={{ 
              padding: '0.75rem', 
              background: 'rgba(220, 38, 38, 0.1)', 
              border: '1px solid rgba(220, 38, 38, 0.3)',
              borderRadius: '8px',
              marginBottom: '1rem',
              color: '#dc2626',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}
          <form onSubmit={showLogin ? handleLogin : handleRegister}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                <Mail size={16} />
                Email
              </label>
              <input
                className="input-field"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="votre.email@emsp.ci"
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                <Lock size={16} />
                Mot de passe
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input-field"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button className="button" type="submit" style={{ width: '100%', marginBottom: '1rem' }}>
              {showLogin ? 'Se connecter' : 'Créer le compte'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowLogin(!showLogin);
                setError('');
                setFormData({ ...formData, password: '' });
              }}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: '#2563eb',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '0.9rem'
              }}
            >
              {showLogin ? 'Créer un nouveau compte' : 'J\'ai déjà un compte'}
            </button>
            {accountExists && !showLogin && (
              <div style={{
                padding: '0.75rem',
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '8px',
                marginTop: '1rem',
                color: '#1d4ed8',
                fontSize: '0.85rem',
                textAlign: 'center'
              }}>
                ℹ️ Un autre compte existe déjà. Utilisez un nouvel email pour créer un accès supplémentaire.
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider value={authContextValue}>
    <div>
      {/* Si 2FA requis et pas encore validé, afficher un écran de validation */}
      {user && requireTwoFactor && !twoFactorVerified ? (
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
          padding: '2rem'
        }}>
          <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '2rem' }}>
            <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '1rem' }}>
              Code d'authentification requis
            </h2>
            <p className="subtitle" style={{ textAlign: 'center', marginBottom: '1rem' }}>
              Entrez le code 2FA fourni par votre authentificateur.
            </p>
            {twoFactorError && (
              <div style={{ 
                padding: '0.75rem', 
                background: 'rgba(220, 38, 38, 0.1)', 
                border: '1px solid rgba(220, 38, 38, 0.3)',
                borderRadius: '8px',
                marginBottom: '1rem',
                color: '#dc2626',
                fontSize: '0.9rem'
              }}>
                {twoFactorError}
              </div>
            )}
            <form onSubmit={async (e) => {
              e.preventDefault();
              setTwoFactorError('');
              try {
                const db = ensureFirestore();
                if (!db) {
                  setTwoFactorError('Service indisponible. Réessayez plus tard.');
                  return;
                }
                const eduRef = doc(db, 'educators', user.uid);
                const eduSnap = await getDoc(eduRef);
                const eduData = eduSnap.exists() ? eduSnap.data() : null;
                const cfg = eduData?.twoFactor || null;
                if (!cfg || cfg.enabled !== true) {
                  // Pas de 2FA configuré finalement -> autoriser
                  setTwoFactorVerified(true);
                  return;
                }
                const expected = cfg.currentCode;
                const expiresAt = cfg.currentCodeExpiresAt;
                const nowTs = Date.now();
                let expMs = null;
                if (expiresAt && typeof expiresAt === 'object' && typeof expiresAt.toDate === 'function') {
                  expMs = expiresAt.toDate().getTime();
                } else if (typeof expiresAt === 'string') {
                  const d = new Date(expiresAt);
                  expMs = d.getTime();
                } else if (typeof expiresAt === 'number') {
                  expMs = expiresAt;
                }
                if (!expected || !expMs || Number.isNaN(expMs) || (nowTs > expMs)) {
                  setTwoFactorError('Code expiré. Veuillez demander un nouveau code.');
                  return;
                }
                const provided = (twoFactorCode || '').trim();
                if (!provided || provided.length < 4) {
                  setTwoFactorError('Entrez un code valide.');
                  return;
                }
                if (provided !== String(expected)) {
                  setTwoFactorError('Code invalide.');
                  return;
                }
                setTwoFactorVerified(true);
              } catch (tfErr) {
                console.warn('Erreur vérification 2FA:', tfErr);
                setTwoFactorError('Vérification impossible. Réessayez.');
              }
            }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Code à 6 chiffres</label>
              <input
                className="input-field"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.3rem' }}
              />
              <button className="button" type="submit" style={{ width: '100%', marginTop: '1rem' }}>
                Valider
              </button>
              <button
                className="button button--subtle"
                type="button"
                onClick={handleLogout}
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                Utiliser le rôle Chauffeur
              </button>
            </form>
          </div>
        </div>
      ) : (
        children
      )}
      {showChangePassword && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '2rem'
        }}>
          <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '2rem' }}>
            <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>
              Modifier le mot de passe
            </h2>
            {error && (
              <div style={{ 
                padding: '0.75rem', 
                background: 'rgba(220, 38, 38, 0.1)', 
                border: '1px solid rgba(220, 38, 38, 0.3)',
                borderRadius: '8px',
                marginBottom: '1rem',
                color: '#dc2626',
                fontSize: '0.9rem'
              }}>
                {error}
              </div>
            )}
            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                  <Key size={16} />
                  Nouveau mot de passe
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input-field"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    placeholder="••••••••"
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748b'
                    }}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                  <Key size={16} />
                  Confirmer le mot de passe
                </label>
                <input
                  className="input-field"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="button" type="submit" style={{ flex: 1 }}>
                  Modifier
                </button>
                <button
                  className="button button--subtle"
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false);
                    setError('');
                    setFormData({ ...formData, newPassword: '', confirmPassword: '' });
                  }}
                  style={{ flex: 1 }}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        display: 'flex',
        gap: '0.5rem',
        zIndex: 100
      }}>
        <button
          className="button button--subtle"
          type="button"
          onClick={() => setShowChangePassword(true)}
          style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
        >
          <Key size={14} style={{ marginRight: '0.25rem' }} />
          Changer mot de passe
        </button>
        <button
          className="button button--subtle"
          type="button"
          onClick={handleLogout}
          style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
        >
          <User size={14} style={{ marginRight: '0.25rem' }} />
          Déconnexion
        </button>
      </div>
    </div>
  </AuthProvider>
  );
}


