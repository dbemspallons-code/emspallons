/**
 * Service d'authentification multi-utilisateurs
 * Rôles: Admin et Éducateur
 * MIGRATION FIRESTORE - Utilise Firebase Auth + Firestore au lieu de localStorage
 */

import { fetchWithQueue } from './offlineService';
import { signIn, signOut as supabaseSignOut, createUserWithEmailAndPassword as supabaseCreateUserWithEmailAndPassword, updatePassword as supabaseUpdatePassword, getCurrentUser as getCurrentSupabaseUser, getEducatorById } from './supabaseAuthAdapter';
import { fetchUsers as fetchUsersSupabase, createUser as createUserSupabase, updateUser as updateUserSupabase, deleteUser as deleteUserSupabase } from './supabaseUserService';
import { getStorage, setStorage } from './storageService'; // Pour les utilisateurs récents uniquement (session)

const RECENT_USERS_KEY = 'recent_users';
const MAX_RECENT_USERS = 6;

/**
 * Structure utilisateur:
 * {
 *   id: string (unique),
 *   nom: string,
 *   email: string,
 *   motDePasse: string (hashé),
 *   role: 'admin' | 'educateur',
 *   creePar: string (userId),
 *   dateCreation: string (ISO)
 * }
 */

/**
 * Récupère tous les utilisateurs depuis Firestore
 */
export async function getAllUsers() {
  return await fetchUsersSupabase();
}

/**
 * Récupère un utilisateur par email depuis Firestore
 */
export async function getUserByEmail(email) {
  const users = await getAllUsers();
  return users.find(u => u.email === email);
}

/**
 * Récupère un utilisateur par ID depuis Firestore
 */
export async function getUserById(id) {
  try {
    const data = await getEducatorById(id);
    if (!data) return null;
    return { id: data.id || id, ...data };
  } catch (error) {
    console.error('Erreur getUserById (Supabase):', error);
    return null;
  }
}

/**
 * Crée un nouvel utilisateur (utilise Firestore)
 */
export async function createUser({ nom, email, motDePasse, role, creePar }) {
  const users = await getAllUsers();

  // Vérifier si l'email existe déjà
  if (users.some(u => u.email === email)) {
    throw new Error('Cet email est déjà utilisé');
  }

  // Vérifier le rôle
  if (role !== 'admin' && role !== 'educateur') {
    throw new Error('Rôle invalide');
  }

  // Créer l'utilisateur (client signUp + profile in educators table)
  const currentUser = await getCurrentUser().catch(() => null);
  const newUser = await createUserSupabase({
    email,
    password: motDePasse,
    name: nom,
    role,
  });

  // If role admin, call serverless to set admin claim
  if (role === 'admin' && newUser && newUser.id) {
    try {
      const res = await fetchWithQueue('/.netlify/functions/setAdminClaim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: newUser.id }),
      });
      if (res && res.offline) {
        console.warn('Avertissement: La mise à jour des custom claims a été mise en file pour synchronisation (offline)');
      } else if (res && res.ok === false) {
        console.warn('Avertissement: Les custom claims n\'ont pas pu être définis pour le nouvel admin');
      }
    } catch (error) {
      console.warn('Avertissement: Erreur lors de la mise à jour des claims:', error);
    }
  }

  return newUser;
}

/**
 * Vérifie les identifiants et connecte l'utilisateur (utilise Firebase Auth)
 */
export async function login(email, motDePasse) {
  const password = motDePasse; // Alias pour compatibilité
  try {
    const res = await signIn({ email, password });
    if (res.error) throw res.error;
    const user = res.data?.user || res.user || res.data?.session?.user || null;
    if (!user) throw new Error('Authentification échouée');

    // Récupérer le profil éducator dans Supabase
    const profile = await getEducatorById(user.id || user.uid);
    if (!profile) throw new Error('Compte utilisateur introuvable dans Supabase');

    const out = {
      id: user.id || user.uid,
      email: user.email,
      name: profile.name || profile.nom || email.split('@')[0] || 'Utilisateur',
      role: profile.role || 'educator',
      ...profile,
    };

    await addRecentUserEntry(out);
    return out;
  } catch (error) {
    // Map common errors
    if (error?.message && error.message.includes('invalid_password')) {
      throw new Error('Email ou mot de passe incorrect');
    }
    throw error;
  }
}

