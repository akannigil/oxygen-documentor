'use client'

import { useState } from 'react'

interface DeleteDocumentButtonProps {
  documentId: string
  onDeleted?: () => void
}

export function DeleteDocumentButton({ documentId, onDeleted }: DeleteDocumentButtonProps) {
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = async () => {
    if (!showConfirm) {
      setShowConfirm(true)
      return
    }

    if (!documentId) {
      alert('ID de document invalide')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Erreur lors de la suppression' }))
        throw new Error(error.error || 'Erreur lors de la suppression')
      }

      if (onDeleted) {
        onDeleted()
      }
    } catch (error) {
      console.error('Error deleting document:', error)
      alert(
        error instanceof Error ? error.message : 'Une erreur est survenue lors de la suppression'
      )
    } finally {
      setLoading(false)
      setShowConfirm(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600">Supprimer ?</span>
        <button
          onClick={() => setShowConfirm(false)}
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          disabled={loading}
        >
          Non
        </button>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="inline-flex items-center rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {loading ? '...' : 'Oui'}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
      title="Supprimer le document"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
    </button>
  )
}
