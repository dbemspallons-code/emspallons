import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, Save, Bus } from 'lucide-react';

export default function LineManager({ lines = [], onSave, onDelete, onClose }) {
  const [editingLine, setEditingLine] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#2563eb',
    capacity: '',
  });
  const [errors, setErrors] = useState({});

  const handleNewLine = () => {
    setEditingLine('new');
    setFormData({ name: '', color: '#2563eb', capacity: '' });
    setErrors({});
  };

  const handleEdit = (line) => {
    setEditingLine(line.id);
    setFormData({
      name: line.name || '',
      color: line.color || '#2563eb',
      capacity: line.capacity || '',
    });
    setErrors({});
  };

  const handleCancel = () => {
    setEditingLine(null);
    setFormData({ name: '', color: '#2563eb', capacity: '' });
    setErrors({});
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name?.trim()) {
      newErrors.name = 'Le nom de la ligne est obligatoire';
    }
    if (!formData.color) {
      newErrors.color = 'La couleur est obligatoire';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const lineData = {
        name: formData.name.trim(),
        color: formData.color,
        capacity: formData.capacity ? parseInt(formData.capacity, 10) : null,
        active: true,
      };

      if (editingLine === 'new') {
        await onSave(lineData);
      } else {
        await onSave({ ...lineData, id: editingLine });
      }

      handleCancel();
    } catch (err) {
      setErrors({ submit: err.message || 'Erreur lors de la sauvegarde' });
    }
  };

  const handleDeleteLine = async (line) => {
    if (!window.confirm(`Supprimer la ligne "${line.name}" ?\n\nAttention : Les étudiants assignés à cette ligne devront être réassignés.`)) {
      return;
    }
    try {
      await onDelete(line.id);
    } catch (err) {
      alert('Erreur lors de la suppression : ' + err.message);
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
              <Bus size={20} />
            </div>
            <h2 className="section-title" style={{ margin: 0 }}>Gestion des lignes de bus</h2>
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
          <button className="button" type="button" onClick={handleNewLine}>
            <Plus size={16} /> Ajouter une nouvelle ligne
          </button>
        </div>

        {(editingLine === 'new' || editingLine) && (
          <form onSubmit={handleSubmit} className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', background: '#f8fafc' }}>
            <h3 className="section-title" style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>
              {editingLine === 'new' ? 'Nouvelle ligne' : 'Modifier la ligne'}
            </h3>
            
            {errors.submit && (
              <div style={{
                padding: '0.75rem',
                background: 'rgba(220, 38, 38, 0.1)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                borderRadius: '8px',
                marginBottom: '1rem',
                color: '#dc2626',
                fontSize: '0.9rem'
              }}>
                {errors.submit}
              </div>
            )}

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Nom de la ligne *
                </label>
                <input
                  className="input-field"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Cocody, Marcory, Plateau..."
                  required
                />
                {errors.name && (
                  <p style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '0.25rem' }}>{errors.name}</p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Couleur *
                </label>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    style={{ width: '60px', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                  />
                  <input
                    className="input-field"
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#2563eb"
                    style={{ flex: 1 }}
                  />
                </div>
                {errors.color && (
                  <p style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '0.25rem' }}>{errors.color}</p>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  Capacité (optionnel)
                </label>
                <input
                  className="input-field"
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  placeholder="Nombre de places"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="button" type="submit">
                <Save size={16} /> {editingLine === 'new' ? 'Créer' : 'Enregistrer'}
              </button>
              <button className="button button--subtle" type="button" onClick={handleCancel}>
                Annuler
              </button>
            </div>
          </form>
        )}

        <div>
          <h3 className="section-title" style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>
            Lignes existantes ({lines.length})
          </h3>
          
          {lines.length === 0 ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc' }}>
              <p className="subtitle">Aucune ligne créée pour le moment</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {lines.map((line) => (
                <div
                  key={line.id}
                  className="card"
                  style={{
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderLeft: `4px solid ${line.color || '#2563eb'}`,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, fontWeight: 600, fontSize: '1rem' }}>{line.name}</h4>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      <span className="chip" style={{ backgroundColor: line.color || '#2563eb', color: 'white' }}>
                        {line.color || '#2563eb'}
                      </span>
                      {line.capacity && (
                        <span className="chip">Capacité: {line.capacity} places</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="button button--subtle"
                      type="button"
                      onClick={() => handleEdit(line)}
                      disabled={editingLine !== null}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="button button--danger"
                      type="button"
                      onClick={() => handleDeleteLine(line)}
                      disabled={editingLine !== null}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

