'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DeleteButtonProps {
  onDelete: () => Promise<void>
  redirectPath?: string
  confirmationMessage?: string
  className?: string
  label?: string
}

export function DeleteButton({
  onDelete,
  redirectPath,
  confirmationMessage = 'Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.',
  className = '',
  label = 'Supprimer',
}: DeleteButtonProps) {
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!showConfirm) {
      setShowConfirm(true)
      return
    }

    setLoading(true)
    try {
      await onDelete()
      if (redirectPath) {
        router.push(redirectPath)
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error('Error deleting:', error)
      alert('Une erreur est survenue lors de la suppression')
    } finally {
      setLoading(false)
      setShowConfirm(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">{confirmationMessage}</span>
        <button
          onClick={() => setShowConfirm(false)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          disabled={loading}
        >
          Annuler
        </button>
        <button
          onClick={handleDelete}
          disabled={loading}
          className={`inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 ${className}`}
        >
          {loading ? 'Suppression...' : 'Confirmer'}
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className={`inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 ${className}`}
    >
      <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
      {label}
    </button>
  )
}