/**
 * Déconnecte l'utilisateur (utilise Firebase Auth)
 */
export async function logout() {
  await supabaseSignOut();
}

/**
 * Récupère l'utilisateur actuellement connecté (utilise Firebase Auth)
 */
export async function getCurrentUser() {
  try {
    const user = await getCurrentSupabaseUser();
    if (!user) return null;
    const profile = await getEducatorById(user.id);
    if (!profile) return null;
    return {
      id: user.id,
      uid: user.id,
      email: user.email,
      name: profile.name || profile.nom || user.email?.split('@')[0] || 'Utilisateur',
      role: profile.role || 'educator',
      ...profile,
    };
  } catch (error) {
    console.error('Erreur getCurrentUser (Supabase):', error);
    return null;
  }
}

/**
 * Vérifie si un utilisateur est connecté
 */
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Vérifie si l'utilisateur est Admin
 */
export async function isAdmin() {
  const user = await getCurrentUser();
  return user && user.role === 'admin';
}

/**
 * Vérifie si l'utilisateur peut créer des comptes (Admin uniquement)
 */
export async function canCreateUsers() {
  return await isAdmin();
}

/**
 * Met à jour un utilisateur (utilise Firestore)
 */
export async function updateUser(userId, updates) {
  const users = await getAllUsers();
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    throw new Error('Utilisateur introuvable');
  }
 
  const wasAdmin = user.role === 'admin';
  const previousEmail = user.email;
  const hadRecentEntry = (await getRecentRaw()).some(item => item.email === previousEmail);
  
  // Préparer les mises à jour pour Firestore
  const firestoreUpdates = {};
  
  if (updates.nom !== undefined || updates.name !== undefined) {
    firestoreUpdates.name = (updates.nom || updates.name || '').trim();
  }
  if (updates.email !== undefined) {
    const email = updates.email.trim().toLowerCase();
    // Vérifier que l'email n'est pas déjà utilisé
    if (users.some((u) => u.id !== userId && u.email === email)) {
      throw new Error('Cet email est déjà utilisé');
    }
    firestoreUpdates.email = email;
  }
  if (updates.role !== undefined) {
    if (updates.role !== 'admin' && updates.role !== 'educateur') {
      throw new Error('Rôle invalide');
    }
    // ✅ NOUVEAU : Permettre la promotion éducateur → admin (plusieurs admins autorisés)
    // ✅ NOUVEAU : Vérifier qu'on ne retire pas le dernier admin
    if (wasAdmin && updates.role !== 'admin') {
      const otherAdmins = users.filter((u) => u.id !== userId && u.role === 'admin');
      if (otherAdmins.length === 0) {
        throw new Error('Impossible de retirer le seul compte administrateur.');
      }
    }
    firestoreUpdates.role = updates.role;
  }
  
  // ✅ NOUVEAU : Enregistrer dans l'historique si promotion admin
  if (updates.role === 'admin' && !wasAdmin) {
    const { logEducatorActivity } = await import('./firestoreService');
    const currentUser = await getCurrentUser().catch(() => null);
    await logEducatorActivity({
      action: 'UPDATE_USER_ROLE',
      subjectId: userId,
      subjectType: 'user',
      description: `Promotion éducateur → admin pour "${user.nom || user.name || user.email}"`,
      metadata: {
        oldRole: 'educateur',
        newRole: 'admin',
        type: 'promotion',
        reason: 'Promotion éducateur → admin',
        targetName: user.nom || user.name || user.email,
        targetEmail: user.email,
      },
    }, {
      userId: currentUser?.id || null,
    });
    
    // ✅ NOUVEAU : Appeler la fonction serverless pour définir les custom claims
    try {
      const res = await fetchWithQueue('/.netlify/functions/setAdminClaim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      if (res && res.offline) {
        console.warn('Avertissement: La mise à jour des custom claims a été mise en file pour synchronisation (offline)');
      } else if (res && res.ok === false) {
        console.warn('Avertissement: Les custom claims n\'ont pas pu être définis');
      }
    } catch (error) {
      console.warn('Avertissement: Erreur lors de la mise à jour des claims:', error);
      // Ne pas bloquer l'opération si les claims échouent
    }
  }

  // Mettre à jour dans Firestore
  const currentUser = await getCurrentUser().catch(() => null);
  const updatedUser = await updateUserSupabase(userId, firestoreUpdates);
  
  // Gérer les utilisateurs récents
  if (hadRecentEntry) {
    if (updates.email !== undefined && previousEmail !== updatedUser.email) {
      await removeRecentUserEntry(previousEmail);
      await addRecentUserEntry(updatedUser);
    } else {
      await touchRecentUserEntry(updatedUser);
    }
  }
  
  return updatedUser;
}

