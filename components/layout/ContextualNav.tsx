'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ProjectNav } from './ProjectNav'

export function ContextualNav() {
  const pathname = usePathname()
  const [projectInfo, setProjectInfo] = useState<{
    id: string
    name: string
  } | null>(null)

  useEffect(() => {
    // Détecter si on est dans un contexte de projet
    const projectMatch = pathname?.match(/^\/projects\/([^/]+)/)
    if (projectMatch) {
      const projectId = projectMatch[1]
      
      // Si c'est "new", ne pas afficher la navigation projet
      if (projectId === 'new') {
        setProjectInfo(null)
        return
      }

      // Charger les infos du projet
      fetch(`/api/projects/${projectId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.id) {
            setProjectInfo({
              id: data.id,
              name: data.name,
            })
          }
        })
        .catch(() => {
          setProjectInfo(null)
        })
    } else {
      setProjectInfo(null)
    }
  }, [pathname])

  if (!projectInfo) {
    return null
  }

  return <ProjectNav projectId={projectInfo.id} projectName={projectInfo.name} />
}

