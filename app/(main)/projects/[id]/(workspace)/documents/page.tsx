'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { DeleteDocumentButton } from '@/components/documents/DeleteDocumentButton'
import { SendEmailModal } from '@/components/templates/SendEmailModal'
import { BulkSendEmailModal } from '@/components/documents/BulkSendEmailModal'
import { DEFAULT_EMAIL_TEMPLATE } from '@/lib/email/templates'

interface DocumentItem {
  id: string
  templateId: string
  mimeType: string
  status: string
  recipient: string | null
  recipientEmail: string | null
  createdAt: string
  template?: {
    id: string
    name: string
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function ProjectDocumentsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const projectId = params['id'] as string

  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Sélection multiple
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set())

  // États pour les modals
  const [showSendEmailModal, setShowSendEmailModal] = useState(false)
  const [selectedDocumentForEmail, setSelectedDocumentForEmail] = useState<DocumentItem | null>(
    null
  )
  const [showBulkSendEmailModal, setShowBulkSendEmailModal] = useState(false)

  // Filtres
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || '')
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('search') || '')
  const [startDate, setStartDate] = useState<string>(searchParams.get('startDate') || '')
  const [endDate, setEndDate] = useState<string>(searchParams.get('endDate') || '')
  const [currentPage, setCurrentPage] = useState<number>(
    parseInt(searchParams.get('page') || '1', 10)
  )
  const [rowsPerPage, setRowsPerPage] = useState<number>(
    parseInt(searchParams.get('limit') || '20', 10)
  )

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const queryParams = new URLSearchParams({
        projectId,
        page: currentPage.toString(),
        limit: rowsPerPage.toString(),
      })

      if (statusFilter) queryParams.set('status', statusFilter)
      if (searchQuery) queryParams.set('search', searchQuery)
      if (startDate) queryParams.set('startDate', startDate)
      if (endDate) queryParams.set('endDate', endDate)

      const res = await fetch(`/api/documents?${queryParams.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setDocs(data.documents || [])
        // Toujours définir la pagination, même si elle est vide
        setPagination(
          data.pagination || {
            page: currentPage,
            limit: rowsPerPage,
            total: 0,
            totalPages: 0,
          }
        )
      } else {
        const errorData = await res.json().catch(() => ({}))
        setError(
          `Erreur ${res.status}: ${errorData.error || 'Erreur lors du chargement des documents'}`
        )
        // Mettre à jour la pagination même en cas d'erreur pour éviter qu'elle disparaisse
        setPagination({
          page: currentPage,
          limit: rowsPerPage,
          total: 0,
          totalPages: 0,
        })
      }
    } catch (err) {
      console.error('Fetch error:', err)
      setError(`Erreur réseau: ${err instanceof Error ? err.message : 'Erreur inconnue'}`)
      // Mettre à jour la pagination même en cas d'erreur pour éviter qu'elle disparaisse
      setPagination({
        page: currentPage,
        limit: rowsPerPage,
        total: 0,
        totalPages: 0,
      })
    } finally {
      setLoading(false)
    }
  }, [projectId, statusFilter, searchQuery, startDate, endDate, currentPage, rowsPerPage])

  useEffect(() => {
    fetchDocs()
  }, [fetchDocs])

  const handleFilterChange = () => {
    setCurrentPage(1) // Reset à la première page lors d'un changement de filtre
    fetchDocs()
  }

  const handleRowsPerPageChange = (newLimit: number) => {
    setRowsPerPage(newLimit)
    setCurrentPage(1) // Reset à la première page lors d'un changement de limite
  }

  // Réinitialiser le statut d'un document
  const handleResetStatus = async (docId: string) => {
    if (!confirm('Réinitialiser le statut de ce document à "Généré" ?')) {
      return
    }

    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'generated' }),
      })

      if (res.ok) {
        fetchDocs()
      } else {
        const errorData = await res.json().catch(() => ({}))
        alert(`Erreur lors de la réinitialisation: ${errorData.error || 'Erreur inconnue'}`)
      }
    } catch (err) {
      console.error('Reset status error:', err)
      alert('Erreur lors de la réinitialisation du statut')
    }
  }

  // Gestion de la sélection
  const toggleSelectAll = () => {
    if (selectedDocs.size === docs.length) {
      setSelectedDocs(new Set())
    } else {
      setSelectedDocs(new Set(docs.map((d) => d.id)))
    }
  }

  const toggleSelectDoc = (docId: string) => {
    const newSelected = new Set(selectedDocs)
    if (newSelected.has(docId)) {
      newSelected.delete(docId)
    } else {
      newSelected.add(docId)
    }
    setSelectedDocs(newSelected)
  }

  // Réinitialiser la sélection lors du changement de page
  useEffect(() => {
    setSelectedDocs(new Set())
  }, [docs])

  // Envoi d'email individuel
  const handleSendEmailClick = (doc: DocumentItem) => {
    setSelectedDocumentForEmail(doc)
    setShowSendEmailModal(true)
  }

  const handleEmailSent = () => {
    fetchDocs()
    setShowSendEmailModal(false)
    setSelectedDocumentForEmail(null)
  }

  // Envoi d'emails en masse
  const handleBulkSendEmailClick = () => {
    if (selectedDocs.size === 0) {
      alert('Veuillez sélectionner au moins un document')
      return
    }
    setShowBulkSendEmailModal(true)
  }

  const handleBulkEmailSent = () => {
    setSelectedDocs(new Set())
    fetchDocs()
    setShowBulkSendEmailModal(false)
  }

  // Suppression en masse
  const handleBulkDelete = async () => {
    if (selectedDocs.size === 0) {
      alert('Veuillez sélectionner au moins un document')
      return
    }

    if (!confirm(`Supprimer définitivement ${selectedDocs.size} document(s) ?`)) {
      return
    }

    try {
      const res = await fetch('/api/documents/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds: Array.from(selectedDocs) }),
      })
      if (res.ok) {
        const data = await res.json()
        alert(`${data.deleted || 0} document(s) supprimé(s)`)
        setSelectedDocs(new Set())
        fetchDocs()
      } else {
        const errorData = await res.json().catch(() => ({}))
        alert(`Erreur lors de la suppression: ${errorData.error || 'Erreur inconnue'}`)
      }
    } catch (err) {
      console.error('Bulk delete error:', err)
      alert('Erreur lors de la suppression en masse')
    }
  }

  const handleExportCSV = async () => {
    try {
      const queryParams = new URLSearchParams({
        projectId,
        format: 'csv',
      })

      if (statusFilter) queryParams.set('status', statusFilter)
      if (searchQuery) queryParams.set('search', searchQuery)
      if (startDate) queryParams.set('startDate', startDate)
      if (endDate) queryParams.set('endDate', endDate)

      const res = await fetch(`/api/documents/export?${queryParams.toString()}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `documents_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const errorData = await res.json().catch(() => ({}))
        alert(`Erreur lors de l'export: ${errorData.error || 'Erreur inconnue'}`)
      }
    } catch (err) {
      console.error('Export error:', err)
      alert("Erreur lors de l'export CSV")
    }
  }

  if (loading && docs.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center">Chargement des documents...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
          <p className="mt-2 text-sm text-gray-700">
            Historique des documents générés
            {selectedDocs.size > 0 && (
              <span className="ml-2 font-medium text-blue-700">
                ({selectedDocs.size} sélectionné{selectedDocs.size > 1 ? 's' : ''})
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Exporter CSV
          </button>
          <Link
            href={`/projects/${projectId}/generate`}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Nouvelle génération
          </Link>
        </div>
      </div>

      {/* Actions en masse */}
      {selectedDocs.size > 0 && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedDocs.size} document{selectedDocs.size > 1 ? 's' : ''} sélectionné
              {selectedDocs.size > 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkSendEmailClick}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg
                  className="-ml-0.5 mr-1.5 inline-block h-4 w-4"
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
                Envoyer par email
              </button>
              <button
                onClick={handleBulkDelete}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                <svg
                  className="-ml-0.5 mr-1.5 inline-block h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Supprimer
              </button>
              <button
                onClick={() => setSelectedDocs(new Set())}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtres et recherche */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Filtres</h2>
          <div className="flex items-center gap-3">
            <label htmlFor="rowsPerPage" className="text-sm font-medium text-gray-700">
              Lignes par page :
            </label>
            <select
              id="rowsPerPage"
              value={rowsPerPage}
              onChange={(e) => handleRowsPerPageChange(parseInt(e.target.value, 10))}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Recherche</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFilterChange()}
              placeholder="Nom, email, ID..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Statut</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Tous</option>
              <option value="generated">Généré</option>
              <option value="sent">Envoyé</option>
              <option value="failed">Échoué</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date début</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleFilterChange}
              className="w-full rounded-md bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-500"
            >
              Filtrer
            </button>
          </div>
        </div>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {docs.length === 0 && !loading ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
          Aucun document trouvé
        </div>
      ) : docs.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                <tr>
                  <th className="sticky left-0 z-10 bg-gray-50 px-2 py-3 text-left sm:px-4">
                    <input
                      type="checkbox"
                      checked={selectedDocs.size === docs.length && docs.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      title="Tout sélectionner"
                    />
                  </th>
                  <th className="hidden px-2 py-3 text-left font-semibold text-gray-800 md:table-cell sm:px-4">
                    ID
                  </th>
                  <th className="hidden px-2 py-3 text-left font-semibold text-gray-800 lg:table-cell sm:px-4">
                    Template
                  </th>
                  <th className="px-2 py-3 text-left font-semibold text-gray-800 sm:px-4">Statut</th>
                  <th className="hidden px-2 py-3 text-left font-semibold text-gray-800 lg:table-cell sm:px-4">
                    Destinataire
                  </th>
                  <th className="px-2 py-3 text-left font-semibold text-gray-800 sm:px-4">Email</th>
                  <th className="hidden px-2 py-3 text-left font-semibold text-gray-800 md:table-cell sm:px-4">
                    Date
                  </th>
                  <th className="sticky right-0 z-10 bg-gray-50 px-2 py-3 text-right font-semibold text-gray-800 sm:px-4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {docs.map((d) => (
                  <tr
                    key={d.id}
                    className={`transition-colors hover:bg-gray-50 ${
                      selectedDocs.has(d.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td
                      className={`sticky left-0 z-10 px-2 py-3 sm:px-4 ${
                        selectedDocs.has(d.id) ? 'bg-blue-50' : 'bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocs.has(d.id)}
                        onChange={() => toggleSelectDoc(d.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="hidden px-2 py-3 font-mono text-xs text-gray-900 md:table-cell sm:px-4">
                      <span className="truncate block max-w-[100px]" title={d.id}>
                        {d.id.slice(0, 12)}...
                      </span>
                    </td>
                    <td className="hidden px-2 py-3 text-gray-900 lg:table-cell sm:px-4">
                      <span className="truncate block max-w-[150px]" title={d.template?.name || d.templateId}>
                        {d.template?.name || d.templateId}
                      </span>
                    </td>
                    <td className="px-2 py-3 sm:px-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
                          d.status === 'sent'
                            ? 'bg-green-100 text-green-800'
                            : d.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {d.status === 'sent'
                          ? 'Envoyé'
                          : d.status === 'failed'
                            ? 'Échoué'
                            : 'Généré'}
                      </span>
                    </td>
                    <td className="hidden px-2 py-3 text-gray-900 lg:table-cell sm:px-4">
                      <span className="truncate block max-w-[150px]" title={d.recipient || undefined}>
                        {d.recipient || '-'}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-gray-900 sm:px-4">
                      <span className="truncate block max-w-[180px] sm:max-w-none" title={d.recipientEmail || undefined}>
                        {d.recipientEmail || '-'}
                      </span>
                    </td>
                    <td className="hidden px-2 py-3 text-gray-900 md:table-cell sm:px-4">
                      <span className="whitespace-nowrap">
                        {new Date(d.createdAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td
                      className={`sticky right-0 z-10 px-2 py-3 text-right sm:px-4 ${
                        selectedDocs.has(d.id) ? 'bg-blue-50' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-end gap-1 sm:gap-2">
                        {d.recipientEmail && (
                          <button
                            onClick={() => handleSendEmailClick(d)}
                            className={`inline-flex items-center rounded-md px-2 py-1.5 text-xs font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 sm:px-3 sm:text-sm ${
                              d.status === 'sent'
                                ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
                                : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                            }`}
                            title={d.status === 'sent' ? 'Renvoyer par email' : 'Envoyer par email'}
                          >
                            <svg
                              className="h-3 w-3 sm:h-4 sm:w-4"
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
                            <span className="hidden sm:inline ml-1">
                              {d.status === 'sent' ? 'Renvoyer' : 'Envoyer'}
                            </span>
                          </button>
                        )}
                        {d.status === 'sent' && (
                          <button
                            onClick={() => handleResetStatus(d.id)}
                            className="inline-flex items-center rounded-md bg-yellow-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 sm:px-3 sm:text-sm"
                            title="Réinitialiser le statut"
                          >
                            <svg
                              className="h-3 w-3 sm:h-4 sm:w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                              />
                            </svg>
                            <span className="hidden sm:inline ml-1">Réinit.</span>
                          </button>
                        )}
                        <Link
                          href={`/documents/${d.id}`}
                          className="inline-flex items-center rounded-md bg-blue-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:px-3 sm:text-sm"
                        >
                          <span className="hidden sm:inline">Ouvrir</span>
                          <span className="sm:hidden">Voir</span>
                        </Link>
                        <DeleteDocumentButton documentId={d.id} onDeleted={() => fetchDocs()} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      ) : null}

      {/* Pagination - Toujours affichée si définie */}
      {pagination && (
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-700">
                {pagination.total > 0 ? (
                  <>
                    Affichage de {(currentPage - 1) * pagination.limit + 1} à{' '}
                    {Math.min(currentPage * pagination.limit, pagination.total)} sur{' '}
                    {pagination.total} document{pagination.total > 1 ? 's' : ''}
                  </>
                ) : (
                  <>Aucun document</>
                )}
              </div>
              {pagination.totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-50"
                  >
                    Précédent
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
                      let pageNum: number
                      if (pagination.totalPages <= 7) {
                        pageNum = i + 1
                      } else if (currentPage <= 4) {
                        pageNum = i + 1
                      } else if (currentPage >= pagination.totalPages - 3) {
                        pageNum = pagination.totalPages - 6 + i
                      } else {
                        pageNum = currentPage - 3 + i
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`min-w-[2.5rem] rounded-md border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            currentPage === pageNum
                              ? 'border-blue-500 bg-blue-600 text-white hover:bg-blue-700'
                              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      )
                    })}
                    {pagination.totalPages > 7 && currentPage < pagination.totalPages - 3 && (
                      <>
                        <span className="px-2 text-gray-500">...</span>
                        <button
                          onClick={() => setCurrentPage(pagination.totalPages)}
                          className="min-w-[2.5rem] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        >
                          {pagination.totalPages}
                        </button>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={currentPage === pagination.totalPages}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-50"
                  >
                    Suivant
                  </button>
                </div>
              )}
            </div>
          )}

      {/* Modal d'envoi d'email individuel */}
      {showSendEmailModal && selectedDocumentForEmail && (
        <SendEmailModal
          document={{
            id: selectedDocumentForEmail.id,
            recipientEmail: selectedDocumentForEmail.recipientEmail,
          }}
          onClose={() => {
            setShowSendEmailModal(false)
            setSelectedDocumentForEmail(null)
          }}
          onEmailSent={handleEmailSent}
          defaultHtmlTemplate={DEFAULT_EMAIL_TEMPLATE}
        />
      )}

      {/* Modal d'envoi d'emails en masse */}
      {showBulkSendEmailModal && (
        <BulkSendEmailModal
          selectedDocuments={docs.filter((d) => selectedDocs.has(d.id))}
          onClose={() => setShowBulkSendEmailModal(false)}
          onSent={handleBulkEmailSent}
          defaultHtmlTemplate={DEFAULT_EMAIL_TEMPLATE}
        />
      )}
    </div>
  )
}


