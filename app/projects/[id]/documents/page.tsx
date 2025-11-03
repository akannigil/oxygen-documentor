'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { DeleteDocumentButton } from '@/components/documents/DeleteDocumentButton'

interface DocumentItem {
  id: string
  templateId: string
  mimeType: string
  status: string
  recipient: string | null
  recipientEmail: string | null
  createdAt: string
}

export default function ProjectDocumentsPage() {
  const params = useParams()
  const projectId = params['id'] as string
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await fetch(`/api/documents?projectId=${projectId}`)
        if (res.ok) {
          const data = await res.json()
          console.log('Documents loaded:', data)
          setDocs(data)
        } else {
          const errorData = await res.json().catch(() => ({}))
          console.error('Error response:', res.status, errorData)
          setError(`Erreur ${res.status}: ${errorData.error || 'Erreur lors du chargement des documents'}`)
        }
      } catch (err) {
        console.error('Fetch error:', err)
        setError(`Erreur réseau: ${err instanceof Error ? err.message : 'Erreur inconnue'}`)
      } finally {
        setLoading(false)
      }
    }

    fetchDocs()
  }, [projectId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center">Chargement des documents...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
            <p className="mt-2 text-sm text-gray-600">Historique des documents générés</p>
          </div>
          <Link href={`/projects/${projectId}/generate`} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
            Nouvelle génération
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-800">{error}</div>
        )}

        {docs.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
            Aucun document pour le moment
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">ID</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Statut</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Destinataire</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-700">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {docs.map((d) => (
                  <tr key={d.id} className="odd:bg-white even:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{d.id}</td>
                    <td className="px-4 py-3">{d.status}</td>
                    <td className="px-4 py-3">{d.recipient || '-'}</td>
                    <td className="px-4 py-3">{d.recipientEmail || '-'}</td>
                    <td className="px-4 py-3">{new Date(d.createdAt).toLocaleString('fr-FR')}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/documents/${d.id}`}
                          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
                        >
                          Ouvrir
                        </Link>
                        <DeleteDocumentButton documentId={d.id} onDeleted={() => {
                          setDocs(docs.filter(doc => doc.id !== d.id))
                        }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
