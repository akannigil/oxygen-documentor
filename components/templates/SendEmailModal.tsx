'use client'

import { useState } from 'react'
import { loadLastEmailData, saveLastEmailData } from '@/lib/email/storage'
import { normalizeEmail } from '@/lib/utils'

// Composant helper pour afficher les variables disponibles
function VariablesHelper() {
  const [showHelper, setShowHelper] = useState(false)

  const variables = [
    { category: 'Document', vars: [
      { name: 'recipient_name', desc: 'Nom du destinataire' },
      { name: 'recipient_email', desc: 'Email du destinataire' },
      { name: 'document_id', desc: 'ID du document' },
      { name: 'template_name', desc: 'Nom du template' },
      { name: 'project_name', desc: 'Nom du projet' },
      { name: 'download_url', desc: 'URL de téléchargement (bouton HTML automatique)' },
      { name: 'created_at', desc: 'Date de création (format français)' },
      { name: 'created_at_full', desc: 'Date complète de création' },
    ]},
    { category: 'Système', vars: [
      { name: 'organization_name', desc: 'Nom de l\'organisation' },
      { name: 'app_name', desc: 'Nom de l\'application' },
      { name: 'contact_email', desc: 'Email de contact' },
    ]},
    { category: 'Personnalisées', vars: [
      { name: 'nom_du_champ', desc: 'Toutes les données du document (champs CSV/Excel) sont automatiquement disponibles. Utilisez le nom exact de la colonne, ex: {{prenom}}, {{email}}, {{date_naissance}}' },
    ]},
  ]

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setShowHelper(!showHelper)}
        className="ml-1 inline-flex items-center text-blue-600 hover:text-blue-800 focus:outline-none transition-colors"
        title="Variables disponibles"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      {showHelper && (
        <>
          {/* Overlay pour fermer en cliquant à l'extérieur */}
          <div
            className="fixed inset-0 z-50"
            onClick={() => setShowHelper(false)}
          />
          {/* Popover avec les variables */}
          <div className="absolute left-0 top-6 z-50 w-80 rounded-lg border border-gray-200 bg-white shadow-xl">
            <div className="max-h-96 overflow-y-auto p-4">
              <div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-2">
                <h4 className="text-sm font-semibold text-gray-900">Variables disponibles</h4>
                <button
                  type="button"
                  onClick={() => setShowHelper(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Fermer"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
                          <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-800 whitespace-nowrap">
                            {'{{' + variable.name + '}}'}
                          </code>
                          <span className="flex-1 text-gray-600 leading-relaxed">{variable.desc}</span>
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

interface Document {
  id: string
  recipientEmail: string | null
}

interface SendEmailModalProps {
  document: Document
  onClose: () => void
  onEmailSent: () => void
  defaultSubject?: string | undefined
  defaultHtmlTemplate?: string | undefined
  defaultFrom?: string | undefined
  defaultFromName?: string | undefined
  defaultReplyTo?: string | undefined
  defaultCc?: string | string[] | undefined
  defaultBcc?: string | string[] | undefined
}

export function SendEmailModal({
  document,
  onClose,
  onEmailSent,
  defaultSubject,
  defaultHtmlTemplate,
  defaultFrom,
  defaultFromName,
  defaultReplyTo,
  defaultCc,
  defaultBcc,
}: SendEmailModalProps) {
  // Charger les données du dernier email envoyé
  const lastEmailData = loadLastEmailData()

  const [recipient, setRecipient] = useState(document.recipientEmail || '')
  const [subject, setSubject] = useState(
    defaultSubject || lastEmailData.subject || 'Votre document'
  )
  const [htmlTemplate, setHtmlTemplate] = useState(
    defaultHtmlTemplate || lastEmailData.htmlTemplate || ''
  )
  const [from, setFrom] = useState(defaultFrom || lastEmailData.from || '')
  const [fromName, setFromName] = useState(defaultFromName || lastEmailData.fromName || '')
  const [replyTo, setReplyTo] = useState(defaultReplyTo || lastEmailData.replyTo || '')
  const [cc, setCc] = useState(
    typeof defaultCc === 'string'
      ? defaultCc
      : Array.isArray(defaultCc)
        ? defaultCc.join(', ')
        : lastEmailData.cc || ''
  )
  const [bcc, setBcc] = useState(
    typeof defaultBcc === 'string'
      ? defaultBcc
      : Array.isArray(defaultBcc)
        ? defaultBcc.join(', ')
        : lastEmailData.bcc || ''
  )
  const [attachDocument, setAttachDocument] = useState(lastEmailData.attachDocument ?? true)
  const [additionalAttachmentType, setAdditionalAttachmentType] = useState<'url' | 'upload'>(
    lastEmailData.additionalAttachmentUrl ? 'url' : 'url'
  )
  const [additionalAttachmentUrl, setAdditionalAttachmentUrl] = useState(
    lastEmailData.additionalAttachmentUrl || ''
  )
  const [additionalAttachmentFile, setAdditionalAttachmentFile] = useState<File | null>(null)
  const [additionalAttachmentFilename, setAdditionalAttachmentFilename] = useState(
    lastEmailData.additionalAttachmentFilename || ''
  )
  const [additionalAttachmentContentType, setAdditionalAttachmentContentType] = useState(
    lastEmailData.additionalAttachmentContentType || ''
  )
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Limite de taille pour les fichiers additionnels : 25MB
  const MAX_ADDITIONAL_ATTACHMENT_SIZE = 25 * 1024 * 1024 // 25MB

  const handleSend = async () => {
    setSending(true)
    setError(null)

    // Validation côté client seulement si un email est fourni
    const trimmedRecipient = recipient.trim()

    // Si un email est fourni, le valider
    if (trimmedRecipient) {
      // Normaliser l'email (extrait l'email du format "Nom <email@domain.com>" si présent)
      const normalizedEmail = normalizeEmail(trimmedRecipient)
      
      // Validation basique de l'email après normalisation
      const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i
      if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
        setError("L'email du destinataire est invalide pour ce format")
        setSending(false)
        return
      }
    }

    // Préparer la pièce jointe supplémentaire si fournie
    let additionalAttachment:
      | {
          filename: string
          url?: string
          content?: string
          contentType?: string
        }
      | undefined

    if (additionalAttachmentFilename.trim()) {
      if (additionalAttachmentType === 'url' && additionalAttachmentUrl.trim()) {
        const trimmedContentType = additionalAttachmentContentType.trim()
        additionalAttachment = {
          filename: additionalAttachmentFilename.trim(),
          url: additionalAttachmentUrl.trim(),
          ...(trimmedContentType ? { contentType: trimmedContentType } : {}),
        }
      } else if (additionalAttachmentType === 'upload' && additionalAttachmentFile) {
        // Convertir le fichier en base64
        const reader = new FileReader()
        const base64Content = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string
            // Retirer le préfixe data:...;base64,
            const base64 = result.split(',')[1] || result
            resolve(base64)
          }
          reader.onerror = reject
          reader.readAsDataURL(additionalAttachmentFile)
        })

        const contentType =
          additionalAttachmentFile.type || additionalAttachmentContentType.trim() || undefined
        additionalAttachment = {
          filename: additionalAttachmentFilename.trim(),
          content: base64Content,
          ...(contentType ? { contentType } : {}),
        }
      }
    }

    try {
      const res = await fetch(`/api/documents/${document.id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Envoyer recipientEmail seulement s'il est fourni, sinon l'API le récupérera du document
          ...(trimmedRecipient && { recipientEmail: trimmedRecipient }),
          subject: subject,
          htmlTemplate: htmlTemplate || undefined,
          attachDocument: attachDocument,
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
          ...(additionalAttachment && { additionalAttachment }),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erreur lors de l'envoi")
      }

      // Sauvegarder les données du dernier email envoyé
      saveLastEmailData({
        subject,
        htmlTemplate,
        from,
        fromName,
        replyTo,
        cc,
        bcc,
        attachDocument,
        // Sauvegarder seulement l'URL (pas le fichier uploadé)
        ...(additionalAttachmentType === 'url' && additionalAttachmentUrl
          ? {
              additionalAttachmentUrl,
              additionalAttachmentFilename,
              additionalAttachmentContentType,
            }
          : {}),
      })

      onEmailSent() // Refresh the list
      onClose() // Close the modal
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur inconnue est survenue.')
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
        if (e.target === e.currentTarget && !sending) {
          onClose()
        }
      }}
    >
      <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className="relative transform overflow-hidden rounded-xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl lg:max-w-3xl">
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3">
                <h3 className="text-xl font-semibold leading-6 text-gray-900" id="modal-title">
                  Envoyer le document
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={sending}
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
              <div className="mt-4 space-y-5">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Destinataire
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder={
                      document.recipientEmail || "Laisser vide pour utiliser l'email du document"
                    }
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {!document.recipientEmail && (
                    <p className="mt-1.5 text-xs text-gray-500">
                      Si vide, l'email sera récupéré depuis le mapping du template si configuré.
                    </p>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                      Sujet
                    </label>
                    <VariablesHelper />
                  </div>
                  <input
                    type="text"
                    id="subject"
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
                  <label
                    htmlFor="fromName"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Nom de l'expéditeur (optionnel)
                  </label>
                  <input
                    type="text"
                    id="fromName"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="from" className="mb-1.5 block text-sm font-medium text-gray-700">
                    From (optionnel)
                  </label>
                  <input
                    type="email"
                    id="from"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor="replyTo"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Reply-To (optionnel)
                  </label>
                  <input
                    type="email"
                    id="replyTo"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label htmlFor="cc" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Copie (CC) - optionnel
                  </label>
                  <input
                    type="text"
                    id="cc"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="ex: archive@exemple.com, autre@exemple.com"
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="mt-1.5 text-xs text-gray-500">
                    Séparez plusieurs emails par des virgules
                  </p>
                </div>
                <div>
                  <label htmlFor="bcc" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Copie cachée (CCI/BCC) - optionnel
                  </label>
                  <input
                    type="text"
                    id="bcc"
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
                  <div className="mb-2 flex items-center justify-between">
                    <label htmlFor="html" className="block text-sm font-medium text-gray-700">
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
                          Toutes les données du document (champs du CSV/Excel) sont disponibles via{' '}
                          <code className="rounded bg-gray-200 px-1 py-0.5">
                            {'{{nom_du_champ}}'}
                          </code>
                        </p>
                      </div>
                    </details>
                  </div>
                  <textarea
                    id="html"
                    value={htmlTemplate}
                    onChange={(e) => setHtmlTemplate(e.target.value)}
                    rows={4}
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
                  Joindre le document en pièce jointe
                </label>

                {/* Pièce jointe supplémentaire */}
                <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Pièce jointe supplémentaire (optionnel)
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAdditionalAttachmentType('url')}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          additionalAttachmentType === 'url'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        URL
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdditionalAttachmentType('upload')}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          additionalAttachmentType === 'upload'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        Upload
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="additionalAttachmentFilename"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      Nom du fichier <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="additionalAttachmentFilename"
                      value={additionalAttachmentFilename}
                      onChange={(e) => setAdditionalAttachmentFilename(e.target.value)}
                      placeholder="ex: document.pdf"
                      className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {additionalAttachmentType === 'url' ? (
                    <div>
                      <label
                        htmlFor="additionalAttachmentUrl"
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                      >
                        URL du fichier <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="url"
                        id="additionalAttachmentUrl"
                        value={additionalAttachmentUrl}
                        onChange={(e) => setAdditionalAttachmentUrl(e.target.value)}
                        placeholder="https://exemple.com/fichier.pdf"
                        className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  ) : (
                    <div>
                      <label
                        htmlFor="additionalAttachmentFile"
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                      >
                        Fichier <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="file"
                        id="additionalAttachmentFile"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null
                          if (file) {
                            // Vérifier la taille du fichier (25MB max)
                            if (file.size > MAX_ADDITIONAL_ATTACHMENT_SIZE) {
                              setError(
                                `Le fichier est trop volumineux. Taille maximale : ${(MAX_ADDITIONAL_ATTACHMENT_SIZE / 1024 / 1024).toFixed(0)}MB (fichier actuel : ${(file.size / 1024 / 1024).toFixed(2)}MB)`
                              )
                              setAdditionalAttachmentFile(null)
                              // Réinitialiser l'input
                              e.target.value = ''
                              return
                            }
                            setError(null)
                            setAdditionalAttachmentFile(file)
                            if (!additionalAttachmentFilename) {
                              setAdditionalAttachmentFilename(file.name)
                              setAdditionalAttachmentContentType(file.type)
                            }
                          } else {
                            setAdditionalAttachmentFile(null)
                          }
                        }}
                        className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <p className="mt-1.5 text-xs text-gray-500">
                        Taille maximale : {MAX_ADDITIONAL_ATTACHMENT_SIZE / 1024 / 1024}MB
                      </p>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="additionalAttachmentContentType"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      Type MIME (optionnel)
                    </label>
                    <input
                      type="text"
                      id="additionalAttachmentContentType"
                      value={additionalAttachmentContentType}
                      onChange={(e) => setAdditionalAttachmentContentType(e.target.value)}
                      placeholder="ex: application/pdf"
                      className="block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm transition-colors placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <p className="mt-1.5 text-xs text-gray-500">
                      Laissé vide, le type sera détecté automatiquement
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    {error}
                  </div>
                )}
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3.5 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
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
                  'Envoyer'
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={sending}
                className="mt-3 inline-flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 sm:mt-0 sm:w-auto"
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
