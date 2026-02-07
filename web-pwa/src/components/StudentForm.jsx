import React, { useEffect, useMemo, useState } from 'react';
import { Save, UserPlus } from 'lucide-react';
import { BUS_LINES, SUBSCRIPTION_PLANS } from '../models/entities';
import { fetchPromos, fetchClasses } from '../services/classService';

const PRIX_MENSUEL_FIXE = 12500;
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

const emptyStudent = {
  name: '',
  contact: '+225',
  niveau: '',
  classGroup: '',
  busLine: BUS_LINES[0].id,
  guardian: '',
  pickupPoint: '',
  subscriptionPlan: SUBSCRIPTION_PLANS[0].id,
  monthlyFee: PRIX_MENSUEL_FIXE,
  notes: '',
};

export default function StudentForm({
  onSubmit,
  defaultValues,
  submitLabel = 'Enregistrer',
  loading,
  lines = BUS_LINES,
  plans = SUBSCRIPTION_PLANS,
}) {
  const startValues = useMemo(
    () => ({
      ...emptyStudent,
      ...defaultValues,
      subscriptionPlan: defaultValues.subscriptionPlan || defaultValues.subscription.planId || emptyStudent.subscriptionPlan,
      busLine: defaultValues.busLine || emptyStudent.busLine,
    }),
    [defaultValues],
  );
  const [formData, setFormData] = useState(startValues);
  const [errors, setErrors] = useState({});
  const [promos, setPromos] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const hasClasses = classes.length > 0;

  useEffect(() => {
    setFormData(startValues);
  }, [startValues]);

  useEffect(() => {
    loadPromosAndClasses();
  }, []);

  async function loadPromosAndClasses() {
    try {
      setLoadingData(true);
      const [promosData, classesData] = await Promise.all([
        fetchPromos(),
        fetchClasses(),
      ]);
      setPromos(promosData.filter(p => p.active !== false));
      setClasses(classesData.filter(c => c.active !== false));
    } catch (error) {
      console.error('Erreur chargement promos/classes:', error);
    } finally {
      setLoadingData(false);
    }
  }

  // Toujours appliquer le prix mensuel fixe par defaut (modifiable ensuite)
  useEffect(() => {
    setFormData(prev => {
      // si le montant n'a jamais ete saisi (>0), on ne force pas
      const shouldSetDefault = !prev || !Number(prev.monthlyFee) || prev.monthlyFee <= 0;
      return shouldSetDefault  { ...prev, monthlyFee: PRIX_MENSUEL_FIXE } : prev;
    });
  }, []);

  const setField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!formData.name.trim()) nextErrors.name = 'Nom obligatoire';
    if (!formData.contact.trim()) nextErrors.contact = 'Contact obligatoire';
    const normalizedContact = normalizePhone(ensureCivPrefix(formData.contact));
    if (normalizedContact && !PHONE_REGEX.test(normalizedContact.trim())) {
      nextErrors.contact = 'Format de numero invalide';
    }
    if (!formData.busLine.trim()) nextErrors.busLine = 'Ligne requise';
    // Point de ramassage obligatoire seulement a la creation (pas a la modification)
    if (!defaultValues && !formData.pickupPoint.trim()) nextErrors.pickupPoint = 'Point de ramassage obligatoire';
    if (!formData.niveau.trim()) nextErrors.niveau = 'Promotion obligatoire';
    if (!hasClasses) {
      nextErrors.classGroup = 'Aucune classe disponible. Ajoutez une classe dans Parametres.';
    } else if (!formData.classGroup.trim()) {
      nextErrors.classGroup = 'Classe obligatoire';
    }
    return nextErrors;
  };

  const handleSubmit = evt => {
    evt.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const normalizedContact = normalizePhone(ensureCivPrefix(formData.contact));
    onSubmit({
      ...formData,
      contact: normalizedContact || formData.contact,
      subscriptionPlan: formData.subscriptionPlan,
      // Le paiement (nombre de mois et total) sera saisi au moment du paiement, plus dans ce formulaire
    });
    setFormData(emptyStudent);
  };

  return (
    <form className="card layout-grid fade-in scroll-reveal" style={{ padding: '1.5rem' }} onSubmit={handleSubmit}>
      <div>
        <h2 className="section-title">Nouvel etudiant</h2>
        <p className="subtitle">Ajoutez un nouvel etudiant pour le transport scolaire.</p>
      </div>

      <div className="layout-grid layout-grid--balanced">
        <Field label="Nom de l'etudiant" error={errors.name}>
          <input
            className="input-field"
            type="text"
            placeholder="Ex: Kouassi Marie"
            value={formData.name}
            onChange={evt => setField('name', evt.target.value)}
          />
        </Field>
        <Field label="Contact" error={errors.contact}>
          <input
            className="input-field"
            type="tel"
            placeholder="Ex: +2250700000000"
            value={formData.contact}
            onChange={evt => setField('contact', evt.target.value)}
            onBlur={() => setField('contact', normalizePhone(ensureCivPrefix(formData.contact)))}
          />
        </Field>
        <Field label="Promotion (Niveau)" error={errors.niveau}>
          <select
            className="input-field"
            value={formData.niveau || ''}
            onChange={evt => setField('niveau', evt.target.value)}
            required
          >
            <option value="">Selectionner une promotion</option>
            {loadingData ? (
              <option>Chargement...</option>
            ) : promos.length > 0 ? (
              promos.map(promo => (
                <option key={promo.id} value={promo.name}>
                  {promo.name}
                </option>
              ))
            ) : (
              <>
                <option value="Licence 1">Licence 1</option>
                <option value="Licence 2">Licence 2</option>
                <option value="Licence 3">Licence 3</option>
                <option value="Master 1">Master 1</option>
                <option value="Master 2">Master 2</option>
              </>
            )}
          </select>
        </Field>
        <Field label="Classe/Groupe" error={errors.classGroup}>
          <select
            className="input-field"
            value={formData.classGroup || ''}
            onChange={evt => setField('classGroup', evt.target.value)}
            disabled={loadingData || !hasClasses}
            required
          >
            <option value="">
              {loadingData ? 'Chargement...' : hasClasses ? 'Selectionner une classe' : 'Aucune classe disponible'}
            </option>
            {classes.map(classe => (
              <option key={classe.id} value={classe.name}>
                {classe.name}
              </option>
            ))}
          </select>
          {!hasClasses && !loadingData && (
            <p style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '0.35rem' }}>
              Ajoutez d'abord une classe dans Parametres > Classes/Promos.
            </p>
          )}
        </Field>
        <Field label="Ligne de bus" error={errors.busLine}>
          <select
            className="input-field"
            value={formData.busLine}
            onChange={evt => setField('busLine', evt.target.value)}
          >
            {lines.map(line => (
              <option key={line.id} value={line.id}>
                {line.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Parent/Tuteur">
          <input
            className="input-field"
            type="text"
            placeholder="Ex: M. Kouassi"
            value={formData.guardian}
            onChange={evt => setField('guardian', evt.target.value)}
          />
        </Field>
        <Field label="Point de ramassage" error={errors.pickupPoint}>
          <input
            className="input-field"
            type="text"
            placeholder="Ex: Pharmacie Akwaba"
            value={formData.pickupPoint || ''}
            onChange={evt => setField('pickupPoint', evt.target.value)}
            required={!defaultValues}
          />
          {defaultValues && (
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              Modifiable a tout moment
            </p>
          )}
        </Field>
        <Field label="Type d'abonnement">
          <select
            className="input-field"
            value={formData.subscriptionPlan}
            onChange={evt => setField('subscriptionPlan', evt.target.value)}
          >
            {plans.map(plan => (
              <option key={plan.id} value={plan.id}>
                {plan.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Notes">
        <textarea
          className="input-field"
          rows={3}
          placeholder="Informations importantes a retenir..."
          value={formData.notes}
          onChange={evt => setField('notes', evt.target.value)}
        />
      </Field>

      <div className="toolbar" style={{ justifyContent: 'flex-end', marginTop: '0.5rem' }}>
        <button
          type="reset"
          className="button button--subtle"
          onClick={() => {
            setFormData(emptyStudent);
            setErrors({});
          }}
        >
          <UserPlus size={16} /> Nouveau
        </button>
        <button type="submit" className="button" disabled={loading}>
          <Save size={16} /> {loading ? 'Enregistrement...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="layout-grid" style={{ gap: '0.35rem' }}>
      <span style={{ fontWeight: 600, color: '#0f172a' }}>{label}</span>
      {children}
      {error  <span style={{ color: '#b91c1c', fontSize: '0.8rem' }}>{error}</span> : null}
    </label>
  );
}


