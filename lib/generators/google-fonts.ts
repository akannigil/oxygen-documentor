/**
 * Module pour télécharger et intégrer des Google Fonts dans les documents DOCX
 */

import PizZip from 'pizzip'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'

/**
 * Interface pour une police Google Font
 */
export interface GoogleFontInfo {
  family: string
  variants: string[]
  category: string
}

/**
 * Télécharge une police depuis Google Fonts API
 * 
 * @param fontFamily Nom de la police (ex: "Roboto", "Open Sans")
 * @param variant Variante de la police (ex: "regular", "bold", "italic")
 * @returns Buffer du fichier TTF de la police
 */
export async function downloadGoogleFont(
  fontFamily: string,
  variant: string = 'regular'
): Promise<Buffer> {
  try {
    // Normaliser le nom de la police pour l'URL Google Fonts
    const normalizedFamily = fontFamily.replace(/\s+/g, '+')
    
    // Déterminer le poids et l'italique selon la variante
    let weight = '400'
    let italic = false
    
    if (variant === 'bold') {
      weight = '700'
    } else if (variant === 'bolditalic' || variant === 'bold italic') {
      weight = '700'
      italic = true
    } else if (variant === 'italic') {
      italic = true
    } else if (variant && /^\d+$/.test(variant)) {
      weight = variant
    }
    
    // Construire l'URL CSS de Google Fonts
    let cssUrl = `https://fonts.googleapis.com/css2?family=${normalizedFamily}:wght@${weight}`
    if (italic) {
      cssUrl += ':ital@1'
    }
    
    // Récupérer le CSS qui contient l'URL du fichier font
    const cssResponse = await fetch(cssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    })
    
    if (!cssResponse.ok) {
      throw new Error(`Impossible de récupérer la police ${fontFamily} depuis Google Fonts (HTTP ${cssResponse.status})`)
    }
    
    const cssText = await cssResponse.text()
    
    // Extraire l'URL du fichier font depuis le CSS
    // Le CSS peut contenir plusieurs URLs (pour différents formats), on cherche le TTF
    // Format: url(https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxPKTU1Kg.woff2)
    // On cherche les URLs .woff2 ou .ttf
    const urlMatches = cssText.matchAll(/url\(([^)]+)\)/gi)
    let fontUrl: string | null = null
    
    for (const match of urlMatches) {
      const url = match[1]?.replace(/^['"]|['"]$/g, '')
      if (url && (url.includes('.woff2') || url.includes('.ttf'))) {
        fontUrl = url
        // Préférer TTF si disponible
        if (url.includes('.ttf')) {
          break
        }
      }
    }
    
    if (!fontUrl) {
      throw new Error(`Impossible d'extraire l'URL de la police ${fontFamily} depuis le CSS`)
    }
    
    // Télécharger le fichier font
    const fontResponse = await fetch(fontUrl, {
      headers: {
        'Referer': 'https://fonts.googleapis.com/',
      },
    })
    
    if (!fontResponse.ok) {
      throw new Error(`Impossible de télécharger le fichier de police depuis ${fontUrl} (HTTP ${fontResponse.status})`)
    }
    
    const fontBuffer = Buffer.from(await fontResponse.arrayBuffer())
    
    // Vérifier que le buffer n'est pas vide
    if (fontBuffer.length === 0) {
      throw new Error(`Le fichier de police téléchargé est vide pour ${fontFamily}`)
    }
    
    return fontBuffer
  } catch (error) {
    console.error(`Erreur lors du téléchargement de la police Google Fonts ${fontFamily}:`, error)
    throw error
  }
}

/**
 * Liste des Google Fonts populaires avec leurs variants disponibles
 */
export const POPULAR_GOOGLE_FONTS: Record<string, GoogleFontInfo> = {
  'Roboto': { family: 'Roboto', variants: ['regular', 'bold', 'italic', 'bolditalic'], category: 'sans-serif' },
  'Open Sans': { family: 'Open Sans', variants: ['regular', 'bold', 'italic', 'bolditalic'], category: 'sans-serif' },
  'Lato': { family: 'Lato', variants: ['regular', 'bold', 'italic', 'bolditalic'], category: 'sans-serif' },
  'Montserrat': { family: 'Montserrat', variants: ['regular', 'bold', 'italic', 'bolditalic'], category: 'sans-serif' },
  'Roboto Condensed': { family: 'Roboto Condensed', variants: ['regular', 'bold', 'italic', 'bolditalic'], category: 'sans-serif' },
  'Source Sans Pro': { family: 'Source Sans Pro', variants: ['regular', 'bold', 'italic', 'bolditalic'], category: 'sans-serif' },
  'Raleway': { family: 'Raleway', variants: ['regular', 'bold', 'italic', 'bolditalic'], category: 'sans-serif' },
  'Oswald': { family: 'Oswald', variants: ['regular', 'bold'], category: 'sans-serif' },
  'PT Sans': { family: 'PT Sans', variants: ['regular', 'bold', 'italic', 'bolditalic'], category: 'sans-serif' },
  'Merriweather': { family: 'Merriweather', variants: ['regular', 'bold', 'italic', 'bolditalic'], category: 'serif' },
  'Playfair Display': { family: 'Playfair Display', variants: ['regular', 'bold', 'italic', 'bolditalic'], category: 'serif' },
  'Lora': { family: 'Lora', variants: ['regular', 'bold', 'italic', 'bolditalic'], category: 'serif' },
  'Noto Sans': { family: 'Noto Sans', variants: ['regular', 'bold', 'italic', 'bolditalic'], category: 'sans-serif' },
}

