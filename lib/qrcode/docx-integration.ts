import PizZip from 'pizzip'
import { generateQRCodeBuffer, type QRCodeOptions } from './generator'

/**
 * Options d'insertion de QR code dans un DOCX
 */
export interface QRCodeInsertOptions extends QRCodeOptions {
  /**
   * Largeur du QR code dans le document (en EMUs - English Metric Units)
   * 1 EMU = 1/914400 inch, 1 inch = 914400 EMUs
   * @default 914400 (1 inch ≈ 2.54 cm)
   */
  docxWidth?: number

  /**
   * Hauteur du QR code dans le document (en EMUs)
   * @default 914400 (1 inch ≈ 2.54 cm)
   */
  docxHeight?: number

  /**
   * Description alternative pour l'accessibilité
   * @default 'QR Code'
   */
  altText?: string
}

/**
 * Convertit des pixels en EMUs (English Metric Units) pour DOCX
 * 1 pixel ≈ 9525 EMUs (à 96 DPI)
 */
function pixelsToEMUs(pixels: number): number {
  return Math.round(pixels * 9525)
}

/**
 * Insère un QR code dans un document DOCX existant
 *
 * Cette fonction modifie le DOCX en ajoutant une image de QR code
 * à la place d'un placeholder spécifique.
 *
 * @param docxBuffer Buffer du document DOCX
 * @param placeholder Texte du placeholder (ex: "{{qrcode}}")
 * @param qrData Données à encoder dans le QR code
 * @param options Options de génération et insertion
 * @returns Buffer du document DOCX modifié
 */
