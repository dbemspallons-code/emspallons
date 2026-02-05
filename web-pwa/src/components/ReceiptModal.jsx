import React from 'react';
import { X, Send, Download, FileText } from 'lucide-react';
import { generateReceiptHTML } from '../services/receiptService';

export default function ReceiptModal({ student, payment, onClose, onSendWhatsApp, onDownloadPDF }) {
  const { receiptNumber, html } = generateReceiptHTML({ student, payment });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-semibold">Reçu de paiement</h2>
            <p className="text-sm text-gray-500 mt-1">N° {receiptNumber}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onSendWhatsApp}
              className="px-3 py-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition"
              title="Envoyer par WhatsApp"
            >
              <Send className="w-4 h-4" />
            </button>
            <button
              onClick={onDownloadPDF}
              className="px-3 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
              title="Télécharger PDF"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
    </div>
  );
}

