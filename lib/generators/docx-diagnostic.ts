import PizZip from 'pizzip'
import { DOMParser } from '@xmldom/xmldom'

/**
 * Diagnostic pour analyser comment les variables sont stockées dans le XML DOCX
 * Identifie les problèmes de variables divisées en plusieurs nœuds XML
 */
export interface VariableDiagnostic {
  variableName: string
  found: boolean
  splitAcrossNodes: boolean
  nodeCount: number
  nodes: Array<{
    content: string
    parentRun: string
    hasSpace: boolean
  }>
  fullText: string
  issue?: string
}

/**
 * Analyse une variable dans un template DOCX pour identifier les problèmes
 */
export async function diagnoseVariableInDOCX(
  templateBuffer: Buffer,
  variableName: string
): Promise<VariableDiagnostic> {
  try {
    const zip = new PizZip(templateBuffer)
    const documentFile = zip.files['word/document.xml']
    
    if (!documentFile) {
      return {
        variableName,
        found: false,
        splitAcrossNodes: false,
        nodeCount: 0,
        nodes: [],
        fullText: '',
        issue: 'Fichier word/document.xml non trouvé',
      }
    }

    const xmlContent = documentFile.asText() || ''
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlContent, 'text/xml')
    const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

    // Chercher la variable dans le XML
    const variablePattern = `{{${variableName}}}`
    const fullText = extractFullText(doc, ns)
    
    if (!fullText.includes(variablePattern)) {
      return {
        variableName,
        found: false,
        splitAcrossNodes: false,
        nodeCount: 0,
        nodes: [],
        fullText,
        issue: `Variable "${variablePattern}" non trouvée dans le document`,
      }
    }

    // Trouver tous les éléments <w:t> qui contiennent une partie de la variable
    const textElements = doc.getElementsByTagNameNS(ns, 't')
    const relevantNodes: Array<{
      content: string
      parentRun: string
      hasSpace: boolean
    }> = []

    for (let i = 0; i < textElements.length; i++) {
      const textElement = textElements[i]
      if (!textElement) continue

      const textContent = textElement.textContent || ''
      
      // Vérifier si cet élément contient une partie de la variable
      if (textContent.includes('{{') || textContent.includes('}}') || textContent.includes(variableName)) {
        // Trouver le <w:r> parent
        let runElement = textElement.parentNode
        while (runElement && runElement.nodeName !== 'w:r') {
          runElement = runElement.parentNode
        }

        const parentRun = runElement ? getRunIdentifier(runElement) : 'unknown'
        const hasSpace = textContent.includes(' ') || textContent.trim() !== textContent

        relevantNodes.push({
          content: textContent,
          parentRun,
          hasSpace,
        })
      }
    }

    // Vérifier si la variable est divisée en plusieurs nœuds
    const splitAcrossNodes = relevantNodes.length > 1
    const fullVariableText = relevantNodes.map(n => n.content).join('')

    let issue: string | undefined
    if (splitAcrossNodes) {
      issue = `Variable divisée en ${relevantNodes.length} nœuds XML. Cela peut causer un remplacement partiel.`
    } else if (relevantNodes.length === 0) {
      issue = 'Variable trouvée dans le texte mais aucun nœud XML correspondant identifié.'
    }

    const result: VariableDiagnostic = {
      variableName,
      found: true,
      splitAcrossNodes,
      nodeCount: relevantNodes.length,
      nodes: relevantNodes,
      fullText: fullVariableText,
    }

    if (issue !== undefined) {
      result.issue = issue
    }

    return result
  } catch (error) {
    return {
      variableName,
      found: false,
      splitAcrossNodes: false,
      nodeCount: 0,
      nodes: [],
      fullText: '',
      issue: error instanceof Error ? error.message : 'Erreur inconnue',
    }
  }
}

/**
 * Extrait tout le texte visible du document
 */
function extractFullText(doc: Document, ns: string): string {
  const textElements = doc.getElementsByTagNameNS(ns, 't')
  const textParts: string[] = []

  for (let i = 0; i < textElements.length; i++) {
    const textElement = textElements[i]
    if (textElement) {
      const textContent = textElement.textContent || ''
      if (textContent) {
        textParts.push(textContent)
      }
    }
  }

  return textParts.join('')
}

/**
 * Génère un identifiant pour un élément <w:r>
 */
function getRunIdentifier(runElement: Node | null): string {
  if (!runElement) return 'unknown'
  
  // Essayer de trouver un identifiant unique (position, contenu, etc.)
  const children = Array.from(runElement.childNodes || [])
  const textNodes = children
    .filter(c => c.nodeName === 'w:t')
    .map(c => c.textContent || '')
    .join('')
  
  return textNodes.substring(0, 20) || 'empty-run'
}

