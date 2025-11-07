import { DOMParser, XMLSerializer } from '@xmldom/xmldom'

/**
 * Configuration des styles pour les variables DOCX
 */
export interface VariableStyleConfig {
  /**
   * Nom de la police (ex: "Arial", "Times New Roman", "Calibri")
   * @default hérite du style du template
   */
  fontFamily?: string

  /**
   * Taille de la police en points (pt)
   * @default hérite du style du template
   */
  fontSize?: number

  /**
   * Couleur du texte (format hex: "#000000" ou nom: "black")
   * @default hérite du style du template
   */
  color?: string

  /**
   * Police en gras
   * @default false
   */
  bold?: boolean

  /**
   * Police en italique
   * @default false
   */
  italic?: boolean

  /**
   * Police soulignée
   * @default false
   */
  underline?: boolean
}

/**
 * Préserve les styles de paragraphe (hauteur de ligne, espacement) après le remplacement des variables
 * Cette fonction corrige les décalages verticaux causés par docxtemplater
 */
export function preserveParagraphStyles(zip: any): void {
  const documentFile = zip.files['word/document.xml']
  if (!documentFile) {
    return
  }

  const xmlContent = documentFile.asText() || ''

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlContent, 'text/xml')

    // Namespace pour Word
    const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

    // Trouver tous les paragraphes <w:p>
    const paragraphs = doc.getElementsByTagNameNS(ns, 'p')

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i]
      if (!paragraph) continue

      // Vérifier si le paragraphe contient du texte (peut avoir été modifié par docxtemplater)
      const hasText = paragraph.textContent && paragraph.textContent.trim().length > 0
      if (!hasText) continue

      // Trouver ou créer <w:pPr> (propriétés du paragraphe)
      let pPrElement: Element | null = null
      const children = Array.from(paragraph.childNodes || [])

      for (const child of children) {
        if (child.nodeType === 1 && (child as Element).nodeName === 'w:pPr') {
          pPrElement = child as Element
          break
        }
      }

      // Créer <w:pPr> s'il n'existe pas
      if (!pPrElement) {
        pPrElement = doc.createElementNS(ns, 'pPr')
        // Insérer au début du paragraphe
        if (paragraph.firstChild) {
          paragraph.insertBefore(pPrElement, paragraph.firstChild)
        } else {
          paragraph.appendChild(pPrElement)
        }
      }

      // Vérifier si les propriétés d'espacement existent déjà
      const existingSpacing = pPrElement.getElementsByTagNameNS(ns, 'spacing')[0] as Element | undefined
      
      if (existingSpacing) {
        // Si l'espacement existe, s'assurer qu'il a une hauteur de ligne
        // pour éviter les décalages verticaux
        const existingSpacingLine = existingSpacing.getAttribute('w:line')
        if (!existingSpacingLine) {
          // Ajouter une hauteur de ligne minimale si elle n'existe pas
          // 240 = 12pt (hauteur de ligne normale, équivalent à line-height: 1.0)
          existingSpacing.setAttribute('w:line', '240')
          existingSpacing.setAttribute('w:lineRule', 'auto')
        }
      } else {
        // Si aucune propriété d'espacement n'existe, en créer une par défaut
        // pour préserver le positionnement vertical
        const spacing = doc.createElementNS(ns, 'spacing')
        
        // Définir une hauteur de ligne minimale pour éviter les décalages
        // 240 = 12pt (hauteur de ligne normale, équivalent à line-height: 1.0)
        // Utiliser 'auto' pour que Word calcule automatiquement la hauteur
        spacing.setAttribute('w:line', '240')
        spacing.setAttribute('w:lineRule', 'auto')
        
        // Préserver l'espacement après (0 par défaut pour éviter les décalages)
        spacing.setAttribute('w:after', '0')
        
        // Préserver l'espacement avant (0 par défaut)
        spacing.setAttribute('w:before', '0')

        pPrElement.appendChild(spacing)
      }

      // Ne pas forcer l'alignement - préserver l'alignement existant du template
      // L'alignement doit être défini dans le template Word lui-même
    }

    // Sérialiser le XML modifié
    const serializer = new XMLSerializer()
    const updatedXml = serializer.serializeToString(doc)

    // Mettre à jour le fichier XML dans le ZIP
    zip.file('word/document.xml', updatedXml)
  } catch (error) {
    // En cas d'erreur de parsing, on continue sans préserver les styles
    console.warn("Erreur lors de la préservation des styles de paragraphe:", error)
  }
}

/**
 * Configuration globale ou par variable pour les styles
 */
export interface DOCXStyleOptions {
  /**
   * Style par défaut pour toutes les variables
   */
  defaultStyle?: VariableStyleConfig

  /**
   * Styles spécifiques par variable
   * Clé: nom de la variable (sans les {{ }})
   * Valeur: configuration de style
   */
  variableStyles?: Record<string, VariableStyleConfig>
}

