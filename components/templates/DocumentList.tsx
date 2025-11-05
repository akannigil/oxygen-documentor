'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { Document } from '@prisma/client'
import { SendEmailModal } from './SendEmailModal'
import { BulkSendEmailModal } from './BulkSendEmailModal'

type DocumentSummary = Pick<
  Document,
  'id' | 'status' | 'recipient' | 'recipientEmail' | 'createdAt' | 'updatedAt' | 'errorMessage'
>

interface DocumentListProps {
  templateId: string
  refreshCounter: number
  defaultSubject?: string
  defaultHtmlTemplate?: string
  defaultFrom?: string
  defaultReplyTo?: string
  defaultCc?: string | string[]
  defaultBcc?: string | string[]
}

const statusStyles: Record<string, { bg: string; text: string }> = {
  processing: { bg: 'bg-gray-100', text: 'text-gray-800' },
  generated: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  sent: { bg: 'bg-green-100', text: 'text-green-800' },
  failed: { bg: 'bg-red-100', text: 'text-red-800' },
}

export function DocumentList({ templateId, refreshCounter, defaultSubject, defaultHtmlTemplate, defaultFrom, defaultReplyTo, defaultCc, defaultBcc }: DocumentListProps) {
  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<DocumentSummary | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkModal, setShowBulkModal] = useState(false)

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

  const allSelectableIds = useMemo(() => documents.filter(d => d.status === 'generated').map(d => d.id), [documents])

  const isAllSelected = allSelectableIds.length > 0 && allSelectableIds.every(id => selectedIds.has(id))

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allSelectableIds))
    }
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openPreview = async (documentId: string) => {
    try {
      const res = await fetch(`/api/documents/${documentId}`)
      if (!res.ok) throw new Error('Impossible de récupérer le document')
      const data = await res.json() as { downloadUrl?: string }
      if (data.downloadUrl) window.open(data.downloadUrl, '_blank')
    } catch {}
  }

  const downloadDocument = async (documentId: string) => {
    try {
      const res = await fetch(`/api/documents/${documentId}`)
      if (!res.ok) throw new Error('Impossible de récupérer le document')
      const data = await res.json() as { downloadUrl?: string }
      if (data.downloadUrl) {
        const a = document.createElement('a')
        a.href = data.downloadUrl
        a.download = ''
        document.body.appendChild(a)
        a.click()
        a.remove()
      }
    } catch {}
  }

  if (loading && documents.length === 0) {
    return <p>Chargement des documents...</p>
  }

  if (error) {
    return <p className="text-red-500">{error}</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">Documents & Envoi</h2>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              Sélectionner tout (générés)
            </label>
            <button
              onClick={() => setShowBulkModal(true)}
              disabled={selectedIds.size === 0}
              className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              Envoyer en masse
            </button>
            <button onClick={fetchDocuments} disabled={loading} className="text-sm text-blue-600 hover:underline disabled:opacity-50">
                {loading ? 'Chargement...' : 'Rafraîchir'}
            </button>
          </div>
      </div>
      
      {documents.length === 0 ? (
        <p>Aucun document n&apos;a encore été généré pour ce template.</p>
      ) : (
        <div className="flow-root">
          <ul role="list" className="-my-4 divide-y divide-gray-200">
            {documents.map(doc => (
              <li key={doc.id} className="py-4">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={selectedIds.has(doc.id)}
                    onChange={() => toggleSelectOne(doc.id)}
                    disabled={doc.status !== 'generated'}
                  />
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
                    <button
                      onClick={() => openPreview(doc.id)}
                      className="rounded-md bg-white border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Aperçu
                    </button>
                    <button
                      onClick={() => downloadDocument(doc.id)}
                      className="rounded-md bg-white border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Télécharger
                    </button>
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

      {selectedDocument && (
        <SendEmailModal
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
          onEmailSent={fetchDocuments}
          defaultSubject={defaultSubject || 'Votre document'}
          defaultHtmlTemplate={defaultHtmlTemplate}
          defaultFrom={defaultFrom}
          defaultReplyTo={defaultReplyTo}
          defaultCc={defaultCc}
          defaultBcc={defaultBcc}
        />
      )}

      {showBulkModal && (
        <BulkSendEmailModal
          templateId={templateId}
          selectedDocuments={documents.filter(d => selectedIds.has(d.id))}
          onClose={() => setShowBulkModal(false)}
          onQueued={() => { setShowBulkModal(false); setSelectedIds(new Set()); fetchDocuments() }}
          defaultSubject={defaultSubject}
          defaultHtmlTemplate={defaultHtmlTemplate}
          defaultFrom={defaultFrom}
          defaultReplyTo={defaultReplyTo}
          defaultCc={defaultCc}
          defaultBcc={defaultBcc}
        />
      )}
    </div>
  )
}
