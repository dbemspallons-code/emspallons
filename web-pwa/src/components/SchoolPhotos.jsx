import React, { useState, useEffect } from 'react';
import { Image, Upload, X, Loader } from 'lucide-react';
import { listPhotos, uploadPhoto, deletePhoto } from '../services/photoService';




export default function SchoolPhotos() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const photosData = await listPhotos();
      const mapped = (photosData || []).map(p => ({
        id: p.id,
        url: p.url,
        fileName: p.file_name || p.fileName,
        storagePath: p.storage_path || p.storagePath,
        createdAt: p.created_at || p.createdAt,
      }));
      setPhotos(mapped);
    } catch (error) {
      console.error('Error loading photos (Supabase):', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image');
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('L\'image est trop grande. Taille maximale : 5MB');
      return;
    }

    setUploading(true);
    try {
      const added = await uploadPhoto(file);
      await loadPhotos();
      setShowUpload(false);
      alert('Photo ajoutée avec succès !');
    } catch (error) {
      console.error('Error uploading photo (Supabase):', error);
      alert('Erreur lors de l\'upload : ' + (error.message || error));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photo) => {
    if (!window.confirm('Supprimer cette photo ?')) return;

    try {
      await deletePhoto(photo);
      await loadPhotos();
      alert('Photo supprimée avec succès !');
    } catch (error) {
      console.error('Error deleting photo (Supabase):', error);
      alert('Erreur lors de la suppression : ' + (error.message || error));
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <Loader size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
        <p className="subtitle" style={{ marginTop: '1rem' }}>Chargement des photos...</p>
      </div>
    );
  }

  return (
    <section className="card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Photos de l'école EMSP</h2>
        <button
          className="button"
          type="button"
          onClick={() => setShowUpload(!showUpload)}
          disabled={uploading}
        >
          <Upload size={16} style={{ marginRight: '0.5rem' }} />
          {showUpload ? 'Annuler' : 'Ajouter une photo'}
        </button>
      </div>

      {showUpload && (
        <div style={{ 
          padding: '1.5rem', 
          background: '#f8fafc', 
          borderRadius: '12px', 
          marginBottom: '1.5rem',
          border: '2px dashed #cbd5e1'
        }}>
          <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>
            Sélectionner une image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            style={{ marginBottom: '0.75rem' }}
          />
          {uploading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#2563eb' }}>
              <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Upload en cours...</span>
            </div>
          )}
          <p className="subtitle" style={{ fontSize: '0.85rem', margin: 0 }}>
            Formats acceptés : JPG, PNG, GIF. Taille maximale : 5MB
          </p>
        </div>
      )}

      {photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <Image size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <p className="subtitle">Aucune photo pour le moment</p>
          <p className="subtitle" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
            Cliquez sur "Ajouter une photo" pour commencer
          </p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
          gap: '1rem' 
        }}>
          {photos.map((photo) => (
            <div
              key={photo.id}
              style={{
                position: 'relative',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid rgba(15, 23, 42, 0.1)',
                background: '#fff',
              }}
            >
              <img
                src={photo.url}
                alt={photo.fileName || 'Photo EMSP'}
                style={{
                  width: '100%',
                  height: '200px',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
              <button
                type="button"
                onClick={() => handleDelete(photo)}
                style={{
                  position: 'absolute',
                  top: '0.5rem',
                  right: '0.5rem',
                  background: 'rgba(220, 38, 38, 0.9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <X size={16} />
              </button>
              {photo.createdAt && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                  padding: '0.75rem',
                  color: 'white',
                  fontSize: '0.75rem',
                }}>
                  {new Date(photo.createdAt).toLocaleDateString('fr-FR')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
}