export async function insertQRCodeInDOCX(
  docxBuffer: Buffer,
  placeholder: string,
  qrData: string,
  options: QRCodeInsertOptions = {}
): Promise<Buffer> {
  try {
    // Validation du contenu avant génération
    if (!qrData || typeof qrData !== 'string' || qrData.trim().length === 0) {
      throw new Error(
        `Le contenu du QR code est vide ou invalide pour le placeholder "${placeholder}"`
      )
    }

    // Normaliser le contenu (trim)
    const normalizedQrData = qrData.trim()

    // Log pour déboguer (seulement en développement)
    if (process.env['NODE_ENV'] === 'development') {
      console.log(`[QR Code DOCX] Insertion pour placeholder: ${placeholder}`)
      console.log(`[QR Code DOCX] Contenu: ${normalizedQrData.length} caractères`)
      const preview = normalizedQrData.length > 100 
        ? normalizedQrData.substring(0, 100) + '...' 
        : normalizedQrData
      console.log(`[QR Code DOCX] Aperçu: ${preview}`)
    }

    // Générer le QR code avec des paramètres optimisés pour la lisibilité
    const qrOptions: QRCodeOptions = {
      width: options.width ?? 300, // Taille augmentée pour meilleure lisibilité
      margin: options.margin ?? 2, // Marge augmentée pour éviter les problèmes de lecture
      errorCorrectionLevel: options.errorCorrectionLevel ?? 'Q', // Niveau élevé pour résister à la dégradation
      type: options.type ?? 'image/png',
      quality: options.quality ?? 1.0, // Qualité maximale
    }

    // Ajouter la couleur seulement si définie
    if (options.color) {
      qrOptions.color = options.color
    }

    const qrBuffer = await generateQRCodeBuffer(normalizedQrData, qrOptions)

    // Charger le DOCX
    const zip = new PizZip(docxBuffer)

    // Lire le document.xml
    const documentXml = zip.file('word/document.xml')
    if (!documentXml) {
      throw new Error('Fichier document.xml non trouvé dans le DOCX')
    }

    let xmlContent = documentXml.asText()

    // Vérifier si le placeholder existe
    if (!xmlContent.includes(placeholder)) {
      throw new Error(`Placeholder "${placeholder}" non trouvé dans le document`)
    }

    // Générer un ID unique pour l'image
    const imageId = `qrcode_${Date.now()}`
    const rId = `rId${Date.now()}`

    // Ajouter l'image dans le dossier media
    const imagePath = `word/media/${imageId}.png`
    zip.file(imagePath, qrBuffer)

    // Mettre à jour [Content_Types].xml pour inclure le type PNG
    const contentTypesXml = zip.file('[Content_Types].xml')
    if (contentTypesXml) {
      let contentTypesContent = contentTypesXml.asText()

      // Ajouter le type PNG si non présent
      if (!contentTypesContent.includes('Extension="png"')) {
        contentTypesContent = contentTypesContent.replace(
          '</Types>',
          '  <Default Extension="png" ContentType="image/png"/>\n</Types>'
        )
        zip.file('[Content_Types].xml', contentTypesContent)
      }
    }

    // Mettre à jour word/_rels/document.xml.rels pour ajouter la relation
    const relsPath = 'word/_rels/document.xml.rels'
    const relsXml = zip.file(relsPath)

    if (!relsXml) {
      // Créer le fichier rels s'il n'existe pas
      const relsContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageId}.png"/>
</Relationships>`
      zip.file(relsPath, relsContent)
    } else {
      let relsContent = relsXml.asText()

      // Ajouter la nouvelle relation avant </Relationships>
      const newRelationship = `  <Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imageId}.png"/>\n`
      relsContent = relsContent.replace('</Relationships>', `${newRelationship}</Relationships>`)

      zip.file(relsPath, relsContent)
    }

    // Dimensions en EMUs
    // Utiliser une taille minimale de 300px pour une bonne lisibilité
    const qrWidth = options.width ?? 300
    const widthEMU = options.docxWidth ?? pixelsToEMUs(qrWidth)
    const heightEMU = options.docxHeight ?? pixelsToEMUs(qrWidth) // QR codes sont carrés
    const altText = options.altText ?? 'QR Code'
    const uniqueId = Date.now()

    // Créer le XML du dessin (à insérer dans le même run/paragraphe que le placeholder)
    // This avoids creating un nouveau paragraphe qui peut décaler l'image sur une autre page
    const drawingXml = `<w:drawing>
          <wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251659264" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1">
            <wp:simplePos x="0" y="0"/>
            <wp:positionH relativeFrom="column">
              <wp:align>center</wp:align>
            </wp:positionH>
            <wp:positionV relativeFrom="paragraph">
              <wp:posOffset>0</wp:posOffset>
            </wp:positionV>
            <wp:extent cx="${widthEMU}" cy="${heightEMU}"/>
            <wp:effectExtent l="0" t="0" r="0" b="0"/>
            <wp:wrapNone/>
            <wp:docPr id="${uniqueId}" name="${imageId}" descr="${altText}"/>
            <wp:cNvGraphicFramePr>
              <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
            </wp:cNvGraphicFramePr>
            <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                  <pic:nvPicPr>
                    <pic:cNvPr id="${uniqueId}" name="${imageId}" descr="${altText}"/>
                    <pic:cNvPicPr>
                      <a:picLocks noChangeAspect="1" noChangeArrowheads="1"/>
                    </pic:cNvPicPr>
                  </pic:nvPicPr>
                  <pic:blipFill>
                    <a:blip r:embed="${rId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
                    <a:stretch>
                      <a:fillRect/>
                    </a:stretch>
                  </pic:blipFill>
                  <pic:spPr>
                    <a:xfrm>
                      <a:off x="0" y="0"/>
                      <a:ext cx="${widthEMU}" cy="${heightEMU}"/>
                    </a:xfrm>
                    <a:prstGeom prst="rect">
                      <a:avLst/>
                    </a:prstGeom>
                  </pic:spPr>
                </pic:pic>
              </a:graphicData>
            </a:graphic>
          </wp:anchor>
        </w:drawing>`

    // Variante paragraphe (fallback quand on remplace tout le <w:p>)
    const imageParagraphXml = `<w:p>
      <w:r>
        ${drawingXml}
      </w:r>
    </w:p>`

    // Remplacer le placeholder par l'image
    // Le placeholder peut être dans un <w:t> ou fragmenté
    // On cherche d'abord les occurrences simples
    const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    // Méthode 1 : Chercher le placeholder dans un seul <w:t> (cas le plus courant)
    const placeholderRegex = new RegExp(`(<w:t[^>]*>)${escapedPlaceholder}(</w:t>)`, 'g')

    if (placeholderRegex.test(xmlContent)) {
      // Remplacer le <w:t>placeholder</w:t> par un <w:drawing> inline dans le même <w:r>
      xmlContent = xmlContent.replace(placeholderRegex, () => {
        return drawingXml
      })
    } else {
      // Méthode 2 : Chercher le placeholder fragmenté dans plusieurs <w:t>
      // Chercher le paragraphe contenant le placeholder
      const paragraphRegex = new RegExp(`(<w:p[^>]*>)(.*?${escapedPlaceholder}.*?)(</w:p>)`, 'gs')

      if (paragraphRegex.test(xmlContent)) {
        // Remplacer tout le paragraphe par un paragraphe contenant l'image
        xmlContent = xmlContent.replace(paragraphRegex, imageParagraphXml)
      } else {
        // Méthode 3 : Chercher le placeholder directement dans le texte XML
        // Cette méthode est plus robuste pour les cas où le placeholder est fragmenté
        const textOnlyRegex = new RegExp(escapedPlaceholder, 'g')
        if (textOnlyRegex.test(xmlContent)) {
          // Trouver et remplacer le placeholder dans le contexte XML
          // Chercher le paragraphe contenant le placeholder
          const lines = xmlContent.split('\n')
          let found = false

          for (let i = 0; i < lines.length; i++) {
            const currentLine = lines[i]
            if (currentLine && currentLine.includes(placeholder)) {
              // Trouver le début et la fin du paragraphe
              let startIdx = i
              let endIdx = i

              // Chercher le début du paragraphe
              while (startIdx > 0) {
                const line = lines[startIdx]
                if (line && line.includes('<w:p')) {
                  break
                }
                startIdx--
              }

              // Chercher la fin du paragraphe
              while (endIdx < lines.length - 1) {
                const line = lines[endIdx]
                if (line && line.includes('</w:p>')) {
                  break
                }
                endIdx++
              }

              // Remplacer le paragraphe entier par l'image
              const paragraphLines = lines.slice(startIdx, endIdx + 1)
              const paragraphText = paragraphLines.join('\n')

              if (paragraphText.includes(placeholder)) {
                // Remplacer le paragraphe par l'image
                lines.splice(startIdx, endIdx - startIdx + 1, imageParagraphXml)
                xmlContent = lines.join('\n')
                found = true
                break
              }
            }
          }

          if (!found) {
            // Si on n'a toujours pas trouvé, lever une erreur
            throw new Error(`Placeholder "${placeholder}" non trouvé dans le document`)
          }
        } else {
          throw new Error(`Placeholder "${placeholder}" non trouvé dans le document`)
        }
      }
    }

    // Mettre à jour le document.xml
    zip.file('word/document.xml', xmlContent)

    // Générer le nouveau DOCX
    const buffer = zip.generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    })

    return Buffer.from(buffer)
  } catch (error) {
    throw new Error(
      `Erreur lors de l'insertion du QR code dans le DOCX: ${
        error instanceof Error ? error.message : 'Erreur inconnue'
      }`
    )
  }
}

