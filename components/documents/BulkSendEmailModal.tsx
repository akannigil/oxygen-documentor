'use client'

import { useMemo, useState } from 'react'

interface Document {
  id: string
  recipientEmail: string | null
  recipient?: string | null
  status?: string
}

interface BulkSendEmailModalProps {
  selectedDocuments: Document[]
  onClose: () => void
  onSent: () => void
}

export function BulkSendEmailModal({
  selectedDocuments,
  onClose,
  onSent,
}: BulkSendEmailModalProps) {
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    success: number
    failed: number
    total: number
    errors?: Array<{ documentId: string; error: string }>
  } | null>(null)

  const docsWithEmail = useMemo(
    () => selectedDocuments.filter((d) => !!d.recipientEmail && d.status !== 'sent'),
    [selectedDocuments]
  )
  const docsWithoutEmail = useMemo(
    () => selectedDocuments.filter((d) => !d.recipientEmail),
    [selectedDocuments]
  )
  const docsAlreadySent = useMemo(
    () => selectedDocuments.filter((d) => d.status === 'sent'),
    [selectedDocuments]
  )

  const handleBulkSend = async () => {
    if (docsWithEmail.length === 0) {
      setError('Aucun document avec email valide à envoyer')
      return
    }

    setSending(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/documents/bulk-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentIds: docsWithEmail.map((d) => d.id),
        }),
      })

      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}) as { error?: string })
        throw new Error(data.error || 'Erreur lors de l’envoi en masse')
      }

      const data = await res.json()
      setResult({
        success: data.success || 0,
        failed: data.failed || 0,
        total: data.total || docsWithEmail.length,
        errors: data.errors,
      })

      // Appeler onSent après un court délai pour permettre à l'utilisateur de voir le résultat
      setTimeout(() => {
        onSent()
        onClose()
      }, 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur pendant l'envoi en masse")
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-gray-500 bg-opacity-75 transition-opacity"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !sending) {
          onClose()
        }
      }}
    >
      <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <h3 className="text-lg font-semibold leading-6 text-gray-900" id="modal-title">
                Envoi en masse
              </h3>
              <div className="mt-4 space-y-4">
                <p className="text-sm text-gray-700">
                  {selectedDocuments.length} document{selectedDocuments.length > 1 ? 's' : ''}{' '}
                  sélectionné{selectedDocuments.length > 1 ? 's' : ''}.
                </p>

                {docsWithEmail.length > 0 && (
                  <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
                    {docsWithEmail.length} document{docsWithEmail.length > 1 ? 's' : ''} sera
                    {docsWithEmail.length > 1 ? 'ont' : ''} envoyé{docsWithEmail.length > 1 ? 's' : ''}.
                  </div>
                )}

                {docsWithoutEmail.length > 0 && (
                  <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
                    {docsWithoutEmail.length} document{docsWithoutEmail.length > 1 ? 's' : ''} n
                    {docsWithoutEmail.length > 1 ? "'ont" : "'a"} pas d'email destinataire et
                    {docsWithoutEmail.length > 1 ? ' seront' : ' sera'} ignoré
                    {docsWithoutEmail.length > 1 ? 's' : ''}.
                  </div>
                )}

                {docsAlreadySent.length > 0 && (
                  <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-800">
                    {docsAlreadySent.length} document{docsAlreadySent.length > 1 ? 's' : ''}{' '}
                    déjà envoyé{docsAlreadySent.length > 1 ? 's' : ''} et sera
                    {docsAlreadySent.length > 1 ? 'ont' : ''} ignoré{docsAlreadySent.length > 1 ? 's' : ''}.
                  </div>
                )}

                {result && (
                  <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
                    <p className="font-semibold">Envoi terminé :</p>
                    <ul className="mt-1 list-disc list-inside space-y-1">
                      <li>{result.success} réussi{result.success > 1 ? 's' : ''}</li>
                      <li>{result.failed} échoué{result.failed > 1 ? 's' : ''}</li>
                    </ul>
                    {result.errors && result.errors.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer font-medium">Détails des erreurs</summary>
                        <ul className="mt-1 list-disc list-inside space-y-1">
                          {result.errors.map((err, idx) => (
                            <li key={idx} className="text-xs">
                              {err.documentId.slice(0, 8)}... : {err.error}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}

                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              {!result && (
                <button
                  type="button"
                  onClick={handleBulkSend}
                  disabled={sending || docsWithEmail.length === 0}
                  className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 sm:ml-3 sm:w-auto"
                >
                  {sending ? 'Envoi en cours...' : `Envoyer (${docsWithEmail.length})`}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                disabled={sending && !result}
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 sm:mt-0 sm:w-auto"
              >
                {result ? 'Fermer' : 'Annuler'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

