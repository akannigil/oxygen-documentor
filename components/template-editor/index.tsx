'use client'

import dynamic from 'next/dynamic'
import type { TemplateEditorProps } from './TemplateEditor'

/**
 * Wrapper pour charger TemplateEditor uniquement côté client.
 * Cela évite les problèmes SSR avec Konva qui dépend du Canvas HTML5.
 */
const TemplateEditorDynamic = dynamic<TemplateEditorProps>(
  () => import('./TemplateEditor').then((mod) => mod.TemplateEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-96 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-500">Chargement de l&apos;éditeur...</p>
      </div>
    ),
  }
)

export function TemplateEditor(props: TemplateEditorProps) {
  return <TemplateEditorDynamic {...props} />
}

export type { TemplateEditorProps }
