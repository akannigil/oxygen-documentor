'use client'

import { useMemo, useState } from 'react'

interface BulkSendEmailModalProps {
  templateId: string
  selectedDocuments: Array<{ id: string; recipientEmail: string | null; recipient?: string | null }>
  onClose: () => void
  onQueued: () => void
  defaultSubject?: string | undefined
  defaultHtmlTemplate?: string | undefined
  defaultFrom?: string | undefined
  defaultFromName?: string | undefined
  defaultReplyTo?: string | undefined
  defaultCc?: string | string[] | undefined
  defaultBcc?: string | string[] | undefined
}

export function BulkSendEmailModal({
  templateId,
  selectedDocuments,
  onClose,
  onQueued,
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
  const [resultMsg, setResultMsg] = useState<string | null>(null)

  const docsWithEmail = useMemo(
    () => selectedDocuments.filter((d) => !!d.recipientEmail),
    [selectedDocuments]
  )
  const docsWithoutEmail = useMemo(
    () => selectedDocuments.filter((d) => !d.recipientEmail),
    [selectedDocuments]
  )

  const handleBulkSend = async () => {
    setSending(true)
    setError(null)
    setResultMsg(null)
    try {
      const res = await fetch(`/api/templates/${templateId}/send-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentIds: docsWithEmail.map((d) => d.id),
          subject,
          htmlTemplate: htmlTemplate || undefined,
          attachDocument,
          from: from || undefined,
          fromName: fromName || undefined,
          replyTo: replyTo || undefined,
          cc: cc
            ? cc
                .split(',')
                .map((e) => e.trim())
                .filter((e) => e)
            : undefined,
          bcc: bcc
            ? bcc
                .split(',')
                .map((e) => e.trim())
                .filter((e) => e)
            : undefined,
          useQueue: true,
        }),
      })

      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}) as { error?: string })
        throw new Error(data.error || 'Erreur lors de l’envoi en masse')
      }

      const data: { queued?: number; sent?: number } = await res.json()
      setResultMsg(
        `${data.queued ?? 0} envois planifiés${data.sent ? `, ${data.sent} envoyés` : ''}${docsWithoutEmail.length ? `, ${docsWithoutEmail.length} sans email` : ''}.`
      )
      onQueued()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur pendant l'envoi en masse")
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-10 bg-gray-500 bg-opacity-75 transition-opacity"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <h3 className="text-lg font-semibold leading-6 text-gray-900" id="modal-title">
                Envoi en masse
              </h3>
              <div className="mt-4 space-y-4">
                <p className="text-sm text-gray-700">
                  {selectedDocuments.length} documents sélectionnés.
                </p>
                {docsWithoutEmail.length > 0 && (
                  <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-800">
                    {docsWithoutEmail.length} documents n&#39;ont pas d&#39;email destinataire; ils
                    seront ignorés.
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nom de l'expéditeur (optionnel)
                    </label>
                    <input
                      type="text"
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-400 text-gray-900 placeholder-gray-600 shadow-sm focus:border-blue-600 focus:ring-blue-600 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      From (optionnel)
                    </label>
                    <input
                      type="email"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-400 text-gray-900 placeholder-gray-600 shadow-sm focus:border-blue-600 focus:ring-blue-600 sm:text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Reply-To (optionnel)
                    </label>
                    <input
                      type="email"
                      value={replyTo}
                      onChange={(e) => setReplyTo(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-400 text-gray-900 placeholder-gray-600 shadow-sm focus:border-blue-600 focus:ring-blue-600 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Copie (CC) - optionnel
                    </label>
                    <input
                      type="text"
                      value={cc}
                      onChange={(e) => setCc(e.target.value)}
                      placeholder="ex: archive@exemple.com, autre@exemple.com"
                      className="mt-1 block w-full rounded-md border-gray-400 text-gray-900 placeholder-gray-600 shadow-sm focus:border-blue-600 focus:ring-blue-600 sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Séparez plusieurs emails par des virgules
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Copie cachée (CCI/BCC) - optionnel
                  </label>
                  <input
                    type="text"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="ex: archive@exemple.com, autre@exemple.com"
                    className="mt-1 block w-full rounded-md border-gray-400 text-gray-900 placeholder-gray-600 shadow-sm focus:border-blue-600 focus:ring-blue-600 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Séparez plusieurs emails par des virgules
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sujet</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Exemple: Votre document {{template_name}} est prêt"
                    className="mt-1 block w-full rounded-md border-gray-400 text-gray-900 placeholder-gray-600 shadow-sm focus:border-blue-600 focus:ring-blue-600 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Vous pouvez utiliser des variables comme{' '}
                    <code className="rounded bg-gray-200 px-1 py-0.5">{'{{template_name}}'}</code>,{' '}
                    <code className="rounded bg-gray-200 px-1 py-0.5">{'{{recipient_name}}'}</code>, etc.
                  </p>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Template HTML (optionnel)
                    </label>
                    <details className="text-xs">
                      <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                        Variables disponibles
                      </summary>
                      <div className="mt-2 rounded-md bg-gray-50 p-3 text-xs">
                        <p className="mb-2 font-semibold text-gray-900">Variables du document :</p>
                        <ul className="mb-3 space-y-1 text-gray-700">
                          <li>
                            <code className="rounded bg-gray-200 px-1 py-0.5">{'{{recipient_name}}'}</code>{' '}
                            - Nom du destinataire
                          </li>
                          <li>
                            <code className="rounded bg-gray-200 px-1 py-0.5">{'{{recipient_email}}'}</code>{' '}
                            - Email du destinataire
                          </li>
                          <li>
                            <code className="rounded bg-gray-200 px-1 py-0.5">{'{{document_id}}'}</code> - ID
                            du document
                          </li>
                          <li>
                            <code className="rounded bg-gray-200 px-1 py-0.5">{'{{template_name}}'}</code> - Nom
                            du template
                          </li>
                          <li>
                            <code className="rounded bg-gray-200 px-1 py-0.5">{'{{project_name}}'}</code> - Nom
                            du projet
                          </li>
                          <li>
                            <code className="rounded bg-gray-200 px-1 py-0.5">{'{{download_url}}'}</code> - URL
                            de téléchargement (bouton HTML automatique)
                          </li>
                          <li>
                            <code className="rounded bg-gray-200 px-1 py-0.5">{'{{created_at}}'}</code> - Date de
                            création (format français)
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
                            <code className="rounded bg-gray-200 px-1 py-0.5">{'{{app_name}}'}</code> - Nom de
                            l'application
                          </li>
                          <li>
                            <code className="rounded bg-gray-200 px-1 py-0.5">{'{{contact_email}}'}</code> - Email
                            de contact
                          </li>
                        </ul>
                        <p className="mb-2 font-semibold text-gray-900">Variables personnalisées :</p>
                        <p className="text-gray-600">
                          Toutes les données du document (champs du CSV/Excel) sont disponibles via{' '}
                          <code className="rounded bg-gray-200 px-1 py-0.5">{'{{nom_du_champ}}'}</code>
                        </p>
                      </div>
                    </details>
                  </div>
                  <textarea
                    value={htmlTemplate}
                    onChange={(e) => setHtmlTemplate(e.target.value)}
                    rows={6}
                    placeholder='Exemple: <p>Bonjour {{recipient_name}},</p><p>Votre document {{template_name}} est prêt.</p>{{download_url}}'
                    className="mt-1 block w-full rounded-md border-gray-400 font-mono text-gray-900 placeholder-gray-600 shadow-sm focus:border-blue-600 focus:ring-blue-600 sm:text-sm"
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={attachDocument}
                    onChange={(e) => setAttachDocument(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Joindre les documents en pièce jointe
                </label>
                {error && <p className="text-sm text-red-600">{error}</p>}
                {resultMsg && <p className="text-sm text-green-700">{resultMsg}</p>}
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="button"
                onClick={handleBulkSend}
                disabled={sending || docsWithEmail.length === 0}
                className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 sm:ml-3 sm:w-auto"
              >
                {sending ? 'Planification...' : `Envoyer (${docsWithEmail.length})`}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
