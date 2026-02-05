import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, GraduationCap, BookOpen } from 'lucide-react';
import { fetchClasses, createClass, updateClass, deleteClass, fetchPromos, createPromo, updatePromo, deletePromo, initDefaultPromos } from '../services/classService';
import { getCurrentUser } from '../services/authService';

export default function ClassPromoManager({ onClose }) {
  const [classes, setClasses] = useState([]);
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('promos'); // 'promos' ou 'classes'
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', order: 0 });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [classesData, promosData] = await Promise.all([
        fetchClasses(),
        fetchPromos(),
      ]);
      setClasses(classesData);
      setPromos(promosData);
      
      // Initialiser les promos par défaut si aucune n'existe
      if (promosData.length === 0) {
        const currentUser = await getCurrentUser().catch(() => null);
        await initDefaultPromos({ userId: currentUser?.uid || null });
        const updatedPromos = await fetchPromos();
        setPromos(updatedPromos);
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setEditingItem('new');
    setFormData({ name: '', description: '', order: activeTab === 'promos' ? promos.length + 1 : 0 });
    setErrors({});
  };

  const handleEdit = (item) => {
    setEditingItem(item.id);
    setFormData({
      name: item.name || '',
      description: item.description || '',
      order: item.order || 0,
    });
    setErrors({});
  };

  const handleCancel = () => {
    setEditingItem(null);
    setFormData({ name: '', description: '', order: 0 });
    setErrors({});
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name?.trim()) {
      newErrors.name = 'Le nom est obligatoire';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const currentUser = await getCurrentUser().catch(() => null);
      const options = { userId: currentUser?.uid || null };

      if (activeTab === 'promos') {
        if (editingItem === 'new') {
          await createPromo(formData, options);
        } else {
          await updatePromo(editingItem, formData, options);
        }
      } else {
        if (editingItem === 'new') {
          await createClass(formData, options);
        } else {
          await updateClass(editingItem, formData, options);
        }
      }

      await loadData();
      handleCancel();
    } catch (err) {
      setErrors({ submit: err.message || 'Erreur lors de la sauvegarde' });
    }
  };

  const handleDelete = async (item) => {
    const itemType = activeTab === 'promos' ? 'promo' : 'classe';
    if (!window.confirm(`Supprimer ${itemType === 'promo' ? 'la promo' : 'la classe'} "${item.name}" ?`)) {
      return;
    }

    try {
      if (activeTab === 'promos') {
        await deletePromo(item.id);
      } else {
        await deleteClass(item.id);
      }
      await loadData();
    } catch (err) {
      alert('Erreur lors de la suppression : ' + err.message);
    }
  };

  const items = activeTab === 'promos' ? promos : classes;

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
      <div className="card modal-enter" style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="badge badge--success" style={{ padding: '0.5rem', borderRadius: '12px' }}>
              <GraduationCap size={20} />
            </div>
            <h2 className="section-title" style={{ margin: 0 }}>Gestion des classes et promos</h2>
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

        {/* Onglets */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0' }}>
          <button
            className={`button ${activeTab === 'promos' ? '' : 'button--subtle'}`}
            type="button"
            onClick={() => {
              setActiveTab('promos');
              handleCancel();
            }}
            style={{ borderBottom: activeTab === 'promos' ? '2px solid #2563eb' : 'none', borderRadius: 0 }}
          >
            <BookOpen size={16} /> Promos
          </button>
          <button
            className={`button ${activeTab === 'classes' ? '' : 'button--subtle'}`}
            type="button"
            onClick={() => {
              setActiveTab('classes');
              handleCancel();
            }}
            style={{ borderBottom: activeTab === 'classes' ? '2px solid #2563eb' : 'none', borderRadius: 0 }}
          >
            <GraduationCap size={16} /> Classes
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Chargement...</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1.5rem' }}>
              <button className="button" type="button" onClick={handleNew}>
                <Plus size={16} /> Ajouter {activeTab === 'promos' ? 'une promo' : 'une classe'}
              </button>
            </div>

            {(editingItem === 'new' || editingItem) && (
              <form onSubmit={handleSubmit} className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem', background: '#f8fafc' }}>
                <h3 className="section-title" style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>
                  {editingItem === 'new' ? `Nouvelle ${activeTab === 'promos' ? 'promo' : 'classe'}` : `Modifier ${activeTab === 'promos' ? 'la promo' : 'la classe'}`}
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
                      Nom {activeTab === 'promos' ? 'de la promo' : 'de la classe'} *
                    </label>
                    <input
                      className="input-field"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={activeTab === 'promos' ? 'Ex: Licence 1' : 'Ex: Groupe A'}
                      required
                    />
                    {errors.name && (
                      <p style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: '0.25rem' }}>{errors.name}</p>
                    )}
                  </div>

                  {activeTab === 'promos' && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                        Ordre d'affichage
                      </label>
                      <input
                        className="input-field"
                        type="number"
                        min="0"
                        value={formData.order}
                        onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value, 10) || 0 })}
                        placeholder="0"
                      />
                      <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                        Détermine l'ordre d'affichage dans les listes déroulantes
                      </p>
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Description (optionnel)
                    </label>
                    <textarea
                      className="input-field"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Description..."
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button className="button" type="submit">
                    <Save size={16} /> {editingItem === 'new' ? 'Créer' : 'Enregistrer'}
                  </button>
                  <button className="button button--subtle" type="button" onClick={handleCancel}>
                    Annuler
                  </button>
                </div>
              </form>
            )}

            <div>
              <h3 className="section-title" style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>
                {activeTab === 'promos' ? 'Promos existantes' : 'Classes existantes'} ({items.length})
              </h3>
              
              {items.length === 0 ? (
                <div className="card" style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc' }}>
                  <p className="subtitle">Aucune {activeTab === 'promos' ? 'promo' : 'classe'} créée pour le moment</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {(activeTab === 'promos' ? [...items].sort((a, b) => (a.order || 0) - (b.order || 0)) : items).map((item) => (
                    <div
                      key={item.id}
                      className="card"
                      style={{
                        padding: '1rem 1.25rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: 0, fontWeight: 600, fontSize: '1rem' }}>{item.name}</h4>
                        {item.description && (
                          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#64748b' }}>
                            {item.description}
                          </p>
                        )}
                        {activeTab === 'promos' && item.order !== undefined && (
                          <span className="chip" style={{ marginTop: '0.5rem' }}>
                            Ordre: {item.order}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="button button--subtle"
                          type="button"
                          onClick={() => handleEdit(item)}
                          disabled={editingItem !== null}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="button button--danger"
                          type="button"
                          onClick={() => handleDelete(item)}
                          disabled={editingItem !== null}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

