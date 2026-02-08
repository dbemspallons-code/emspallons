import React from 'react';
import { X, BookOpen, DollarSign, Calendar, Users, FileText, HelpCircle, Download, Upload, Filter } from 'lucide-react';

export default function NoticeModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-yellow-50 to-green-50">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-yellow-500" />
            <h2 className="text-xl font-semibold">Notice d'utilisation</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-yellow-500" />
              Enregistrement d'un paiement
            </h3>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Calcul automatique du montant total :</strong>
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Le montant mensuel par défaut est de <strong>12 500 FCFA</strong> (modifiable par l'administrateur)</li>
                <li>Lorsque vous sélectionnez le nombre de mois, le montant total est <strong>calculé automatiquement</strong></li>
                <li>Formule : <strong>Montant total = Nombre de mois × Montant mensuel</strong></li>
                <li>Vous pouvez modifier le montant mensuel si nécessaire avant d'enregistrer</li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-500" />
              Période d'abonnement
            </h3>
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>L'abonnement commence toujours le <strong>1er du mois</strong> de paiement</li>
                <li>Il se termine le <strong>dernier jour du dernier mois</strong> couvert</li>
                <li>Une période de grâce de <strong>5 jours</strong> est accordée après la fin de l'abonnement</li>
                <li>Pendant la période de grâce, l'accès est maintenu (statut "EN RETARD")</li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Statuts des étudiants
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <span><strong>ACTIF</strong> : Abonnement valide, accès autorisé</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                <span><strong>EXPIRE BIENTÔT</strong> : Expire dans moins de 15 jours</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                <span><strong>EN RETARD</strong> : Dans la période de grâce (5 jours après expiration)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span><strong>EXPIRÉ</strong> : Abonnement expiré, accès refusé</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-gray-500"></span>
                <span><strong>AUCUN ABONNEMENT</strong> : Aucun paiement enregistré</span>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-500" />
              Double comptabilité
            </h3>
            <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li><strong>Revenus encaissés</strong> : Montants réellement reçus dans le mois (date de paiement)</li>
                <li><strong>Revenus comptabilisés</strong> : Répartition mensuelle des abonnements (montant mensuel × nombre de mois actifs)</li>
                <li>Un paiement de 5 mois sera réparti sur 5 mois dans les revenus comptabilisés</li>
              </ul>
            </div>
          </section>


          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Filter className="w-5 h-5 text-emerald-500" />
              Filtres rapides (ligne, promo, classe)
            </h3>
            <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded">
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Utilisez les filtres pour afficher uniquement une <strong>ligne</strong>, une <strong>promo</strong> ou une <strong>classe</strong>.</li>
                <li>La recherche accepte aussi le <strong>nom de ligne</strong> et la <strong>promo</strong>.</li>
                <li>Le bouton <strong>Rinitialiser filtres</strong> remet tout zro.</li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-500" />
              Export Excel
            </h3>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>L'export CSV est <strong>compatible Excel</strong>.</li>
                <li>Si un filtre est actif, l'export ne contient que cette liste filtre.</li>
                <li>Colonnes incluses : nom, prnom, promo, classe, ligne, statut, contact.</li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Upload className="w-5 h-5 text-orange-500" />
              Import Excel
            </h3>
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Vous pouvez importer un CSV crdans Excel (sparateur <strong>;</strong> ou <strong>,</strong>).</li>
                <li>Champs reconnus : nom, prnom, promo, classe, ligne, contact, notes.</li>
                <li>Astuce : exportez d'abord un CSV puis rimportez-le aprs modification.</li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-orange-500" />
              Aide contextuelle
            </h3>
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
              <p className="text-sm text-gray-600">
                Cliquez sur l'icône <strong></strong> à côté des champs pour obtenir de l'aide contextuelle.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-500" />
              Synchronisation multi-appareils
            </h3>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="text-sm text-gray-600 mb-2">
                <strong>✨ Synchronisation automatique :</strong> Toutes vos données sont synchronisées en temps réel via Firestore.
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Les modifications effectuées sur un appareil sont immédiatement visibles sur tous les autres appareils</li>
                <li>Plus besoin de rafraîchir manuellement - la synchronisation est automatique</li>
                <li>Toutes les données critiques (étudiants, paiements, contrôleurs, etc.) sont stockées dans le cloud</li>
                <li>Vos données sont sécurisées et sauvegardées automatiquement</li>
              </ul>
            </div>
          </section>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>💡 Astuce :</strong> Tous les montants sont exprimés en <strong>Francs CFA (FCFA)</strong>. 
              Le montant mensuel par défaut peut être modifié dans les paramètres (réservé aux administrateurs).
            </p>
          </div>
        </div>

        <div className="flex justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-green-500 text-white rounded-lg hover:from-yellow-500 hover:to-green-600 transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

