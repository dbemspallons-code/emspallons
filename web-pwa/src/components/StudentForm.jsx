import React, { useEffect, useMemo, useState } from 'react';
import { Save, UserPlus } from 'lucide-react';
import { BUS_LINES, SUBSCRIPTION_PLANS } from '../models/entities';
import { fetchPromos, fetchClasses } from '../services/classService';

const PRIX_MENSUEL_FIXE = 12500;

const emptyStudent = {
  name: '',
  contact: '',
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
      subscriptionPlan: defaultValues?.subscriptionPlan || defaultValues?.subscription?.planId || emptyStudent.subscriptionPlan,
      busLine: defaultValues?.busLine || emptyStudent.busLine,
    }),
    [defaultValues],
  );
  const [formData, setFormData] = useState(startValues);
  const [errors, setErrors] = useState({});
  const [promos, setPromos] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

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

  // Toujours appliquer le prix mensuel fixe par défaut (modifiable ensuite)
  useEffect(() => {
    setFormData(prev => {
      // si le montant n'a jamais été saisi (>0), on ne force pas
      const shouldSetDefault = !prev || !Number(prev.monthlyFee) || prev.monthlyFee <= 0;
      return shouldSetDefault ? { ...prev, monthlyFee: PRIX_MENSUEL_FIXE } : prev;
    });
  }, []);

  const setField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!formData.name?.trim()) nextErrors.name = 'Nom obligatoire';
    if (!formData.contact?.trim()) nextErrors.contact = 'Contact obligatoire';
    if (formData.contact && !/^\+?[0-9\s-]{8,18}$/.test(formData.contact.trim())) {
      nextErrors.contact = 'Format de numéro invalide';
    }
    if (!formData.busLine?.trim()) nextErrors.busLine = 'Ligne requise';
    // Point de ramassage obligatoire seulement à la création (pas à la modification)
    if (!defaultValues && !formData.pickupPoint?.trim()) nextErrors.pickupPoint = 'Point de ramassage obligatoire';
    if (!formData.niveau?.trim()) nextErrors.niveau = 'Promotion obligatoire';
    return nextErrors;
  };

  const handleSubmit = evt => {
    evt.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSubmit?.({
      ...formData,
      subscriptionPlan: formData.subscriptionPlan,
      // Le paiement (nombre de mois et total) sera saisi au moment du paiement, plus dans ce formulaire
    });
    setFormData(emptyStudent);
  };

  return (
    <form className="card layout-grid fade-in scroll-reveal" style={{ padding: '1.5rem' }} onSubmit={handleSubmit}>
      <div>
        <h2 className="section-title">Nouvel étudiant</h2>
        <p className="subtitle">Ajoutez un nouvel étudiant pour le transport scolaire.</p>
      </div>

      <div className="layout-grid layout-grid--balanced">
        <Field label="Nom de l'étudiant" error={errors.name}>
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
          />
        </Field>
        <Field label="Promotion (Niveau)" error={errors.niveau}>
          <select
            className="input-field"
            value={formData.niveau || ''}
            onChange={evt => setField('niveau', evt.target.value)}
            required
          >
            <option value="">Sélectionner une promotion</option>
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
          {loadingData ? (
            <input
              className="input-field"
              type="text"
              placeholder="Chargement..."
              disabled
            />
          ) : classes.length > 0 ? (
            <select
              className="input-field"
              value={formData.classGroup || ''}
              onChange={evt => setField('classGroup', evt.target.value)}
            >
              <option value="">Sélectionner une classe</option>
              {classes.map(classe => (
                <option key={classe.id} value={classe.name}>
                  {classe.name}
                </option>
              ))}
            </select>
          ) : (
          <input
            className="input-field"
            type="text"
            placeholder="Ex: Groupe A, Classe B"
            value={formData.classGroup}
            onChange={evt => setField('classGroup', evt.target.value)}
          />
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
              Modifiable à tout moment
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
          placeholder="Informations importantes à retenir..."
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
      {error ? <span style={{ color: '#b91c1c', fontSize: '0.8rem' }}>{error}</span> : null}
    </label>
  );
}