/**
 * Intègre une police dans un document DOCX
 * 
 * @param zip Instance PizZip du document DOCX
 * @param fontFamily Nom de la police (ex: "Roboto")
 * @param fontBuffer Buffer du fichier TTF de la police
 */
export async function embedFontInDOCX(
  zip: PizZip,
  fontFamily: string,
  fontBuffer: Buffer
): Promise<void> {
  try {
    // Normaliser le nom de la police pour le nom de fichier
    const fontFileName = fontFamily.replace(/\s+/g, '') + '.ttf'
    
    // Ajouter le fichier de police dans word/fonts/
    zip.file(`word/fonts/${fontFileName}`, fontBuffer)
    
    // Modifier ou créer word/fontTable.xml pour référencer la nouvelle police
    let fontTableXml: string
    
    if (zip.files['word/fontTable.xml']) {
      // Le fichier existe déjà, on le met à jour
      fontTableXml = zip.files['word/fontTable.xml'].asText() || ''
    } else {
      // Créer un nouveau fichier fontTable.xml
      fontTableXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
</w:fonts>`
    }
    
    // Parser le XML
    const parser = new DOMParser()
    const doc = parser.parseFromString(fontTableXml, 'text/xml')
    const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
    
    // Vérifier si la police existe déjà
    const fonts = doc.getElementsByTagNameNS(ns, 'font')
    let fontExists = false
    
    for (let i = 0; i < fonts.length; i++) {
      const font = fonts[i] as Element
      const nameAttr = font.getAttribute('w:name')
      if (nameAttr === fontFamily) {
        fontExists = true
        break
      }
    }
    
    if (!fontExists) {
      // Créer un nouvel élément font
      const fontElement = doc.createElementNS(ns, 'font')
      fontElement.setAttribute('w:name', fontFamily)
      
      // Ajouter les attributs pour les différents scripts
      const altName = doc.createElementNS(ns, 'altName')
      altName.setAttribute('w:val', fontFamily)
      fontElement.appendChild(altName)
      
      // Ajouter le font dans le document
      const fontsElement = doc.getElementsByTagNameNS(ns, 'fonts')[0]
      if (fontsElement) {
        fontsElement.appendChild(fontElement)
      }
    }
    
    // Sérialiser le XML modifié
    const serializer = new XMLSerializer()
    const updatedFontTableXml = serializer.serializeToString(doc)
    
    // Mettre à jour le fichier dans le ZIP
    zip.file('word/fontTable.xml', updatedFontTableXml)
    
    // Mettre à jour [Content_Types].xml pour référencer le fichier font
    let contentTypesXml = zip.files['[Content_Types].xml']?.asText() || ''
    
    if (!contentTypesXml.includes(`fonts/${fontFileName}`)) {
      // Ajouter la référence au fichier font
      const fontReference = `  <Override PartName="/word/fonts/${fontFileName}" ContentType="application/x-font-ttf"/>`
      
      // Insérer avant </Types>
      if (contentTypesXml.includes('</Types>')) {
        contentTypesXml = contentTypesXml.replace(
          '</Types>',
          `${fontReference}\n</Types>`
        )
      } else {
        // Ajouter à la fin si </Types> n'existe pas
        contentTypesXml += fontReference + '\n'
      }
      
      zip.file('[Content_Types].xml', contentTypesXml)
    }
  } catch (error) {
    console.error(`Erreur lors de l'intégration de la police ${fontFamily} dans le DOCX:`, error)
    throw error
  }
}

/**
 * Télécharge et intègre une Google Font dans un document DOCX
 * 
 * @param zip Instance PizZip du document DOCX
 * @param fontFamily Nom de la police Google Fonts (ex: "Roboto")
 * @param variant Variante de la police (ex: "regular", "bold")
 */
export async function embedGoogleFontInDOCX(
  zip: PizZip,
  fontFamily: string,
  variant: string = 'regular'
): Promise<void> {
  // Télécharger la police
  const fontBuffer = await downloadGoogleFont(fontFamily, variant)
  
  // Intégrer la police dans le DOCX
  await embedFontInDOCX(zip, fontFamily, fontBuffer)
}