/**
 * Applique les styles aux variables dans le XML DOCX
 * Cette fonction doit être appelée après doc.render() mais avant getZip().generate()
 *
 * @param zip Instance PizZip du document DOCX
 * @param variables Mapping des variables remplacées (nom -> valeur formatée)
 * @param styleOptions Configuration des styles à appliquer
 */
export function applyVariableStyles(
  zip: any,
  variables: Record<string, string>,
  styleOptions: DOCXStyleOptions
): void {
  const documentFile = zip.files['word/document.xml']
  if (!documentFile) {
    return
  }

  const xmlContent = documentFile.asText() || ''

  try {
    // Parser le XML avec xmldom
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlContent, 'text/xml')

    // Namespace pour Word
    const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

    // Trouver tous les éléments <w:t> (texte)
    const textElements = doc.getElementsByTagNameNS(ns, 't')

    // Pour chaque variable remplacée, appliquer le style
    for (const [variableName, variableValue] of Object.entries(variables)) {
      // Déterminer le style à appliquer (spécifique ou par défaut)
      const style = styleOptions.variableStyles?.[variableName] || styleOptions.defaultStyle

      if (!style) continue

      // Parcourir tous les éléments texte pour trouver ceux qui contiennent la valeur
      for (let i = 0; i < textElements.length; i++) {
        const textElement = textElements[i]
        if (!textElement) continue

        const textContent = textElement.textContent || ''

        // Vérifier si cet élément contient la valeur de la variable
        if (textContent.includes(variableValue)) {
          // Trouver le <w:r> parent (run)
          let runElement = textElement.parentNode
          while (runElement && runElement.nodeName !== 'w:r') {
            runElement = runElement.parentNode
          }

          if (!runElement) continue

          // Trouver ou créer le <w:rPr> (propriétés du run)
          let rPrElement: Element | null = null
          const children = Array.from(runElement.childNodes || [])

          for (const child of children) {
            if (child.nodeType === 1 && (child as Element).nodeName === 'w:rPr') {
              rPrElement = child as Element
              break
            }
          }

          // Créer <w:rPr> s'il n'existe pas
          if (!rPrElement) {
            rPrElement = doc.createElementNS(ns, 'rPr')
            // Insérer au début du run
            if (runElement.firstChild) {
              runElement.insertBefore(rPrElement, runElement.firstChild)
            } else {
              runElement.appendChild(rPrElement)
            }
          }

          // Appliquer les styles
          applyStyleToRPr(rPrElement, style, doc, ns)
        }
      }
    }

    // Sérialiser le XML modifié
    const serializer = new XMLSerializer()
    const updatedXml = serializer.serializeToString(doc)

    // Mettre à jour le fichier XML dans le ZIP
    zip.file('word/document.xml', updatedXml)
  } catch (error) {
    // En cas d'erreur de parsing, on continue sans appliquer les styles
    console.warn("Erreur lors de l'application des styles DOCX:", error)
  }
}

/**
 * Applique un style à un élément <w:rPr>
 */
function applyStyleToRPr(
  rPrElement: Element,
  style: VariableStyleConfig,
  doc: Document,
  ns: string
): void {
  // Police
  if (style.fontFamily) {
    const rFonts = doc.createElementNS(ns, 'rFonts')
    rFonts.setAttribute('w:ascii', style.fontFamily)
    rFonts.setAttribute('w:hAnsi', style.fontFamily)
    rFonts.setAttribute('w:cs', style.fontFamily)
    rPrElement.appendChild(rFonts)
  }

  // Taille
  if (style.fontSize) {
    const halfPoints = style.fontSize * 2
    const sz = doc.createElementNS(ns, 'sz')
    sz.setAttribute('w:val', String(halfPoints))
    rPrElement.appendChild(sz)

    const szCs = doc.createElementNS(ns, 'szCs')
    szCs.setAttribute('w:val', String(halfPoints))
    rPrElement.appendChild(szCs)
  }

  // Couleur
  if (style.color) {
    const colorHex = style.color.startsWith('#') ? style.color.slice(1) : style.color
    const color = doc.createElementNS(ns, 'color')
    color.setAttribute('w:val', colorHex.toUpperCase())
    rPrElement.appendChild(color)
  }

  // Gras
  if (style.bold) {
    const b = doc.createElementNS(ns, 'b')
    rPrElement.appendChild(b)
    const bCs = doc.createElementNS(ns, 'bCs')
    rPrElement.appendChild(bCs)
  }

  // Italique
  if (style.italic) {
    const i = doc.createElementNS(ns, 'i')
    rPrElement.appendChild(i)
    const iCs = doc.createElementNS(ns, 'iCs')
    rPrElement.appendChild(iCs)
  }

  // Souligné
  if (style.underline) {
    const u = doc.createElementNS(ns, 'u')
    u.setAttribute('w:val', 'single')
    rPrElement.appendChild(u)
  }
}
