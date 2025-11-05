'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Document {
  id: string
  recipient: string | null
  recipientEmail: string | null
  status: string
  createdAt: string
}

interface BulkSendResult {
  success: boolean
  summary?: {
    total: number
    success: number
    failed: number
  }
  results?: Array<{
    documentId: string
    success: boolean
    error?: string
  }>
  jobIds?: string[]
  message?: string
  error?: string
}

export default function BulkSendPage() {
  const params = useParams()
  const projectId = params['id'] as string
  const templateId = params['templateId'] as string

  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<BulkSendResult | null>(null)

  // Paramètres d'envoi
  const [subject, setSubject] = useState('')
  const [htmlTemplate, setHtmlTemplate] = useState('')
  const [attachDocument, setAttachDocument] = useState(true)
  const [useQueue, setUseQueue] = useState(false)

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true)
        // Récupérer tous les documents générés du projet, puis filtrer côté client
        // (l'API ne supporte pas encore le filtre par templateId directement)
        const res = await fetch(`/api/documents?projectId=${projectId}&status=generated&limit=1000`)
        if (res.ok) {
          const data = await res.json()
          // Filtrer les documents pour ce template uniquement et avec email
          const templateDocs = (data.documents || []).filter(
            (doc: { templateId: string; recipientEmail: string | null }) =>
              doc.templateId === templateId && doc.recipientEmail !== null
          )
          setDocuments(templateDocs)
        } else {
          const errorData = await res.json().catch(() => ({}))
          setError(`Erreur ${res.status}: ${errorData.error || 'Erreur lors du chargement'}`)
        }
      } catch (err) {
        console.error('Fetch error:', err)
        setError(`Erreur réseau: ${err instanceof Error ? err.message : 'Erreur inconnue'}`)
      } finally {
        setLoading(false)
      }
    }

    fetchDocuments()
  }, [projectId, templateId])

  const handleSend = async () => {
    if (documents.length === 0) {
      setError('Aucun document à envoyer')
      return
    }

    setSending(true)
    setError('')
    setResult(null)

    try {
      const payload: any = {
        attachDocument,
        useQueue,
      }

      if (subject.trim()) {
        payload.subject = subject.trim()
      }

      if (htmlTemplate.trim()) {
        payload.htmlTemplate = htmlTemplate.trim()
      }

      const res = await fetch(`/api/projects/${projectId}/templates/${templateId}/send-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (res.ok) {
        setResult(data)
        if (data.success) {
          // Recharger les documents après un court délai
          setTimeout(() => {
            window.location.reload()
          }, 2000)
        }
      } else {
        setError(data.error || 'Erreur lors de l\'envoi')
      }
    } catch (err) {
      console.error('Send error:', err)
      setError(`Erreur réseau: ${err instanceof Error ? err.message : 'Erreur inconnue'}`)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center">Chargement des documents...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href={`/projects/${projectId}/templates/${templateId}`}
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            ← Retour au template
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Envoi en masse par email</h1>
          <p className="mt-2 text-sm text-gray-600">
            Envoyer les documents générés par email aux destinataires
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {result && (
          <div
            className={`mb-6 rounded-lg border p-4 text-sm ${
              result.success
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-yellow-200 bg-yellow-50 text-yellow-800'
            }`}
          >
            <div className="font-semibold">{result.message || "Résultat de l'envoi"}</div>
            {result.summary && (
              <div className="mt-2">
                <p>
                  Total: {result.summary.total} | Succès: {result.summary.success} | Échecs:{' '}
                  {result.summary.failed}
                </p>
              </div>
            )}
            {result.jobIds && (
              <div className="mt-2 text-xs">
                Jobs créés: {result.jobIds.length}. Utilisez GET /api/jobs/[id] pour suivre la
                progression.
              </div>
            )}
          </div>
        )}

        {/* Statistiques */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Documents prêts à être envoyés</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm text-gray-600">Total</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{documents.length}</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm text-gray-600">Avec email</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">
                {documents.filter((d) => d.recipientEmail).length}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="text-sm text-gray-600">Sans email</div>
              <div className="mt-1 text-2xl font-bold text-red-600">
                {documents.filter((d) => !d.recipientEmail).length}
              </div>
            </div>
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
            Aucun document généré avec une adresse email de destinataire trouvé.
            <Link
              href={`/projects/${projectId}/generate?templateId=${templateId}`}
              className="ml-2 text-blue-600 hover:text-blue-500"
            >
              Générer des documents →
            </Link>
          </div>
        ) : (
          <>
            {/* Configuration de l'envoi */}
            <div className="mb-6 rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Configuration de l&apos;envoi</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Objet de l&apos;email
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ex: Votre document est prêt"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Laisser vide pour utiliser l&apos;objet par défaut
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Template HTML (optionnel)
                  </label>
                  <textarea
                    value={htmlTemplate}
                    onChange={(e) => setHtmlTemplate(e.target.value)}
                    placeholder="Ex: <h1>Bonjour {{recipient_name}}</h1><p>Votre document est prêt.</p>"
                    rows={6}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Supporte les variables <code>{'{{variable}}'}</code>
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={attachDocument}
                      onChange={(e) => setAttachDocument(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Joindre le document en pièce jointe</span>
                  </label>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={useQueue}
                      onChange={(e) => setUseQueue(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      Utiliser la queue (recommandé pour {documents.length > 10 ? 'plus de' : ''}{' '}
                      {documents.length > 10 ? '10 documents' : 'grands volumes'})
                    </span>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleSend}
                  disabled={sending || documents.filter((d) => d.recipientEmail).length === 0}
                  className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? (
                    <>
                      <svg
                        className="mr-2 h-4 w-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <svg
                        className="mr-2 h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      Envoyer {documents.filter((d) => d.recipientEmail).length} email(s)
                    </>
                  )}
                </button>
                <Link
                  href={`/projects/${projectId}/templates/${templateId}`}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </Link>
              </div>
            </div>

            {/* Liste des documents */}
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Documents ({documents.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">ID</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Destinataire</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Email</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="odd:bg-white even:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-900">
                          {doc.id.slice(0, 12)}...
                        </td>
                        <td className="px-4 py-3 text-gray-900">{doc.recipient || '-'}</td>
                        <td className="px-4 py-3 text-gray-900">
                          {doc.recipientEmail || (
                            <span className="text-red-600">Aucun email</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                              doc.status === 'sent'
                                ? 'bg-green-100 text-green-800'
                                : doc.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {doc.status === 'sent'
                              ? 'Envoyé'
                              : doc.status === 'failed'
                              ? 'Échoué'
                              : 'Généré'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

