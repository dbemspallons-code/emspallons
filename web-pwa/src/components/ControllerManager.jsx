import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Save, UserCheck, UserX } from 'lucide-react';

export default function ControllerManager({ controllers = [], lines = [], onSave, onDelete, onClose }) {
  const [editingController, setEditingController] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    active: true,
    assignedLineId: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [errors, setErrors] = useState({});

  // Générer un mot de passe aléatoire
  const generatePassword = () => {
    const length = 6;
    const chars = '0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(password);
    setFormData({ ...formData, password });
    return password;
  };

  const handleNewController = () => {
    setEditingController('new');
    const newPassword = generatePassword();
    setFormData({ name: '', password: newPassword, active: true, assignedLineId: '' });
    setGeneratedPassword(newPassword);
    setErrors({});
  };

  const handleEdit = (controller) => {
    setEditingController(controller.id);
    setFormData({
      name: controller.name || '',
      password: '', // Ne pas afficher le mot de passe existant
      active: controller.active !== false,
      assignedLineId: controller.assignedLineId || '',
    });
    setGeneratedPassword('');
    setErrors({});
  };

  const handleCancel = () => {
    setEditingController(null);
    setFormData({ name: '', password: '', active: true, assignedLineId: '' });
    setGeneratedPassword('');
    setErrors({});
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Le nom du contrôleur est obligatoire';
    }
    if (editingController === 'new' && !formData.password.trim()) {
      newErrors.password = 'Le mot de passe est obligatoire';
    }
    if (!formData.assignedLineId.trim()) {
      newErrors.assignedLineId = 'La ligne assignée est obligatoire';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const controllerData = {
        name: formData.name.trim(),
        active: formData.active !== false,
        assignedLineId: formData.assignedLineId || null,
      };
      
      // Si c'est une création, inclure le mot de passe
      if (editingController === 'new') {
        controllerData.password = formData.password.trim();
      } else if (formData.password.trim()) {
        // Si c'est une modification et qu'un nouveau mot de passe est fourni
        controllerData.password = formData.password.trim();
      }

      if (editingController === 'new') {
        await onSave(controllerData);
      } else {
        await onSave({ ...controllerData, id: editingController });
      }

      handleCancel();
    } catch (err) {
      setErrors({ submit: err.message || 'Erreur lors de la sauvegarde' });
    }
  };

  const handleDeleteController = async (controller) => {
    if (!window.confirm(`Supprimer le contrôleur "${controller.name}" \n\nAttention : Les scans effectués par ce contrôleur resteront dans l'historique.`)) {
      return;
    }
    try {
      await onDelete(controller.id);
    } catch (err) {
      alert('Erreur lors de la suppression : ' + err.message);
    }
  };

  const handleToggleActive = async (controller) => {
    try {
      await onSave({ ...controller, active: !controller.active });
    } catch (err) {
      alert('Erreur lors de la mise à jour : ' + err.message);
    }
  };

  return (
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
      <div className="card modal-enter" style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="badge badge--success" style={{ padding: '0.5rem', borderRadius: '12px' }}>
              <UserCheck size={20} />
            </div>
            <h2 className="section-title" style={{ margin: 0 }}>Gestion des contrôleurs</h2>
          </div>
          <button
            className="button button--subtle"
            type="button"
            onClick={onClose}
            style={{ padding: '0.5rem' }}
          >
            <X size={20} />
          </button>
        </header>

        <div style={{ marginBottom: '1.5rem' }}>
          <button className="button" type="button" onClick={handleNewController}>
            <Plus size={16} /> Ajouter un nouveau contrôleur
          </button>
        </div>

        {(editingController === 'new' || editingController) && (
          <form onSubmit={handleSubmit} className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
              {editingController === 'new' ? 'Nouveau contrôleur' : 'Modifier le contrôleur'}
            </h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Nom du contrôleur *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Contrôleur Portail 1"
                autoFocus
              />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">
                Mot de passe {editingController === 'new' ? '*' : '(laisser vide pour ne pas changer)'}
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingController === 'new' ? 'Mot de passe généré automatiquement' : 'Nouveau mot de passe (optionnel)'}
                  style={{ flex: 1 }}
                />
                {editingController === 'new' && (
                  <button
                    type="button"
                    className="button button--subtle"
                    onClick={generatePassword}
                    style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap' }}
                  >
                    Générer
                  </button>
                )}
                <button
                  type="button"
                  className="button button--subtle"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ padding: '0.5rem' }}
                  title={showPassword ? 'Masquer' : 'Afficher'}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {errors.password && <span className="form-error">{errors.password}</span>}
              {editingController === 'new' && generatedPassword && (
                <div style={{ 
                  marginTop: '0.5rem', 
                  padding: '0.75rem', 
                  background: '#f0f9ff', 
                  border: '1px solid #0ea5e9',
                  borderRadius: '6px',
                  fontSize: '0.9rem'
                }}>
                  <strong>⚠️ IMPORTANT :</strong> Notez ce mot de passe et donnez-le au contrôleur : <strong style={{ fontSize: '1.1rem', color: '#0ea5e9' }}>{generatedPassword}</strong>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">Ligne assignée *</label>
              <select
                className="form-input"
                value={formData.assignedLineId}
                onChange={(e) => setFormData({ ...formData, assignedLineId: e.target.value })}
                required
              >
                <option value="">Sélectionner une ligne</option>
                {lines.map(line => (
                  <option key={line.id} value={line.id}>
                    {line.name}
                  </option>
                ))}
              </select>
              {errors.assignedLineId && <span className="form-error">{errors.assignedLineId}</span>}
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                Le contrôleur ne pourra scanner que les étudiants de cette ligne.
              </p>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
                <span>Contrôleur actif</span>
              </label>
            </div>

            {errors.submit && (
              <div className="form-error" style={{ marginBottom: '1rem' }}>{errors.submit}</div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="button button--subtle" onClick={handleCancel}>
                Annuler
              </button>
              <button type="submit" className="button">
                <Save size={16} /> {editingController === 'new' ? 'Créer' : 'Enregistrer'}
              </button>
            </div>
          </form>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {controllers.length === 0 (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              <p>Aucun contrôleur enregistré.</p>
              <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Ajoutez un contrôleur pour permettre le scan au portail.</p>
            </div>
          ) : (
            controllers.map((controller) => (
              <div key={controller.id} className="card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <h4 className="section-title" style={{ margin: 0, fontSize: '1rem' }}>{controller.name}</h4>
                    {controller.active ? (
                      <span className="chip chip--success" style={{ fontSize: '0.75rem' }}>
                        <UserCheck size={12} /> Actif
                      </span>
                    ) : (
                      <span className="chip" style={{ fontSize: '0.75rem' }}>
                        <UserX size={12} /> Inactif
                      </span>
                    )}
                  </div>
                  <p className="subtitle" style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                    ID: {controller.id}
                  </p>
                  {controller.assignedLineId && lines.length > 0 && (
                    <p className="subtitle" style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                      Ligne: {lines.find(l => l.id === controller.assignedLineId).name || controller.assignedLineId}
                    </p>
                  )}
                  {controller.password && (
                    <p className="subtitle" style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                      Mot de passe configuré
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="button button--subtle"
                    type="button"
                    onClick={() => handleToggleActive(controller)}
                    title={controller.active ? 'Désactiver' : 'Activer'}
                  >
                    {controller.active <UserX size={16} /> : <UserCheck size={16} />}
                  </button>
                  <button
                    className="button button--subtle"
                    type="button"
                    onClick={() => handleEdit(controller)}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="button button--subtle"
                    type="button"
                    onClick={() => handleDeleteController(controller)}
                    style={{ color: '#dc2626' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

