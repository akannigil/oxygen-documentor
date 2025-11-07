'use client'

import { useState } from 'react'

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
  const [recipient, setRecipient] = useState(document.recipientEmail || '')
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

  const handleSend = async () => {
    setSending(true)
    setError(null)

    // Validation côté client seulement si un email est fourni
    const trimmedRecipient = recipient.trim()

    // Si un email est fourni, le valider
    if (trimmedRecipient) {
      // Validation basique de l'email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(trimmedRecipient)) {
        setError("L'email du destinataire est invalide")
        setSending(false)
        return
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
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erreur lors de l'envoi")
      }

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
      className="fixed inset-0 z-10 bg-gray-500 bg-opacity-75 transition-opacity"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <h3 className="text-lg font-semibold leading-6 text-gray-900" id="modal-title">
                Envoyer le document
              </h3>
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
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
                    className="mt-1 block w-full rounded-md border-gray-400 text-gray-900 placeholder-gray-600 shadow-sm focus:border-blue-600 focus:ring-blue-600 sm:text-sm"
                  />
                  {!document.recipientEmail && (
                    <p className="mt-1 text-xs text-gray-500">
                      Si vide, l'email sera récupéré depuis le mapping du template si configuré.
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                    Sujet
                  </label>
                  <input
                    type="text"
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-400 text-gray-900 placeholder-gray-600 shadow-sm focus:border-blue-600 focus:ring-blue-600 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="fromName" className="block text-sm font-medium text-gray-700">
                    Nom de l'expéditeur (optionnel)
                  </label>
                  <input
                    type="text"
                    id="fromName"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-400 text-gray-900 placeholder-gray-600 shadow-sm focus:border-blue-600 focus:ring-blue-600 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="from" className="block text-sm font-medium text-gray-700">
                    From (optionnel)
                  </label>
                  <input
                    type="email"
                    id="from"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-400 text-gray-900 placeholder-gray-600 shadow-sm focus:border-blue-600 focus:ring-blue-600 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="replyTo" className="block text-sm font-medium text-gray-700">
                    Reply-To (optionnel)
                  </label>
                  <input
                    type="email"
                    id="replyTo"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-400 text-gray-900 placeholder-gray-600 shadow-sm focus:border-blue-600 focus:ring-blue-600 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="cc" className="block text-sm font-medium text-gray-700">
                    Copie (CC) - optionnel
                  </label>
                  <input
                    type="text"
                    id="cc"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="ex: archive@exemple.com, autre@exemple.com"
                    className="mt-1 block w-full rounded-md border-gray-400 text-gray-900 placeholder-gray-600 shadow-sm focus:border-blue-600 focus:ring-blue-600 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Séparez plusieurs emails par des virgules
                  </p>
                </div>
                <div>
                  <label htmlFor="bcc" className="block text-sm font-medium text-gray-700">
                    Copie cachée (CCI/BCC) - optionnel
                  </label>
                  <input
                    type="text"
                    id="bcc"
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
                  <label htmlFor="html" className="block text-sm font-medium text-gray-700">
                    Template HTML (optionnel)
                  </label>
                  <textarea
                    id="html"
                    value={htmlTemplate}
                    onChange={(e) => setHtmlTemplate(e.target.value)}
                    rows={4}
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
                  Joindre le document en pièce jointe
                </label>
                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 sm:ml-3 sm:w-auto"
              >
                {sending ? 'Envoi en cours...' : 'Envoyer'}
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
