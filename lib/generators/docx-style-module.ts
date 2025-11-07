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
