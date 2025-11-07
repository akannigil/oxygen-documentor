'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Document {
  id: string
  projectId: string
  templateId: string
  status: string
  recipient: string | null
  recipientEmail: string | null
  createdAt: string
  downloadUrl: string
  template?: {
    id: string
    name: string
  }
}

export default function DocumentPage() {
  const params = useParams()
  const id = params['id'] as string
  const [doc, setDoc] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const res = await fetch(`/api/documents/${id}`)
        if (res.ok) {
          const data = await res.json()
          console.log('Document loaded:', data)
          setDoc(data)
        } else {
          const errorData = await res.json().catch(() => ({}))
          console.error('Error response:', res.status, errorData)
          setError(`Erreur ${res.status}: ${errorData.error || 'Document non trouvé'}`)
        }
      } catch (err) {
        console.error('Fetch error:', err)
        setError(`Erreur réseau: ${err instanceof Error ? err.message : 'Erreur inconnue'}`)
      } finally {
        setLoading(false)
      }
    }

    fetchDoc()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center">Chargement du document...</div>
        </div>
      </div>
    )
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <p className="text-sm font-medium text-red-800">{error || 'Document non trouvé'}</p>
          </div>
          <Link
            href="/dashboard"
            className="mt-6 inline-block text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            ← Retour au dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href={`/projects/${doc.projectId}/documents`}
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            ← Retour aux documents
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Document</h1>
          <p className="mt-2 text-sm text-gray-600">Statut: {doc.status}</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-medium text-gray-700">Template</dt>
              <dd className="text-gray-900">{doc.template?.name || doc.templateId}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700">Destinataire</dt>
              <dd className="text-gray-900">{doc.recipient || '-'}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700">Email</dt>
              <dd className="text-gray-900">{doc.recipientEmail || '-'}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700">Créé le</dt>
              <dd className="text-gray-900">{new Date(doc.createdAt).toLocaleString('fr-FR')}</dd>
            </div>
          </dl>

          <div className="mt-6 flex gap-2">
            <a
              href={doc.downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Télécharger le PDF
            </a>
          </div>
        </div>

        {/* Aperçu PDF */}
        <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Aperçu</h2>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <iframe src={doc.downloadUrl} className="h-[600px] w-full" title="Aperçu du document" />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Si l'aperçu ne s'affiche pas, utilisez le bouton "Télécharger le PDF" ci-dessus.
          </p>
        </div>
      </div>
    </div>
  )
}
