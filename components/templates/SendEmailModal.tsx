'use client'

import { useState } from 'react'

interface Document {
  id: string
  recipientEmail: string | null
}

interface SendEmailModalProps {
  document: Document
  onClose: () => void
  onEmailSent: () => void
}

export function SendEmailModal({ document, onClose, onEmailSent }: SendEmailModalProps) {
  const [recipient, setRecipient] = useState(document.recipientEmail || '')
  const [subject, setSubject] = useState('Votre document')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async () => {
    setSending(true)
    setError(null)

    try {
      const res = await fetch(`/api/documents/${document.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            recipientEmail: recipient,
            subject: subject,
            attachDocument: true 
        }),
      });

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur lors de l\'envoi')
      }

      onEmailSent() // Refresh the list
      onClose() // Close the modal
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur inconnue est survenue.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-10" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <h3 className="text-lg font-semibold leading-6 text-gray-900" id="modal-title">Envoyer le document</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Destinataire</label>
                  <input type="email" id="email" value={recipient} onChange={e => setRecipient(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Sujet</label>
                  <input type="text" id="subject" value={subject} onChange={e => setSubject(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button type="button" onClick={handleSend} disabled={sending} className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto disabled:opacity-50">
                {sending ? 'Envoi en cours...' : 'Envoyer'}
              </button>
              <button type="button" onClick={onClose} className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto">
                Annuler
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
