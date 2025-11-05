'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Document } from '@prisma/client'
import { SendEmailModal } from './SendEmailModal'

type DocumentSummary = Pick<
  Document,
  'id' | 'status' | 'recipient' | 'recipientEmail' | 'createdAt' | 'updatedAt' | 'errorMessage'
>

interface DocumentListProps {
  templateId: string
  refreshCounter: number
}

const statusStyles: Record<string, { bg: string; text: string }> = {
  processing: { bg: 'bg-gray-100', text: 'text-gray-800' },
  generated: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  sent: { bg: 'bg-green-100', text: 'text-green-800' },
  failed: { bg: 'bg-red-100', text: 'text-red-800' },
}

export function DocumentList({ templateId, refreshCounter }: DocumentListProps) {
  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<DocumentSummary | null>(null)

  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/templates/${templateId}/documents`)
      if (!res.ok) {
        throw new Error('Impossible de charger les documents.')
      }
      const data = await res.json()
      setDocuments(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }, [templateId])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments, refreshCounter])

  if (loading && documents.length === 0) {
    return <p>Chargement des documents...</p>
  }

  if (error) {
    return <p className="text-red-500">{error}</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Documents & Envoi</h2>
          <button onClick={fetchDocuments} disabled={loading} className="text-sm text-blue-600 hover:underline disabled:opacity-50">
              {loading ? 'Chargement...' : 'Rafraîchir'}
          </button>
      </div>
      
      {documents.length === 0 ? (
        <p>Aucun document n'a encore été généré pour ce template.</p>
      ) : (
        <div className="flow-root">
          <ul role="list" className="-my-4 divide-y divide-gray-200">
            {documents.map(doc => (
              <li key={doc.id} className="py-4">
                <div className="flex items-center space-x-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{doc.recipient || doc.recipientEmail || 'N/A'}</p>
                    <p className="truncate text-sm text-gray-500">{new Date(doc.createdAt).toLocaleString('fr-FR')}</p>
                    {doc.status === 'failed' && doc.errorMessage && (
                        <div className="mt-2 rounded-md bg-red-50 p-2">
                            <p className="text-xs text-red-700">
                                <span className="font-semibold">Erreur:</span> {doc.errorMessage}
                            </p>
                        </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[doc.status]?.bg || 'bg-gray-100'} ${statusStyles[doc.status]?.text || 'text-gray-800'}`}>
                        {doc.status}
                    </span>
                    {doc.status === 'generated' && (
                        <button 
                            onClick={() => setSelectedDocument(doc)}
                            className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500"
                        >
                            Envoyer
                        </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedDocument && ( <SendEmailModal document={selectedDocument} onClose={() => setSelectedDocument(null)} onEmailSent={fetchDocuments} /> )}
    </div>
  )
}
