import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Edit2, Trash2, UserPlus, Mail, Lock, Crown, User, AlertTriangle } from 'lucide-react';
import { getAllUsers, createUser, updateUser, deleteUser, canCreateUsers, getCurrentUser } from '../services/authService';
export default function UserManagementModal({ onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [canCreate, setCanCreate] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const hasAdmin = useMemo(() => users.some(user => user.role === 'admin'), [users]);

  useEffect(() => {
    loadUsers();
    checkCanCreate();
    loadCurrentUser();
  }, []);

  async function loadCurrentUser() {
    const user = await getCurrentUser();
    setCurrentUser(user);
  }

  async function loadUsers() {
    setLoading(true);
    try {
      const allUsers = await getAllUsers();
      // Ne pas afficher les mots de passe
      const usersWithoutPasswords = allUsers.map(({ motDePasse, ...user }) => user);
      setUsers(usersWithoutPasswords);
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
    } finally {
      setLoading(false);
    }
  }

  async function checkCanCreate() {
    const can = await canCreateUsers();
    setCanCreate(can);
  }

  async function handleCreateUser(userData) {
    try {
      await createUser(userData);
      await loadUsers();
      setShowForm(false);
    } catch (error) {
      alert(error.message || 'Erreur lors de la creation');
      throw error;
    }
  }

  async function handleUpdateUser(userId, updates) {
    try {
      // Confirmation si promotion admin
      if (updates.role === 'admin') {
        const user = users.find(u => u.id === userId);
        const userName = user?.nom || user?.name || user?.email || 'cet utilisateur';
        
        const confirmMessage =
          `ATTENTION\n\n` +
          `Vous allez donner les droits administrateur a "${userName}".\n\n` +
          `Cette personne aura acces a TOUTES les fonctionnalites, y compris :\n` +
          `- Creation/suppression d'utilisateurs\n` +
          `- Reinitialisation de mots de passe\n` +
          `- Gestion complete du systeme\n\n` +
          `Confirmer cette promotion ?`;
        
        if (!window.confirm(confirmMessage)) {
          return;
        }
      }
      
      await updateUser(userId, updates);
      await loadUsers();
      setEditingUser(null);
      alert('Role mis a jour avec succes.');
    } catch (error) {
      alert(error.message || 'Erreur lors de la mise a jour');
      throw error;
    }
  }

  async function handleDeleteUser(userId) {
    const user = users.find(u => u.id === userId);
    const isSelfDeletion = currentUser && currentUser.id === userId;
    
    // Confirmation renforcee pour auto-suppression
    if (isSelfDeletion) {
      await handleDeleteOwnAccount(userId);
      return;
    }
    
    // Suppression normale pour les autres utilisateurs
    if (!window.confirm('Etes-vous sur de vouloir supprimer cet utilisateur ?')) {
      return;
    }
    try {
      await deleteUser(userId);
      await loadUsers();
    } catch (error) {
      alert(error.message || 'Erreur lors de la suppression');
    }
  }

  // Gestion de l'auto-suppression avec confirmation renforcee
  async function handleDeleteOwnAccount(userId) {
    const user = users.find(u => u.id === userId);
    const userName = user?.nom || user?.name || currentUser?.name || 'Vous';
    
    // Etape 1 : Saisie de confirmation textuelle
    const confirmation = window.prompt(
      'ATTENTION : Vous allez supprimer votre propre compte administrateur.\n\n' +
      'Cette action est IRREVERSIBLE et vous serez immediatement deconnecte.\n\n' +
      'Pour confirmer, tapez exactement : SUPPRIMER MON COMPTE'
    );
    
    if (confirmation !== 'SUPPRIMER MON COMPTE') {
      alert('Confirmation incorrecte. Suppression annulee.');
      return;
    }

    // Etape 2 : Double confirmation
    const finalConfirm = window.confirm(
      'DERNIERE CONFIRMATION\n\n' +
      'Etes-vous ABSOLUMENT SUR de vouloir supprimer votre compte administrateur ?\n\n' +
      'Cliquez sur OK pour confirmer la suppression definitive.'
    );

    if (!finalConfirm) {
      alert('Suppression annulee.');
      return;
    }
    
    try {
      // Suppression avec forceSelfDeletion = true
      await deleteUser(userId, { forceSelfDeletion: true });
      
      // Redirection vers l'accueil (la deconnexion est deja faite dans deleteUser)
      alert('Votre compte a ete supprime. Vous allez etre redirige vers la page de connexion.');
      window.location.href = '/';
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert(error.message || 'Erreur lors de la suppression du compte.');
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto modal-enter">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Gestion des utilisateurs</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {canCreate && (
            <div className="mb-4">
              <button
                onClick={() => {
                  setEditingUser(null);
                  setShowForm(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-green-500 text-white rounded-lg hover:from-yellow-500 hover:to-green-600 transition"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Nouvel utilisateur
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map(user => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.nom}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role === 'admin' ? (
                            <>
                              <Crown className="w-3 h-3 mr-1" />
                              Administrateur
                            </>
                          ) : (
                            <>
                              <User className="w-3 h-3 mr-1" />
                              Educateur
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingUser(user);
                              setShowForm(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {(canCreate || (currentUser && currentUser.id === user.id)) && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                            className={`${
                                currentUser && currentUser.id === user.id
                                  ? 'text-amber-700 hover:text-red-700 font-semibold'
                                  : 'text-gray-500 hover:text-red-600'
                              }`}
                              title={
                                currentUser && currentUser.id === user.id
                                  ? 'Supprimer mon propre compte'
                                  : 'Supprimer cet utilisateur'
                              }
                            >
                              {currentUser && currentUser.id === user.id ? (
                                <AlertTriangle className="w-4 h-4" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <UserFormModal
          user={editingUser}
          onClose={() => {
            setShowForm(false);
            setEditingUser(null);
          }}
          onSave={editingUser ? (updates) => handleUpdateUser(editingUser.id, updates) : handleCreateUser}
          hasAdminAlready={hasAdmin}
        />
      )}
    </div>
  );
}

function UserFormModal({ user, onClose, onSave, hasAdminAlready }) {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('educateur');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setNom(user.nom || '');
      setEmail(user.email || '');
      setRole(user.role || 'educateur');
    }
  }, [user]);

  // Permettre a l'admin de creer d'autres admins
  const adminOptionDisabled = false;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (user) {
        // Mise a jour
        const updates = { nom, email, role };
        if (password) {
          updates.motDePasse = password;
        }
        await onSave(updates);
      } else {
        // Creation
        if (!password) {
          setError('Le mot de passe est requis pour un nouvel utilisateur');
          setLoading(false);
          return;
        }
        await onSave({ nom, email, motDePasse: password, role });
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {user ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mot de passe {!user && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!user}
                minLength={6}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                placeholder={user ? 'Laisser vide pour ne pas changer' : 'Minimum 6 caracteres'}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            >
              <option value="educateur">
                Educateur
              </option>
              <option value="admin">
                Administrateur
              </option>
            </select>
            {!user && role === 'admin' && (
              <p className="mt-1 text-xs text-amber-600">
                Attention : cet utilisateur aura tous les droits administrateur.
              </p>
            )}
            {user && user.role === 'educateur' && role === 'admin' && (
              <p className="mt-1 text-xs text-amber-600">
                Attention : vous allez promouvoir cet educateur au role administrateur.
              </p>
            )}
            {user && user.role === 'admin' && role === 'educateur' && (
              <p className="mt-1 text-xs text-red-600">
                Attention : vous retirez les droits administrateur. Assurez-vous qu'il reste au moins un autre admin.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-green-500 text-white rounded-lg hover:from-yellow-500 hover:to-green-600 disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

