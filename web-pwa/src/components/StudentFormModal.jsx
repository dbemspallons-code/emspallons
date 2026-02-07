import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, User, GraduationCap, Phone, Bus, MapPin, Users } from 'lucide-react';
import { fetchPromos, fetchClasses } from '../services/classService';
import { fetchLines } from '../services/firestoreService';

const PHONE_REGEX = /^\+[0-9\s-]{8,18}$/;

function normalizePhone(value) {
  if (!value) return '';
  const cleaned = String(value).replace(/[^0-9+]/g, '');
  if (!cleaned) return '';
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}
function ensureCivPrefix(value) {
  const cleaned = String(value || '').replace(/[^0-9+]/g, '');
  if (!cleaned) return '+225';
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('225')) return `+${cleaned}`;
  return `+225${cleaned}`;
}

export default function StudentFormModal({ student, onClose, onSave }) {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [promo, setPromo] = useState('');
  const [classe, setClasse] = useState('');
  const [contact, setContact] = useState('+225');
  const [busLine, setBusLine] = useState('');
  const [pickupPoint, setPickupPoint] = useState('');
  const [guardian, setGuardian] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [promos, setPromos] = useState([]);
  const [classes, setClasses] = useState([]);
  const [lines, setLines] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const handleContactBlur = () => {
    setContact(prev => normalizePhone(ensureCivPrefix(prev)));
  };

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    if (student) {
      setNom(student.nom || '');
      setPrenom(student.prenom || '');
      setPromo(student.promo || student.niveau || '');
      setClasse(student.classe || student.classGroup || '');
      setContact(student.contact || '+225');
      setBusLine(student.busLine || '');
      setPickupPoint(student.pickupPoint || '');
      setGuardian(student.guardian || '');
      setNotes(student.notes || '');
    } else {
      setNom('');
      setPrenom('');
      setPromo('');
      setClasse(classes[0].name || '');
      setContact('+225');
      setBusLine(lines[0].id || '');
      setPickupPoint('');
      setGuardian('');
      setNotes('');
    }
    setErrors({});
  }, [student, lines, classes]);

  async function loadOptions() {
    try {
      setLoadingOptions(true);
      const [promosData, classesData, linesData] = await Promise.all([
        fetchPromos(),
        fetchClasses(),
        fetchLines(),
      ]);
      setPromos((promosData || []).filter(p => p.active !== false));
      setClasses((classesData || []).filter(c => c.active !== false));
      setLines(Array.isArray(linesData) ? linesData : []);
    } catch (err) {
      console.warn('Erreur chargement options:', err);
      setPromos([]);
      setClasses([]);
      setLines([]);
    } finally {
      setLoadingOptions(false);
    }
  }

  const isEditing = useMemo(() => Boolean(student && student.id), [student]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const nextErrors = {};
    if (!nom.trim()) nextErrors.nom = 'Nom obligatoire';
    if (!contact.trim()) nextErrors.contact = 'Contact obligatoire';
    const normalizedContact = normalizePhone(ensureCivPrefix(contact));
    if (contact && !PHONE_REGEX.test(contact.trim())) {
      nextErrors.contact = 'Format de numero invalide';
    }
    if (!promo.trim()) nextErrors.promo = 'Promotion obligatoire';
    if (!classes.length) {
      nextErrors.classe = 'Aucune classe disponible. Ajoutez une classe dans Parametres.';
    } else if (!classe.trim()) {
      nextErrors.classe = 'Classe obligatoire';
    }
    if (!busLine) nextErrors.busLine = 'Ligne obligatoire';
    if (!isEditing && !pickupPoint.trim()) nextErrors.pickupPoint = 'Point de ramassage obligatoire';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      await onSave({
        nom: nom.trim(),
        prenom: prenom.trim(),
        promo: promo.trim(),
        classe: classe.trim(),
        contact: normalizedContact || contact.trim(),
        busLine,
        pickupPoint: pickupPoint.trim(),
        guardian: guardian.trim(),
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[92vh] overflow-y-auto modal-enter">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {isEditing ? 'Modifier l\'etudiant' : 'Nouvel etudiant'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Kouassi"
                />
              </div>
              {errors.nom && <p className="text-xs text-red-600 mt-1">{errors.nom}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prenom
              </label>
              <input
                type="text"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="Awa"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Promotion <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={promo}
                  onChange={(e) => setPromo(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  disabled={loadingOptions}
                  required
                >
                  <option value="">{loadingOptions ? 'Chargement...' : 'Selectionner une promo'}</option>
                  {promos.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              {errors.promo && <p className="text-xs text-red-600 mt-1">{errors.promo}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Classe <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={classe}
                  onChange={(e) => setClasse(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  disabled={loadingOptions || classes.length === 0}
                  required
                >
                  <option value="">
                    {loadingOptions ? 'Chargement...' : classes.length ? 'Selectionner une classe' : 'Aucune classe disponible'}
                  </option>
                  {classes.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              {errors.classe && <p className="text-xs text-red-600 mt-1">{errors.classe}</p>}
              {!loadingOptions && classes.length === 0 && (
                <p className="text-xs text-red-600 mt-1">
                  Ajoutez d'abord une classe dans Parametres &gt; Classes/Promos.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ligne <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Bus className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={busLine}
                  onChange={(e) => setBusLine(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  required
                >
                  <option value="">Selectionner une ligne</option>
                  {lines.map((line) => (
                    <option key={line.id} value={line.id}>
                      {line.name}
                    </option>
                  ))}
                </select>
              </div>
              {errors.busLine && <p className="text-xs text-red-600 mt-1">{errors.busLine}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact WhatsApp <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  onBlur={handleContactBlur}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="+2250700000000"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Format conseille: +2250700000000</p>
              {errors.contact && <p className="text-xs text-red-600 mt-1">{errors.contact}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parent / Tuteur
              </label>
              <input
                type="text"
                value={guardian}
                onChange={(e) => setGuardian(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="Nom du parent/tuteur"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Point de ramassage {!isEditing && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={pickupPoint}
                onChange={(e) => setPickupPoint(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                placeholder="Ex: Pharmacie Akwaba"
                required={!isEditing}
              />
            </div>
            {errors.pickupPoint && <p className="text-xs text-red-600 mt-1">{errors.pickupPoint}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              placeholder="Notes additionnelles..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-green-500 text-white rounded-lg hover:from-yellow-500 hover:to-green-600 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4 inline mr-2" />
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