/**
 * Supprime un utilisateur (utilise Firestore)
 * ✅ NOUVEAU : Permet l'auto-suppression avec confirmation renforcée
 */
export async function deleteUser(userId, options = {}) {
  const currentUser = await getCurrentUser();
  
  if (!currentUser) {
    throw new Error('Vous devez être connecté pour supprimer un utilisateur');
  }
  
  const users = await getAllUsers();
  const userToDelete = users.find(u => u.id === userId);
  if (!userToDelete) {
    throw new Error('Utilisateur introuvable');
  }

  const isSelfDeletion = currentUser.id === userId;
  const isAdmin = currentUser.role === 'admin';
  const targetIsAdmin = userToDelete.role === 'admin';

  // ✅ NOUVEAU : Vérifier qu'on ne supprime pas le dernier admin
  if (targetIsAdmin) {
    const otherAdmins = users.filter((u) => u.id !== userId && u.role === 'admin');
    if (otherAdmins.length === 0) {
      throw new Error('Impossible de supprimer le dernier compte administrateur.');
    }
  }

  // ✅ NOUVEAU : Auto-suppression nécessite confirmation renforcée (gérée dans le composant)
  // Si options.forceSelfDeletion n'est pas true, on bloque
  if (isSelfDeletion && !options.forceSelfDeletion) {
    throw new Error('Auto-suppression nécessite une confirmation renforcée. Utilisez handleDeleteOwnAccount.');
  }

  // ✅ NOUVEAU : Seul un admin peut supprimer d'autres utilisateurs
  if (!isSelfDeletion && !isAdmin) {
    throw new Error('Seuls les administrateurs peuvent supprimer d\'autres utilisateurs');
  }

  // Enregistrer dans l'historique avant suppression
  if (isSelfDeletion) {
    const { logEducatorActivity } = await import('./firestoreService');
    await logEducatorActivity({
      action: 'DELETE_OWN_ACCOUNT',
      subjectId: userId,
      subjectType: 'user',
      description: `Admin "${currentUser.name || currentUser.nom}" a supprimé son propre compte`,
      metadata: {
        type: 'self_deletion',
        reason: 'Admin a supprimé son propre compte',
        warning: 'Action irréversible',
        userName: currentUser.name || currentUser.nom,
        userEmail: currentUser.email,
      },
    }, {
      userId: currentUser.id,
    });
  }

  // Supprimer dans Firestore (marquer comme inactif)
  await deleteUserSupabase(userId);
  
  await removeRecentUserEntry(userToDelete.email);

  // ✅ NOUVEAU : Si auto-suppression, déconnexion et redirection
  if (isSelfDeletion) {
    await logout();
    // La redirection sera gérée par le composant
  }
}

