import PizZip from 'pizzip'

export interface ParsedVariable {
  name: string
  occurrences: number
  context?: string // Exemple de contexte autour de la variable
}

/**
 * Extrait uniquement le texte visible d'un document DOCX (contenu des balises <w:t>)
 * Ignore toutes les balises XML pour éviter les faux positifs
 */
function extractTextFromDOCX(xmlContent: string): string {
  // Extraire uniquement le contenu des balises <w:t> qui contiennent le texte visible
  // Format DOCX : <w:t>texte ici</w:t>
  const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g
  const textParts: string[] = []

  let match: RegExpExecArray | null
  while ((match = textRegex.exec(xmlContent)) !== null) {
    const text = match[1]
    if (text) {
      textParts.push(text)
    }
  }

  // Joindre tous les fragments de texte pour reconstruire le texte complet
  // Les balises <w:t> peuvent être séparées par des balises de formatage, donc on les concatène
  return textParts.join('')
}

/**
 * Parse un template DOCX et extrait toutes les variables {{...}}
 * Utilise uniquement le texte visible du document (pas le XML brut)
 */
export async function parseDOCXVariables(templateBuffer: Buffer): Promise<ParsedVariable[]> {
  try {
    const zip = new PizZip(templateBuffer)

    // Extraire le contenu XML principal du document
    const documentFile = zip.files['word/document.xml']
    if (!documentFile) {
      throw new Error('Fichier word/document.xml non trouvé dans le template DOCX')
    }

    const xmlContent = documentFile.asText() || ''

    // Extraire uniquement le texte visible (contenu des balises <w:t>)
    const visibleText = extractTextFromDOCX(xmlContent)

    // Si aucun texte n'est trouvé, essayer aussi les headers/footers
    let allText = visibleText
    const headerFile = zip.files['word/header1.xml']
    const footerFile = zip.files['word/footer1.xml']

    if (headerFile) {
      const headerText = extractTextFromDOCX(headerFile.asText() || '')
      allText += '\n' + headerText
    }

    if (footerFile) {
      const footerText = extractTextFromDOCX(footerFile.asText() || '')
      allText += '\n' + footerText
    }

    // Chercher les variables UNIQUEMENT dans le texte visible
    // Regex pour trouver {{variable}} ou {{ variable }}
    // Supporte aussi les variables avec espaces : {{ nom }} devient "nom"
    const variableRegex = /\{\{([^}]+)\}\}/g
    const variables = new Map<string, { occurrences: number; context: string }>()

    let match: RegExpExecArray | null
    while ((match = variableRegex.exec(allText)) !== null) {
      const varName = match[1]?.trim() || '' // Nettoyer les espaces

      // Ignorer les variables vides et les fausses détections (contenant des balises XML)
      if (!varName || varName.includes('<') || varName.includes('>') || varName.includes('/')) {
        continue
      }

      // Valider que le nom de variable ne contient que des caractères alphanumériques, underscores, espaces
      // et certains caractères spéciaux courants (tirets, points)
      if (!/^[a-zA-Z0-9_\s\-\.]+$/.test(varName)) {
        continue
      }

      if (!variables.has(varName)) {
        // Extraire un peu de contexte autour de la variable pour l'affichage
        const matchIndex = match.index || 0
        const start = Math.max(0, matchIndex - 10)
        const end = Math.min(allText.length, matchIndex + match[0].length + 10)
        const context = allText.substring(start, end).replace(/\s+/g, ' ').trim()

        variables.set(varName, { occurrences: 0, context })
      }

      const entry = variables.get(varName)
      if (entry) {
        entry.occurrences++
      }
    }

    return Array.from(variables.entries())
      .map(([name, data]) => ({
        name,
        occurrences: data.occurrences,
        context: data.context,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)) // Trier par nom
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Erreur lors du parsing du template DOCX: ${error.message}`)
    }
    throw error
  }
}

/**
 * Valide qu'un template DOCX contient bien des variables
 */
export async function validateDOCXTemplate(templateBuffer: Buffer): Promise<{
  isValid: boolean
  variables: ParsedVariable[]
  error?: string
}> {
  try {
    const variables = await parseDOCXVariables(templateBuffer)

    if (variables.length === 0) {
      return {
        isValid: false,
        variables: [],
        error:
          'Aucune variable {{...}} trouvée dans le template. Ajoutez des variables comme {{nom}}, {{date}}, etc.',
      }
    }

    return {
      isValid: true,
      variables,
    }
  } catch (error) {
    return {
      isValid: false,
      variables: [],
      error: error instanceof Error ? error.message : 'Erreur inconnue lors de la validation',
    }
  }
}