/**
 * Insère plusieurs QR codes dans un document DOCX
 *
 * @param docxBuffer Buffer du document DOCX
 * @param qrCodes Tableau de QR codes à insérer
 * @returns Buffer du document DOCX modifié
 */
export async function insertMultipleQRCodesInDOCX(
  docxBuffer: Buffer,
  qrCodes: Array<{
    placeholder: string
    data: string
    options?: QRCodeInsertOptions
  }>
): Promise<Buffer> {
  let currentBuffer = docxBuffer

  // Vérifier d'abord quels placeholders existent dans le document
  const zip = new PizZip(currentBuffer)
  const documentXml = zip.file('word/document.xml')
  if (!documentXml) {
    throw new Error('Fichier document.xml non trouvé dans le DOCX')
  }

  const xmlContent = documentXml.asText()
  const missingPlaceholders: string[] = []

  // Vérifier tous les placeholders avant d'insérer
  for (const qr of qrCodes) {
    if (!xmlContent.includes(qr.placeholder)) {
      missingPlaceholders.push(qr.placeholder)
    }
  }

  // Si des placeholders manquent, lever une erreur avec tous les placeholders manquants
  if (missingPlaceholders.length > 0) {
    throw new Error(
      `Placeholder(s) non trouvé(s) dans le document: ${missingPlaceholders.join(', ')}. ` +
        `Assurez-vous que ces placeholders existent dans votre template DOCX.`
    )
  }

  // Tous les placeholders existent, procéder à l'insertion
  for (const qr of qrCodes) {
    currentBuffer = await insertQRCodeInDOCX(currentBuffer, qr.placeholder, qr.data, qr.options)
  }

  return currentBuffer
}
