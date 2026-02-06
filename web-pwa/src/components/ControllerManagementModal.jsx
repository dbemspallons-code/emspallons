import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  Plus,
  X,
  Edit2,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  CheckCircle2,
  AlertCircle,
  Power,
} from 'lucide-react';
import {
  getAllControllers,
  createController,
  updateController,
  deleteController,
  regenerateControllerCode,
  maskControllerCode,
} from '../services/controllerService';
import { fetchLines } from '../services/firestoreService';

export default function ControllerManagementModal({ onClose }) {
  const [controllers, setControllers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingController, setEditingController] = useState(null);
  const [visibleCodes, setVisibleCodes] = useState([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadControllers();
    loadLines();
  }, []);

  useEffect(() => {
    if (!message) return undefined;
    const timeout = setTimeout(() => setMessage(''), 3500);
    return () => clearTimeout(timeout);
  }, [message]);

  async function loadControllers() {
    setLoading(true);
    setError('');
    try {
      const list = await getAllControllers();
      setControllers(list);
    } catch (err) {
      console.error('Erreur chargement contrôleurs:', err);
      setError(err.message || 'Impossible de charger les contrôleurs');
    } finally {
      setLoading(false);
    }
  }

  async function loadLines() {
    try {
      const list = await fetchLines();
      setLines(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Erreur chargement lignes:', err);
      setLines([]);
    }
  }

  function toggleCodeVisibility(controllerId) {
    setVisibleCodes((prev) => {
      if (prev.includes(controllerId)) {
        return prev.filter((id) => id !== controllerId);
      }
      return [...prev, controllerId];
    });
  }

  async function handleCreateController(data) {
    setCreating(true);
    try {
      const controller = await createController(data);
      setMessage(`Contrôleur créé: ${controller.nom}. Code: ${controller.code}`);
      setShowForm(false);
      setEditingController(null);
      await loadControllers();
      if (navigator.clipboard && controller.code) {
        try {
          await navigator.clipboard.writeText(controller.code);
          setMessage((prev) => `${prev} (copié dans le presse-papiers)`);
        } catch (clipboardError) {
          console.warn('Impossible de copier le code contrôleur:', clipboardError);
        }
      }
    } catch (err) {
      alert(err.message || 'Erreur lors de la création du contrôleur');
      throw err;
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateController(controllerId, updates) {
    try {
      await updateController(controllerId, updates);
      setMessage('Contrôleur mis à jour avec succès');
      setShowForm(false);
      setEditingController(null);
      await loadControllers();
    } catch (err) {
      alert(err.message || 'Erreur lors de la mise à jour');
      throw err;
    }
  }

  async function handleDeleteController(controllerId) {
    const controller = controllers.find((item) => item.id === controllerId);
    if (!window.confirm(`Supprimer ${controller?.nom || 'ce contrôleur'} ?`)) {
      return;
    }
    try {
      await deleteController(controllerId);
      setMessage('Contrôleur supprimé');
      await loadControllers();
    } catch (err) {
      alert(err.message || 'Erreur lors de la suppression');
    }
  }

  async function handleRegenerate(controllerId) {
    try {
      const result = await regenerateControllerCode(controllerId);
      setMessage(`Nouveau code généré: ${result.code}`);
      await loadControllers();
      toggleCodeVisibility(controllerId);
      if (navigator.clipboard && result.code) {
        try {
          await navigator.clipboard.writeText(result.code);
        } catch (clipboardError) {
          console.warn('Copie code impossible:', clipboardError);
        }
      }
    } catch (err) {
      alert(err.message || 'Erreur lors de la régénération du code');
    }
  }

  async function handleCopyCode(code) {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setMessage('Code copié dans le presse-papiers');
    } catch (err) {
      alert('Impossible de copier le code. Code affiché: ' + code);
    }
  }

  const sortedControllers = useMemo(() => {
    return [...controllers].sort((a, b) => (a.nom || '').localeCompare(b.nom || '', 'fr'));
  }, [controllers]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Gestion des contrôleurs</h2>
              <p className="text-sm text-gray-500">Créez et distribuez des accès individuels pour les contrôleurs de bus.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
              {message}
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Contrôleurs actifs</h3>
              <p className="text-sm text-gray-500">
                Partagez un code unique à chaque contrôleur. Les connexions et scans sont journalisés pour assurer la traçabilité.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingController(null);
                setShowForm(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-green-500 text-white rounded-lg hover:from-yellow-500 hover:to-green-600 transition"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Nouveau contrôleur
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-gray-500">
              Chargement des contrôleurs...
            </div>
          ) : sortedControllers.length === 0 ? (
            <div className="p-6 border border-dashed border-gray-300 rounded-lg text-center text-gray-600">
              <p className="font-medium">Aucun contrôleur enregistré.</p>
              <p className="text-sm mt-2">Créez un accès pour permettre aux contrôleurs de scanner les QR codes depuis la page Chauffeur.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ligne</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dernière connexion</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedControllers.map((controller) => {
                    const isVisible = visibleCodes.includes(controller.id);
                    const maskedCode = maskControllerCode(controller.code || '');
                    const assignedLine = lines.find((line) => line.id === controller.assignedLineId);
                    const lastConnection = controller.derniereConnexion
                      ? new Date(controller.derniereConnexion).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Jamais';
                    return (
                      <tr key={controller.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{controller.nom}</div>
                          {controller.connexions?.length ? (
                            <div className="text-xs text-gray-500">
                              {controller.connexions.length} connexion{controller.connexions.length > 1 ? 's' : ''} enregistrée{controller.connexions.length > 1 ? 's' : ''}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {assignedLine?.name || controller.assignedLineId || 'Non assignée'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm tracking-widest bg-gray-100 px-2 py-1 rounded">
                              {isVisible ? controller.code : maskedCode}
                            </span>
                            <button
                              onClick={() => toggleCodeVisibility(controller.id)}
                              className="text-gray-500 hover:text-gray-800"
                              title={isVisible ? 'Masquer le code' : 'Afficher le code'}
                            >
                              {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleCopyCode(controller.code)}
                              className="text-gray-500 hover:text-gray-800"
                              title="Copier le code"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              controller.actif
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {controller.actif ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Actif
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3 h-3 mr-1" /> Inactif
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {lastConnection}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleRegenerate(controller.id)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="Générer un nouveau code"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingController(controller);
                                setShowForm(true);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteController(controller.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateController(controller.id, { actif: !controller.actif })}
                              className={`text-sm inline-flex items-center gap-1 ${controller.actif ? 'text-orange-600 hover:text-orange-800' : 'text-green-600 hover:text-green-800'}`}
                              title={controller.actif ? 'Désactiver le contrôleur' : 'Réactiver le contrôleur'}
                            >
                              <Power className="w-4 h-4" />
                              {controller.actif ? 'Désactiver' : 'Activer'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <ControllerFormModal
          controller={editingController}
          lines={lines}
          loading={creating}
          onClose={() => {
            setShowForm(false);
            setEditingController(null);
          }}
          onSave={async (data) => {
            if (editingController) {
              await handleUpdateController(editingController.id, data);
            } else {
              await handleCreateController(data);
            }
          }}
        />
      )}
    </div>
  );
}

function ControllerFormModal({ controller, onClose, onSave, loading, lines = [] }) {
  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');
  const [actif, setActif] = useState(true);
  const [assignedLineId, setAssignedLineId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (controller) {
      setNom(controller.nom || '');
      setCode(controller.code || '');
      setActif(controller.actif !== false);
      setAssignedLineId(controller.assignedLineId || '');
    } else {
      setNom('');
      setCode('');
      setActif(true);
      setAssignedLineId(lines[0]?.id || '');
    }
    setError('');
  }, [controller, lines]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!nom.trim()) {
      setError('Le nom du contrôleur est requis');
      return;
    }
    if (!assignedLineId) {
      setError('La ligne assignée est obligatoire');
      return;
    }

    try {
      await onSave({
        nom: nom.trim(),
        actif,
        assignedLineId,
        ...(code.trim() ? { code: code.trim().toUpperCase() } : {}),
      });
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">
            {controller ? 'Modifier le contrôleur' : 'Nouveau contrôleur'}
          </h3>
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
              Nom du contrôleur <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nom}
              onChange={(event) => setNom(event.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
              placeholder="Ex: Portail 1 matin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Code d'accès
            </label>
            <input
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 uppercase tracking-widest"
              placeholder={controller ? 'Laisser vide pour conserver' : 'Laisser vide pour générer automatiquement'}
            />
            <p className="text-xs text-gray-500 mt-1">
              Astuce: laissez vide pour un code sécurisé généré automatiquement.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ligne assignée <span className="text-red-500">*</span>
            </label>
            <select
              value={assignedLineId}
              onChange={(event) => setAssignedLineId(event.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            >
              <option value="">Sélectionner une ligne</option>
              {lines.map((line) => (
                <option key={line.id} value={line.id}>
                  {line.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Le contrôleur ne pourra scanner que les étudiants de cette ligne.
            </p>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={actif}
              onChange={(event) => setActif(event.target.checked)}
              className="rounded"
            />
            Contrôleur actif (peut se connecter)
          </label>

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
