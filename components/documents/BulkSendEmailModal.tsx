'use client'

import { useMemo, useState } from 'react'

interface Document {
  id: string
  recipientEmail: string | null
  recipient?: string | null
  status?: string
  templateId?: string
}

interface BulkSendEmailModalProps {
  selectedDocuments: Document[]
  onClose: () => void
  onSent: () => void
  defaultSubject?: string | undefined
  defaultHtmlTemplate?: string | undefined
  defaultFrom?: string | undefined
  defaultFromName?: string | undefined
  defaultReplyTo?: string | undefined
  defaultCc?: string | string[] | undefined
  defaultBcc?: string | string[] | undefined
}

// Composant helper pour afficher les variables disponibles
function VariablesHelper() {
  const [showHelper, setShowHelper] = useState(false)

  const variables = [
    {
      category: 'Document',
      vars: [
        { name: 'recipient_name', desc: 'Nom du destinataire' },
        { name: 'recipient_email', desc: 'Email du destinataire' },
        { name: 'document_id', desc: 'ID du document' },
        { name: 'template_name', desc: 'Nom du template' },
        { name: 'project_name', desc: 'Nom du projet' },
        { name: 'download_url', desc: 'URL de téléchargement (bouton HTML automatique)' },
        { name: 'created_at', desc: 'Date de création (format français)' },
        { name: 'created_at_full', desc: 'Date complète de création' },
      ],
    },
    {
      category: 'Système',
      vars: [
        { name: 'organization_name', desc: "Nom de l'organisation" },
        { name: 'app_name', desc: "Nom de l'application" },
        { name: 'contact_email', desc: 'Email de contact' },
      ],
    },
    {
      category: 'Personnalisées',
      vars: [
        {
          name: 'nom_du_champ',
          desc: 'Toutes les données du document (champs CSV/Excel) sont automatiquement disponibles. Utilisez le nom exact de la colonne, ex: {{prenom}}, {{email}}, {{date_naissance}}',
        },
      ],
    },
  ]

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setShowHelper(!showHelper)}
        className="ml-1 inline-flex items-center text-blue-600 transition-colors hover:text-blue-800 focus:outline-none"
        title="Variables disponibles"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
      {showHelper && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setShowHelper(false)} />
          <div className="absolute left-0 top-6 z-50 w-80 rounded-lg border border-gray-200 bg-white shadow-xl">
            <div className="max-h-96 overflow-y-auto p-4">
              <div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-2">
                <h4 className="text-sm font-semibold text-gray-900">Variables disponibles</h4>
                <button
                  type="button"
                  onClick={() => setShowHelper(false)}
                  className="text-gray-400 transition-colors hover:text-gray-600"
                  title="Fermer"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="space-y-4 text-xs">
                {variables.map((category) => (
                  <div key={category.category}>
                    <p className="mb-2 font-semibold text-gray-700">{category.category}</p>
                    <ul className="space-y-1.5">
                      {category.vars.map((variable) => (
                        <li key={variable.name} className="flex items-start gap-2">
                          <code className="whitespace-nowrap rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-800">
                            {'{{' + variable.name + '}}'}
                          </code>
                          <span className="flex-1 leading-relaxed text-gray-600">
                            {variable.desc}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export function BulkSendEmailModal({
  selectedDocuments,
  onClose,
  onSent,
  defaultSubject,
  defaultHtmlTemplate,
  defaultFrom,
  defaultFromName,
  defaultReplyTo,
  defaultCc,
  defaultBcc,
}: BulkSendEmailModalProps) {
  const [subject, setSubject] = useState(defaultSubject || 'Votre document')
  const [htmlTemplate, setHtmlTemplate] = useState(defaultHtmlTemplate || '')
  const [from, setFrom] = useState(defaultFrom || '')
  const [fromName, setFromName] = useState(defaultFromName || '')
  const [replyTo, setReplyTo] = useState(defaultReplyTo || '')
  const [cc, setCc] = useState(
    typeof defaultCc === 'string' ? defaultCc : Array.isArray(defaultCc) ? defaultCc.join(', ') : ''
  )
  const [bcc, setBcc] = useState(
    typeof defaultBcc === 'string'
      ? defaultBcc
      : Array.isArray(defaultBcc)
        ? defaultBcc.join(', ')
        : ''
  )
  const [attachDocument, setAttachDocument] = useState(true)
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
      // Envoyer chaque document individuellement avec les paramètres personnalisés
      let successCount = 0
      let failedCount = 0
      const errors: Array<{ documentId: string; error: string }> = []

      for (const doc of docsWithEmail) {
        try {
          const res = await fetch(`/api/documents/${doc.id}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject: subject || undefined,
              htmlTemplate: htmlTemplate || undefined,
              attachDocument,
              from: from.trim() || undefined,
              fromName: fromName.trim() || undefined,
              replyTo: replyTo.trim() || undefined,
              cc: cc.trim()
                ? cc
                    .split(',')
                    .map((e) => e.trim())
                    .filter((e) => e)
                : undefined,
              bcc: bcc.trim()
                ? bcc
                    .split(',')
                    .map((e) => e.trim())
                    .filter((e) => e)
                : undefined,
            }),
          })

          if (res.ok) {
            successCount++
          } else {
            const errorData = await res.json().catch(() => ({}))
            failedCount++
            errors.push({
              documentId: doc.id,
              error: errorData.error || 'Erreur inconnue',
            })
          }
        } catch (err) {
          failedCount++
          errors.push({
            documentId: doc.id,
            error: err instanceof Error ? err.message : 'Erreur inconnue',
          })
        }
      }

      const resultData: {
        success: number
        failed: number
        total: number
        errors?: Array<{ documentId: string; error: string }>
      } = {
        success: successCount,
        failed: failedCount,
        total: docsWithEmail.length,
      }
      if (errors.length > 0) {
        resultData.errors = errors
      }
      setResult(resultData)

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
      className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm transition-opacity"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !sending && !result) {
          onClose()
        }
      }}
    >
      <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-3xl lg:max-w-4xl">
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
                <h3 className="text-xl font-semibold leading-6 text-gray-900" id="modal-title">
                  Envoi en masse
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={sending && !result}
                  className="rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {!result ? (
                <div className="mt-4 space-y-6">
                  {/* Informations sur les documents */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">
                      {selectedDocuments.length} document{selectedDocuments.length > 1 ? 's' : ''}{' '}
                      sélectionné{selectedDocuments.length > 1 ? 's' : ''}
                    </p>

                    {docsWithEmail.length > 0 && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                        <span className="font-semibold">{docsWithEmail.length}</span> document
                        {docsWithEmail.length > 1 ? 's' : ''} sera
                        {docsWithEmail.length > 1 ? 'ont' : ''} envoyé
                        {docsWithEmail.length > 1 ? 's' : ''}
                      </div>
                    )}

                    {docsWithoutEmail.length > 0 && (
                      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                        <span className="font-semibold">{docsWithoutEmail.length}</span> document
                        {docsWithoutEmail.length > 1 ? 's' : ''} n
                        {docsWithoutEmail.length > 1 ? "'ont" : "'a"} pas d'email destinataire et
                        {docsWithoutEmail.length > 1 ? ' seront' : ' sera'} ignoré
                        {docsWithoutEmail.length > 1 ? 's' : ''}
                      </div>
                    )}

                    {docsAlreadySent.length > 0 && (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                        <span className="font-semibold">{docsAlreadySent.length}</span> document
                        {docsAlreadySent.length > 1 ? 's' : ''} déjà envoyé
                        {docsAlreadySent.length > 1 ? 's' : ''} et sera
                        {docsAlreadySent.length > 1 ? 'ont' : ''} ignoré
                        {docsAlreadySent.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>

                  {/* Formulaire de personnalisation */}
                  <div className="space-y-5 border-t border-gray-200 pt-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Nom de l'expéditeur (optionnel)
                        </label>
                        <input
                          type="text"
                          value={fromName}
                          onChange={(e) => setFromName(e.target.value)}
                          className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          From (optionnel)
                        </label>
                        <input
                          type="email"
                          value={from}
                          onChange={(e) => setFrom(e.target.value)}
                          className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Reply-To (optionnel)
                        </label>
                        <input
                          type="email"
                          value={replyTo}
                          onChange={(e) => setReplyTo(e.target.value)}
                          className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Copie (CC) - optionnel
                        </label>
                        <input
                          type="text"
                          value={cc}
                          onChange={(e) => setCc(e.target.value)}
                          placeholder="ex: archive@exemple.com, autre@exemple.com"
                          className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <p className="mt-1.5 text-xs text-gray-500">
                          Séparez plusieurs emails par des virgules
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Copie cachée (CCI/BCC) - optionnel
                      </label>
                      <input
                        type="text"
                        value={bcc}
                        onChange={(e) => setBcc(e.target.value)}
                        placeholder="ex: archive@exemple.com, autre@exemple.com"
                        className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <p className="mt-1.5 text-xs text-gray-500">
                        Séparez plusieurs emails par des virgules
                      </p>
                    </div>

                    <div>
                      <div className="mb-1.5 flex items-center gap-2">
                        <label className="block text-sm font-medium text-gray-700">Sujet</label>
                        <VariablesHelper />
                      </div>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Exemple: Votre document {{template_name}} est prêt"
                        className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <p className="mt-1.5 text-xs text-gray-500">
                        Cliquez sur l'icône{' '}
                        <span className="inline-flex items-center text-blue-600">
                          <svg
                            className="ml-1 mr-1 h-3 w-3"
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
                        </span>{' '}
                        pour voir toutes les variables disponibles
                      </p>
                    </div>

                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700">
                          Template HTML (optionnel)
                        </label>
                        <details className="text-xs">
                          <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                            Variables disponibles
                          </summary>
                          <div className="mt-2 rounded-md bg-gray-50 p-3 text-xs">
                            <p className="mb-2 font-semibold text-gray-900">
                              Variables du document :
                            </p>
                            <ul className="mb-3 space-y-1 text-gray-700">
                              <li>
                                <code className="rounded bg-gray-200 px-1 py-0.5">
                                  {'{{recipient_name}}'}
                                </code>{' '}
                                - Nom du destinataire
                              </li>
                              <li>
                                <code className="rounded bg-gray-200 px-1 py-0.5">
                                  {'{{recipient_email}}'}
                                </code>{' '}
                                - Email du destinataire
                              </li>
                              <li>
                                <code className="rounded bg-gray-200 px-1 py-0.5">
                                  {'{{document_id}}'}
                                </code>{' '}
                                - ID du document
                              </li>
                              <li>
                                <code className="rounded bg-gray-200 px-1 py-0.5">
                                  {'{{template_name}}'}
                                </code>{' '}
                                - Nom du template
                              </li>
                              <li>
                                <code className="rounded bg-gray-200 px-1 py-0.5">
                                  {'{{project_name}}'}
                                </code>{' '}
                                - Nom du projet
                              </li>
                              <li>
                                <code className="rounded bg-gray-200 px-1 py-0.5">
                                  {'{{download_url}}'}
                                </code>{' '}
                                - URL de téléchargement (bouton HTML automatique)
                              </li>
                              <li>
                                <code className="rounded bg-gray-200 px-1 py-0.5">
                                  {'{{created_at}}'}
                                </code>{' '}
                                - Date de création (format français)
                              </li>
                              <li>
                                <code className="rounded bg-gray-200 px-1 py-0.5">
                                  {'{{created_at_full}}'}
                                </code>{' '}
                                - Date complète de création
                              </li>
                            </ul>
                            <p className="mb-2 font-semibold text-gray-900">Variables système :</p>
                            <ul className="mb-3 space-y-1 text-gray-700">
                              <li>
                                <code className="rounded bg-gray-200 px-1 py-0.5">
                                  {'{{organization_name}}'}
                                </code>{' '}
                                - Nom de l'organisation
                              </li>
                              <li>
                                <code className="rounded bg-gray-200 px-1 py-0.5">
                                  {'{{app_name}}'}
                                </code>{' '}
                                - Nom de l'application
                              </li>
                              <li>
                                <code className="rounded bg-gray-200 px-1 py-0.5">
                                  {'{{contact_email}}'}
                                </code>{' '}
                                - Email de contact
                              </li>
                            </ul>
                            <p className="mb-2 font-semibold text-gray-900">
                              Variables personnalisées :
                            </p>
                            <p className="text-gray-600">
                              Toutes les données du document (champs du CSV/Excel) sont disponibles
                              via{' '}
                              <code className="rounded bg-gray-200 px-1 py-0.5">
                                {'{{nom_du_champ}}'}
                              </code>
                            </p>
                          </div>
                        </details>
                      </div>
                      <textarea
                        value={htmlTemplate}
                        onChange={(e) => setHtmlTemplate(e.target.value)}
                        rows={6}
                        placeholder="Exemple: <p>Bonjour {{recipient_name}},</p><p>Votre document {{template_name}} est prêt.</p>{{download_url}}"
                        className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 font-mono text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <label className="inline-flex items-center gap-2.5 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={attachDocument}
                        onChange={(e) => setAttachDocument(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                      />
                      Joindre les documents en pièce jointe
                    </label>

                    {error && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                        {error}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                    <p className="mb-2 font-semibold">Envoi terminé :</p>
                    <ul className="space-y-1.5">
                      <li className="flex items-center gap-2">
                        <svg
                          className="h-5 w-5 text-green-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="font-medium">
                          {result.success} réussi{result.success > 1 ? 's' : ''}
                        </span>
                      </li>
                      {result.failed > 0 && (
                        <li className="flex items-center gap-2">
                          <svg
                            className="h-5 w-5 text-red-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span className="font-medium">
                            {result.failed} échoué{result.failed > 1 ? 's' : ''}
                          </span>
                        </li>
                      )}
                    </ul>
                    {result.errors && result.errors.length > 0 && (
                      <details className="mt-3">
                        <summary className="cursor-pointer font-medium">
                          Détails des erreurs
                        </summary>
                        <ul className="mt-2 space-y-1.5">
                          {result.errors.map((err, idx) => (
                            <li key={idx} className="text-xs">
                              <span className="font-mono">{err.documentId.slice(0, 8)}...</span> :{' '}
                              {err.error}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="bg-gray-50 px-4 py-3.5 sm:flex sm:flex-row-reverse sm:px-6">
              {!result && (
                <button
                  type="button"
                  onClick={handleBulkSend}
                  disabled={sending || docsWithEmail.length === 0}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-3 sm:w-auto"
                >
                  {sending ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
                    `Envoyer (${docsWithEmail.length})`
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                disabled={sending && !result}
                className="mt-3 inline-flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 sm:mt-0 sm:w-auto"
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
