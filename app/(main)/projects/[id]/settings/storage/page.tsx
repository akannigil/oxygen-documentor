'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { StorageConfigForm } from '@/components/storage/StorageConfigForm'
import type { StorageConfig } from '@/lib/storage/config'

export default function ProjectStorageSettingsPage() {
  const params = useParams()
  const projectId = params['id'] as string

  const [config, setConfig] = useState<StorageConfig | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Récupérer le projet
        const projectResponse = await fetch(`/api/projects/${projectId}`)
        if (projectResponse.ok) {
          const projectData = await projectResponse.json()
          setProject(projectData)
        }

        // Récupérer la configuration de stockage
        const configResponse = await fetch(`/api/projects/${projectId}/storage-config`)
        if (configResponse.ok) {
          const configData = await configResponse.json()
          setConfig(configData.config)
        }
      } catch (error) {
        console.error('Erreur lors du chargement:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [projectId])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href={`/projects/${projectId}`}
            className="text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            ← Retour au projet
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Configuration du stockage</h1>
          {project && (
            <p className="mt-2 text-sm text-gray-600">
              Projet : <span className="font-medium">{project.name}</span>
            </p>
          )}
        </div>

        {/* Section informative */}
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-6">
          <div className="flex items-start gap-3">
            <svg
              className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-blue-900">
                À propos de la configuration du stockage
              </h3>
              <div className="mt-2 text-sm text-blue-800 space-y-2">
                <p>
                  <strong>Configuration par défaut :</strong> Si aucune configuration n&apos;est
                  définie ici, le projet utilisera les paramètres de stockage globaux du serveur
                  (définis dans les variables d&apos;environnement).
                </p>
                <p>
                  <strong>Configuration personnalisée :</strong> Vous pouvez définir une
                  configuration spécifique à ce projet pour stocker les documents générés sur un
                  serveur S3/MinIO, FTP ou local différent.
                </p>
                <p className="pt-2 border-t border-blue-200">
                  <strong>💡 Pour MinIO :</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>
                    Indiquez l&apos;endpoint complet (ex: <code>https://s3.monurl.com</code>)
                  </li>
                  <li>Activez &quot;Forcer le style de chemin&quot; (path-style)</li>
                  <li>
                    Assurez-vous que la région correspond à votre configuration MinIO (souvent{' '}
                    <code>us-east-1</code>)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Formulaire de configuration */}
        <div className="rounded-lg bg-white shadow-sm">
          <div className="px-6 py-8">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <StorageConfigForm
                projectId={projectId}
                initialConfig={config}
                onSave={(newConfig) => setConfig(newConfig)}
              />
            )}
          </div>
        </div>

        {/* Section aide supplémentaire */}
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Besoin d&apos;aide ?</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              <strong>Où trouver mes identifiants S3/MinIO ?</strong>
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>AWS S3 : Console AWS → IAM → Utilisateurs → Clés d&apos;accès</li>
              <li>MinIO : Interface admin → Identity → Users → Access Keys</li>
              <li>Cloudflare R2 : Dashboard → R2 → API Tokens</li>
            </ul>
            <p className="pt-2">
              <strong>Sécurité :</strong> Les identifiants sont stockés de manière sécurisée dans
              la base de données et ne sont jamais exposés côté client.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

