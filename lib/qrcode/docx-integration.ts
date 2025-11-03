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
    // Générer le QR code
    const qrOptions: QRCodeOptions = {
      width: options.width ?? 200,
      margin: options.margin ?? 1,
      errorCorrectionLevel: options.errorCorrectionLevel ?? 'M',
      type: options.type ?? 'image/png',
      quality: options.quality ?? 0.92,
    }
    
    // Ajouter la couleur seulement si définie
    if (options.color) {
      qrOptions.color = options.color
    }
    
    const qrBuffer = await generateQRCodeBuffer(qrData, qrOptions)
    
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
    const widthEMU = options.docxWidth ?? pixelsToEMUs(options.width ?? 200)
    const heightEMU = options.docxHeight ?? pixelsToEMUs(options.width ?? 200)
    const altText = options.altText ?? 'QR Code'
    
    // Créer le XML pour l'image
    const imageXml = `<w:p>
      <w:r>
        <w:drawing>
          <wp:inline distT="0" distB="0" distL="0" distR="0">
            <wp:extent cx="${widthEMU}" cy="${heightEMU}"/>
            <wp:effectExtent l="0" t="0" r="0" b="0"/>
            <wp:docPr id="${Date.now()}" name="${imageId}" descr="${altText}"/>
            <wp:cNvGraphicFramePr>
              <a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>
            </wp:cNvGraphicFramePr>
            <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                  <pic:nvPicPr>
                    <pic:cNvPr id="0" name="${imageId}"/>
                    <pic:cNvPicPr/>
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
          </wp:inline>
        </w:drawing>
      </w:r>
    </w:p>`
    
    // Remplacer le placeholder par l'image
    // Le placeholder peut être dans un <w:t> ou fragmenté
    // On cherche d'abord les occurrences simples
    const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const placeholderRegex = new RegExp(`<w:t[^>]*>${escapedPlaceholder}</w:t>`, 'g')
    
    if (placeholderRegex.test(xmlContent)) {
      // Remplacer le texte par l'image
      xmlContent = xmlContent.replace(placeholderRegex, `</w:r>${imageXml}<w:r><w:t></w:t>`)
    } else {
      // Si le placeholder est fragmenté, utiliser une approche plus simple
      // Remplacer tout le paragraphe contenant le placeholder
      const paragraphRegex = new RegExp(
        `<w:p[^>]*>.*?${escapedPlaceholder}.*?</w:p>`,
        'gs'
      )
      
      if (paragraphRegex.test(xmlContent)) {
        xmlContent = xmlContent.replace(paragraphRegex, imageXml)
      } else {
        console.warn(`Impossible de remplacer le placeholder "${placeholder}" - il pourrait être fragmenté dans le XML`)
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
  
  for (const qr of qrCodes) {
    currentBuffer = await insertQRCodeInDOCX(
      currentBuffer,
      qr.placeholder,
      qr.data,
      qr.options
    )
  }
  
  return currentBuffer
}