/**
 * Vérifie si c'est le premier utilisateur (aucun utilisateur existant)
 */
export async function isFirstUser() {
  const users = await getAllUsers();
  return users.length === 0;
}

/**
 * Initialise le premier compte Admin (utilise Firestore)
 */
export async function initializeFirstAdmin({ nom, email, motDePasse }) {
  const isFirst = await isFirstUser();
  if (!isFirst) {
    throw new Error('Le système a déjà été initialisé');
  }

  return await createUser({
    nom,
    email,
    motDePasse,
    role: 'admin',
    creePar: null,
  });
}

async function getRecentRaw() {
  try {
    const data = await getStorage(RECENT_USERS_KEY, []);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn('Impossible de récupérer les profils récents:', error);
    return [];
  }
}

async function addRecentUserEntry(user) {
  if (!user?.email) return;
  try {
    const current = await getRecentRaw();
    const entry = {
      id: user.id,
      email: user.email,
      nom: user.nom,
      role: user.role,
      lastUsedAt: new Date().toISOString(),
    };
    const next = [entry, ...current.filter(item => item.email !== user.email)].slice(0, MAX_RECENT_USERS);
    await setStorage(RECENT_USERS_KEY, next);
  } catch (error) {
    console.warn('Impossible d\'enregistrer le profil récent:', error);
  }
}

async function removeRecentUserEntry(email) {
  if (!email) return;
  try {
    const current = await getRecentRaw();
    const next = current.filter(item => item.email !== email);
    await setStorage(RECENT_USERS_KEY, next);
  } catch (error) {
    console.warn('Impossible de supprimer le profil récent:', error);
  }
}

async function touchRecentUserEntry(user) {
  if (!user?.email) return;
  const current = await getRecentRaw();
  if (!current.some(item => item.email === user.email)) return;
  await addRecentUserEntry(user);
}

export async function getRecentUsers() {
  return await getRecentRaw();
}

/**
 * Modifie le mot de passe de l'utilisateur actuellement connecté
 * Les éducatrices et l'admin peuvent modifier leur propre mot de passe
 */
export async function changeOwnPassword(currentPassword, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Le nouveau mot de passe doit contenir au moins 6 caractères');
  }

  // Vérifier la connexion et réauthentifier en tentant une nouvelle connexion
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error('Vous devez être connecté pour modifier votre mot de passe');
  }

  try {
    // Réauthentifier l'utilisateur en vérifiant le mot de passe courant
    const signin = await signIn({ email: currentUser.email, password: currentPassword });
    if (signin?.error) {
      throw new Error('Mot de passe actuel incorrect');
    }

    // Mettre à jour le mot de passe via Supabase
    const res = await supabaseUpdatePassword(newPassword);
    if (res?.error) {
      if (res?.status === 401) throw new Error('Veuillez vous reconnecter avant de changer votre mot de passe');
      throw res.error;
    }

    return { success: true };
  } catch (error) {
    if (error.message && error.message.includes('Mot de passe actuel incorrect')) {
      throw new Error('Mot de passe actuel incorrect');
    }
    throw error;
  }
}

/**
 * Réinitialise le mot de passe d'un utilisateur (Admin uniquement)
 * Utilise une fonction serverless pour utiliser l'Admin SDK
 */
export async function resetUserPassword(userId, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Le nouveau mot de passe doit contenir au moins 6 caractères');
  }

  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') {
    throw new Error('Seuls les administrateurs peuvent réinitialiser les mots de passe');
  }

  try {
    const response = await fetch('/.netlify/functions/resetUserPassword', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        newPassword,
        adminId: currentUser.id,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de la réinitialisation du mot de passe');
    }

    return { success: true };
  } catch (error) {
    console.error('Erreur resetUserPassword:', error);
    throw error;
  }
}


