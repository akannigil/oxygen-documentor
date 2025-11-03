import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib'
import QRCode from 'qrcode'
import type { TemplateField } from '@/shared/types'

/**
 * Génère un PDF à partir d'un template et de données
 */
export async function generatePDF(
  templateBuffer: Buffer,
  fields: TemplateField[],
  data: Record<string, string | number | Date>
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(templateBuffer)
  const pages = pdfDoc.getPages()
  const page = pages[0] as PDFPage

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  for (const field of fields) {
    const value = formatFieldValue(data[field.key], field.type, field.format)

    if (field.type === 'qrcode') {
      // Générer QR code
      const qrDataUrl = await QRCode.toDataURL(String(value), {
        width: field.w,
        margin: 1,
      })

      // Convertir DataURL en image PNG
      const pngImage = await pdfDoc.embedPng(qrDataUrl)

      page.drawImage(pngImage, {
        x: field.x,
        y: field.y,
        width: field.w,
        height: field.h,
      })
    } else {
      // Dessiner texte
      const fontSize = field.fontSize ?? 12
      const currentFont = field.type === 'number' ? boldFont : font

      const textY = field.y

      // Gérer l'alignement
      let textX = field.x
      const text = String(value)

      if (field.align === 'center') {
        const textWidth = currentFont.widthOfTextAtSize(text, fontSize)
        textX = field.x + (field.w - textWidth) / 2
      } else if (field.align === 'right') {
        const textWidth = currentFont.widthOfTextAtSize(text, fontSize)
        textX = field.x + field.w - textWidth
      }

      page.drawText(text, {
        x: textX,
        y: textY,
        size: fontSize,
        font: currentFont,
        color: rgb(0, 0, 0),
      })
    }
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

/**
 * Génère un PDF depuis un template PDF ou image (PNG/JPG)
 */
export async function generateDocumentFromTemplate(
  templateBuffer: Buffer,
  templateMimeType: string,
  fields: TemplateField[],
  data: Record<string, string | number | Date>
): Promise<Buffer> {
  if (templateMimeType.startsWith('application/pdf')) {
    return generatePDFWithCoordinateConversion(templateBuffer, fields, data)
  }

  // Image (PNG/JPEG) en fond
  const pdfDoc = await PDFDocument.create()
  let img
  if (templateMimeType.includes('png')) {
    img = await pdfDoc.embedPng(templateBuffer)
  } else if (templateMimeType.includes('jpeg') || templateMimeType.includes('jpg')) {
    img = await pdfDoc.embedJpg(templateBuffer)
  } else {
    throw new Error(`Type de template non supporté: ${templateMimeType}`)
  }

  const page = pdfDoc.addPage([img.width, img.height])
  page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })

  // Charger toutes les polices disponibles
  const fonts = await loadFonts(pdfDoc)

  for (const field of fields) {
    const value = formatFieldValue(data[field.key], field.type, field.format)

    if (field.type === 'qrcode') {
      const qrDataUrl = await QRCode.toDataURL(String(value), {
        width: field.w,
        margin: 1,
      })
      const pngImage = await pdfDoc.embedPng(qrDataUrl)
      // Convertir les coordonnées Y (origine en haut dans l'éditeur, en bas dans PDF)
      const pdfY = img.height - field.y - field.h
      page.drawImage(pngImage, {
        x: field.x,
        y: pdfY,
        width: field.w,
        height: field.h,
      })
    } else {
      const fontSize = field.fontSize ?? 12
      const font = getFieldFont(fonts, field)
      const text = String(value)
      
      // Convertir les coordonnées Y (origine en haut dans l'éditeur, en bas dans PDF)
      const pdfYBase = img.height - field.y - field.h
      
      // Dessiner le fond si spécifié
      if (field.backgroundColor) {
        const bgColor = hexToRgb(field.backgroundColor)
        page.drawRectangle({
          x: field.x,
          y: pdfYBase,
          width: field.w,
          height: field.h,
          color: rgb(bgColor.r / 255, bgColor.g / 255, bgColor.b / 255),
        })
      }

      // Dessiner la bordure si spécifiée
      if (field.borderColor && field.borderWidth) {
        const borderColor = hexToRgb(field.borderColor)
        page.drawRectangle({
          x: field.x,
          y: pdfYBase,
          width: field.w,
          height: field.h,
          borderColor: rgb(borderColor.r / 255, borderColor.g / 255, borderColor.b / 255),
          borderWidth: field.borderWidth,
        })
      }
      
      // Calcul du centrage vertical (baseline du texte)
      // Le texte PDF est positionné par sa baseline, on ajoute le centrage vertical
      const textHeight = fontSize
      const verticalCenter = (field.h - textHeight) / 2
      const pdfY = pdfYBase + verticalCenter
      
      // Calcul de la position horizontale avec un petit padding
      let textX = field.x + 2 // Padding de 2px à gauche par défaut
      
      if (field.align === 'center') {
        const textWidth = font.widthOfTextAtSize(text, fontSize)
        textX = field.x + (field.w - textWidth) / 2
      } else if (field.align === 'right') {
        const textWidth = font.widthOfTextAtSize(text, fontSize)
        textX = field.x + field.w - textWidth - 2 // Padding de 2px à droite
      }

      // Couleur du texte
      const textColor = field.textColor ? hexToRgb(field.textColor) : { r: 0, g: 0, b: 0 }
      
      page.drawText(text, {
        x: textX,
        y: pdfY,
        size: fontSize,
        font: font,
        color: rgb(textColor.r / 255, textColor.g / 255, textColor.b / 255),
      })
    }
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

/**
 * Génère un PDF avec conversion des coordonnées pour les templates PDF existants
 */
async function generatePDFWithCoordinateConversion(
  templateBuffer: Buffer,
  fields: TemplateField[],
  data: Record<string, string | number | Date>
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(templateBuffer)
  const pages = pdfDoc.getPages()
  const page = pages[0] as PDFPage
  const { height: pageHeight } = page.getSize()

  // Charger toutes les polices disponibles
  const fonts = await loadFonts(pdfDoc)

  for (const field of fields) {
    const value = formatFieldValue(data[field.key], field.type, field.format)

    if (field.type === 'qrcode') {
      const qrDataUrl = await QRCode.toDataURL(String(value), {
        width: field.w,
        margin: 1,
      })
      const pngImage = await pdfDoc.embedPng(qrDataUrl)
      // Convertir les coordonnées Y (origine en haut dans l'éditeur, en bas dans PDF)
      const pdfY = pageHeight - field.y - field.h
      page.drawImage(pngImage, {
        x: field.x,
        y: pdfY,
        width: field.w,
        height: field.h,
      })
    } else {
      const fontSize = field.fontSize ?? 12
      const font = getFieldFont(fonts, field)
      const text = String(value)
      
      // Convertir les coordonnées Y (origine en haut dans l'éditeur, en bas dans PDF)
      const pdfYBase = pageHeight - field.y - field.h
      
      // Dessiner le fond si spécifié
      if (field.backgroundColor) {
        const bgColor = hexToRgb(field.backgroundColor)
        page.drawRectangle({
          x: field.x,
          y: pdfYBase,
          width: field.w,
          height: field.h,
          color: rgb(bgColor.r / 255, bgColor.g / 255, bgColor.b / 255),
        })
      }

      // Dessiner la bordure si spécifiée
      if (field.borderColor && field.borderWidth) {
        const borderColor = hexToRgb(field.borderColor)
        page.drawRectangle({
          x: field.x,
          y: pdfYBase,
          width: field.w,
          height: field.h,
          borderColor: rgb(borderColor.r / 255, borderColor.g / 255, borderColor.b / 255),
          borderWidth: field.borderWidth,
        })
      }

      // Calcul du centrage vertical (baseline du texte)
      // Le texte PDF est positionné par sa baseline, on ajoute le centrage vertical
      const textHeight = fontSize
      const verticalCenter = (field.h - textHeight) / 2
      const pdfY = pdfYBase + verticalCenter
      
      // Calcul de la position horizontale avec un petit padding
      let textX = field.x + 2 // Padding de 2px à gauche par défaut
      
      if (field.align === 'center') {
        const textWidth = font.widthOfTextAtSize(text, fontSize)
        textX = field.x + (field.w - textWidth) / 2
      } else if (field.align === 'right') {
        const textWidth = font.widthOfTextAtSize(text, fontSize)
        textX = field.x + field.w - textWidth - 2 // Padding de 2px à droite
      }

      // Couleur du texte
      const textColor = field.textColor ? hexToRgb(field.textColor) : { r: 0, g: 0, b: 0 }

      page.drawText(text, {
        x: textX,
        y: pdfY,
        size: fontSize,
        font: font,
        color: rgb(textColor.r / 255, textColor.g / 255, textColor.b / 255),
      })
    }
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}

/**
 * Formate une valeur selon son type et format
 */
function formatFieldValue(
  value: string | number | Date | undefined,
  type: TemplateField['type'],
  format?: string
): string {
  if (value === undefined || value === null) {
    return ''
  }

  switch (type) {
    case 'date':
      if (value instanceof Date) {
        return formatDate(value, format)
      }
      if (typeof value === 'string') {
        const date = new Date(value)
        return isNaN(date.getTime()) ? String(value) : formatDate(date, format)
      }
      return String(value)

    case 'number':
      if (typeof value === 'number') {
        return formatNumber(value, format)
      }
      const num = parseFloat(String(value))
      return isNaN(num) ? String(value) : formatNumber(num, format)

    case 'text':
      return formatText(String(value), format)

    case 'qrcode':
      return String(value)

    default:
      return String(value)
  }
}

/**
 * Formate une date selon le format spécifié
 */
function formatDate(date: Date, format?: string): string {
  if (!format) {
    return date.toLocaleDateString('fr-FR')
  }

  // Format simple : YYYY-MM-DD
  if (format === 'YYYY-MM-DD') {
    return date.toISOString().split('T')[0] ?? ''
  }

  // Format DD/MM/YYYY
  if (format === 'DD/MM/YYYY') {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  // Par défaut, format français
  return date.toLocaleDateString('fr-FR')
}

/**
 * Formate un nombre selon le format spécifié
 */
function formatNumber(value: number, format?: string): string {
  if (!format) {
    return value.toString()
  }

  // Format avec décimales : 0.00
  if (format.includes('.')) {
    const decimals = format.split('.')[1]?.length ?? 2
    return value.toFixed(decimals)
  }

  return value.toString()
}

/**
 * Formate un texte selon le format spécifié (uppercase, lowercase, etc.)
 */
function formatText(text: string, format?: string): string {
  if (!format) {
    return text
  }

  switch (format.toLowerCase()) {
    case 'uppercase':
      return text.toUpperCase()
    case 'lowercase':
      return text.toLowerCase()
    case 'capitalize':
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
    default:
      return text
  }
}

/**
 * Charge toutes les polices disponibles
 */
async function loadFonts(pdfDoc: PDFDocument): Promise<Record<string, PDFFont>> {
  return {
    'Helvetica': await pdfDoc.embedFont(StandardFonts.Helvetica),
    'Helvetica-Bold': await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    'Times-Roman': await pdfDoc.embedFont(StandardFonts.TimesRoman),
    'Times-Bold': await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
    'Courier': await pdfDoc.embedFont(StandardFonts.Courier),
    'Courier-Bold': await pdfDoc.embedFont(StandardFonts.CourierBold),
  }
}

/**
 * Obtient la police pour un champ
 */
function getFieldFont(fonts: Record<string, PDFFont>, field: TemplateField): PDFFont {
  const fontName = field.fontFamily || 'Helvetica'
  return fonts[fontName] || fonts['Helvetica']!
}

/**
 * Convertit une couleur hex en RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1]!, 16),
    g: parseInt(result[2]!, 16),
    b: parseInt(result[3]!, 16)
  } : { r: 0, g: 0, b: 0 }
}

