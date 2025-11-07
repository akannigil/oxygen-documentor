'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type MailDefaults = {
  subject?: string
  html?: string
  from?: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
  columnMapping?: {
    recipient_name?: string
    recipient_email?: string
  }
}

interface SendCenterProps {
  templateId: string
  projectId: string
  templateName: string
  projectName: string
  mailDefaults: MailDefaults
}

interface DocItem {
  id: string
  status: 'generated' | 'sent' | 'failed' | string
  recipient: string | null
  recipientEmail: string | null
  createdAt: string
  updatedAt: string
  emailSentAt?: string | null
  errorMessage?: string | null
}

function renderTemplate(str: string, vars: Record<string, unknown>): string {
  return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const v = vars[key]
    return v === undefined || v === null ? '' : String(v)
  })
}

export function SendCenter({
  templateId,
  templateName,
  projectName,
  mailDefaults,
}: SendCenterProps) {
  const [status, setStatus] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [docs, setDocs] = useState<DocItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<{ subject: string; html: string }>({
    subject: '',
    html: '',
  })

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (search) params.set('search', search)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      const res = await fetch(`/api/templates/${templateId}/documents?${params.toString()}`)
      if (!res.ok) throw new Error('Impossible de charger les documents')
      const data = await res.json()
      setDocs(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }, [templateId, status, search, startDate, endDate])

  useEffect(() => {
    fetchDocs()
  }, [fetchDocs])

  const allSelectableIds = useMemo(
    () => docs.filter((d) => d.status === 'generated').map((d) => d.id),
    [docs]
  )
  const isAllSelected =
    allSelectableIds.length > 0 && allSelectableIds.every((id) => selectedIds.has(id))
  const toggleSelectAll = () => {
    setSelectedIds(isAllSelected ? new Set() : new Set(allSelectableIds))
  }
  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const computePreview = useCallback(
    async (docId: string) => {
      try {
        const res = await fetch(`/api/documents/${docId}`)
        if (!res.ok) throw new Error('Impossible de charger le document')
        const doc = (await res.json()) as {
          data?: Record<string, unknown>
          recipient?: string | null
          recipientEmail?: string | null
        }
        const vars = {
          ...(doc.data || {}),
          recipient_name: doc.recipient || '',
          recipient_email: doc.recipientEmail || '',
          template_name: templateName,
          project_name: projectName,
        }
        const subject = renderTemplate(mailDefaults.subject || 'Votre document', vars)
        const html = renderTemplate(mailDefaults.html || '<p>Votre document est prêt.</p>', vars)
        setPreviewData({ subject, html })
        setPreviewId(docId)
      } catch (e) {
        setPreviewData({
          subject: 'Aperçu indisponible',
          html: '<p>Erreur de prévisualisation</p>',
        })
        setPreviewId(docId)
      }
    },
    [mailDefaults, templateName, projectName]
  )

  const bulkSend = useCallback(async () => {
    try {
      const res = await fetch(`/api/templates/${templateId}/send-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentIds: Array.from(selectedIds),
          subject: mailDefaults.subject || undefined,
          htmlTemplate: mailDefaults.html || undefined,
          from: mailDefaults.from || undefined,
          replyTo: mailDefaults.replyTo || undefined,
          cc: mailDefaults.cc,
          bcc: mailDefaults.bcc,
          useQueue: true,
          attachDocument: true,
        }),
      })
      if (!res.ok) throw new Error('Erreur lors de l’envoi en masse')
      await fetchDocs()
      setSelectedIds(new Set())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l’envoi en masse')
    }
  }, [templateId, selectedIds, mailDefaults, fetchDocs])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Send Center — {templateName}</h1>
        <p className="text-sm text-gray-600">Projet: {projectName}</p>
      </div>

      {/* Filtres */}
      <div className="rounded-lg bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-800">Statut</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-400 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="">Tous</option>
              <option value="generated">Généré</option>
              <option value="sent">Envoyé</option>
              <option value="failed">Échoué</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800">Recherche</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Destinataire, email, ID..."
              className="mt-1 w-full rounded-md border border-gray-400 px-3 py-2 text-sm text-gray-900 placeholder-gray-600 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800">Début</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-400 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800">Fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-400 px-3 py-2 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={fetchDocs}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Appliquer
          </button>
          <button
            onClick={() => {
              setStatus('')
              setSearch('')
              setStartDate('')
              setEndDate('')
              fetchDocs()
            }}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-gray-800">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={toggleSelectAll}
            className="h-4 w-4 rounded border-gray-400 text-blue-600 focus:ring-blue-600"
          />
          Sélectionner tout (générés)
        </label>
        <button
          disabled={selectedIds.size === 0}
          onClick={bulkSend}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          Envoyer la sélection
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      {/* Liste + Preview */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow-sm lg:col-span-2">
          {loading ? (
            <p>Chargement…</p>
          ) : docs.length === 0 ? (
            <p>Aucun document trouvé.</p>
          ) : (
            <ul role="list" className="-my-4 divide-y divide-gray-200">
              {docs.map((d) => (
                <li key={d.id} className="py-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      disabled={d.status !== 'generated'}
                      checked={selectedIds.has(d.id)}
                      onChange={() => toggleOne(d.id)}
                      className="h-4 w-4 rounded border-gray-400 text-blue-600 focus:ring-blue-600"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {d.recipient || d.recipientEmail || d.id}
                      </p>
                      <p className="text-xs text-gray-600">
                        Créé: {new Date(d.createdAt).toLocaleString('fr-FR')}
                        {d.emailSentAt
                          ? ` • Envoyé: ${new Date(d.emailSentAt).toLocaleString('fr-FR')}`
                          : ''}
                      </p>
                      {d.errorMessage && (
                        <p className="text-xs text-red-600">Erreur: {d.errorMessage}</p>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${d.status === 'sent' ? 'bg-green-100 text-green-800' : d.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}
                    >
                      {d.status}
                    </span>
                    <button
                      onClick={() => computePreview(d.id)}
                      className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-50"
                    >
                      Aperçu mail
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900">Aperçu</h3>
          {previewId ? (
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700">Sujet</label>
                <div className="mt-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900">
                  {previewData.subject}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">HTML</label>
                <div
                  className="mt-1 rounded-md border border-gray-300 bg-gray-50 p-3 text-sm text-gray-900"
                  dangerouslySetInnerHTML={{ __html: previewData.html }}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              Sélectionnez un document pour prévisualiser l’email.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
