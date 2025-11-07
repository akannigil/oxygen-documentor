import QRCode from 'qrcode'

/**
 * Options de génération de QR code
 */
export interface QRCodeOptions {
  /**
   * Largeur du QR code en pixels
   * @default 200
   */
  width?: number

  /**
   * Marge autour du QR code (en modules)
   * @default 1
   */
  margin?: number

  /**
   * Niveau de correction d'erreur
   * - 'L': ~7% de correction
   * - 'M': ~15% de correction (défaut)
   * - 'Q': ~25% de correction
   * - 'H': ~30% de correction
   * @default 'M'
   */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'

  /**
   * Type de QR code à générer
   * @default 'image/png'
   */
  type?: 'image/png' | 'image/jpeg'

  /**
   * Qualité de l'image (0-1) pour JPEG uniquement
   * @default 0.92
   */
  quality?: number

  /**
   * Couleur du QR code (hex)
   * @default '#000000'
   */
  color?: {
    dark?: string
    light?: string
  }
}

/**
 * Formats de données supportés pour les QR codes
 */
export type QRCodeDataType =
  | 'text' // Texte brut
  | 'url' // URL
  | 'email' // Email
  | 'tel' // Numéro de téléphone
  | 'sms' // SMS
  | 'vcard' // Carte de visite
  | 'wifi' // Connexion WiFi
  | 'geo' // Coordonnées GPS
  | 'event' // Événement calendrier
  | 'custom' // Données personnalisées

/**
 * Configuration du contenu du QR code
 */
export interface QRCodeContent {
  type: QRCodeDataType
  data: Record<string, string | number | boolean | undefined>
}

/**
 * Génère un QR code au format Buffer PNG
 *
 * @param data Contenu du QR code
 * @param options Options de génération
 * @returns Buffer de l'image PNG
 */
export async function generateQRCodeBuffer(
  data: string,
  options: QRCodeOptions = {}
): Promise<Buffer> {
  try {
    const qrOptions: QRCode.QRCodeToDataURLOptions = {
      width: options.width ?? 200,
      margin: options.margin ?? 1,
      errorCorrectionLevel: options.errorCorrectionLevel ?? 'M',
      type: options.type === 'image/jpeg' ? 'image/jpeg' : 'image/png',
      rendererOpts: {
        quality: options.quality ?? 0.92,
      },
    }

    // Ajouter les couleurs si spécifiées
    if (options.color) {
      qrOptions.color = {
        dark: options.color.dark ?? '#000000',
        light: options.color.light ?? '#FFFFFF',
      }
    }

    const qrDataUrl = await QRCode.toDataURL(data, qrOptions)

    // Convertir DataURL en Buffer
    const base64Data = qrDataUrl.split(',')[1]
    if (!base64Data) {
      throw new Error('Échec de la génération du QR code: DataURL invalide')
    }

    return Buffer.from(base64Data, 'base64')
  } catch (error) {
    throw new Error(
      `Erreur lors de la génération du QR code: ${
        error instanceof Error ? error.message : 'Erreur inconnue'
      }`
    )
  }
}

/**
 * Génère un QR code au format DataURL (base64)
 *
 * @param data Contenu du QR code
 * @param options Options de génération
 * @returns DataURL (data:image/png;base64,...)
 */
export async function generateQRCodeDataURL(
  data: string,
  options: QRCodeOptions = {}
): Promise<string> {
  try {
    const qrOptions: QRCode.QRCodeToDataURLOptions = {
      width: options.width ?? 200,
      margin: options.margin ?? 1,
      errorCorrectionLevel: options.errorCorrectionLevel ?? 'M',
      type: options.type === 'image/jpeg' ? 'image/jpeg' : 'image/png',
      rendererOpts: {
        quality: options.quality ?? 0.92,
      },
    }

    if (options.color) {
      qrOptions.color = {
        dark: options.color.dark ?? '#000000',
        light: options.color.light ?? '#FFFFFF',
      }
    }

    return await QRCode.toDataURL(data, qrOptions)
  } catch (error) {
    throw new Error(
      `Erreur lors de la génération du QR code: ${
        error instanceof Error ? error.message : 'Erreur inconnue'
      }`
    )
  }
}

/**
 * Formate les données selon le type de QR code
 *
 * @param content Configuration du contenu
 * @returns Chaîne formatée pour le QR code
 */
export function formatQRCodeContent(content: QRCodeContent): string {
  switch (content.type) {
    case 'text':
      return String(content.data['text'] ?? '')

    case 'url':
      return String(content.data['url'] ?? '')

    case 'email':
      // Format: mailto:email@example.com?subject=Subject&body=Body
      const email = String(content.data['email'] ?? '')
      const subject = content.data['subject']
        ? `?subject=${encodeURIComponent(String(content.data['subject']))}`
        : ''
      const body = content.data['body']
        ? `${subject ? '&' : '?'}body=${encodeURIComponent(String(content.data['body']))}`
        : ''
      return `mailto:${email}${subject}${body}`

    case 'tel':
      // Format: tel:+33123456789
      return `tel:${String(content.data['phone'] ?? '')}`

    case 'sms':
      // Format: sms:+33123456789?body=Message
      const phone = String(content.data['phone'] ?? '')
      const message = content.data['message']
        ? `?body=${encodeURIComponent(String(content.data['message']))}`
        : ''
      return `sms:${phone}${message}`

    case 'vcard':
      // Format vCard 3.0
      const vcard = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        content.data['firstName'] || content.data['lastName']
          ? `N:${content.data['lastName'] ?? ''};${content.data['firstName'] ?? ''};;;`
          : '',
        content.data['firstName'] || content.data['lastName']
          ? `FN:${content.data['firstName'] ?? ''} ${content.data['lastName'] ?? ''}`.trim()
          : '',
        content.data['organization'] ? `ORG:${content.data['organization']}` : '',
        content.data['title'] ? `TITLE:${content.data['title']}` : '',
        content.data['phone'] ? `TEL;TYPE=WORK,VOICE:${content.data['phone']}` : '',
        content.data['mobile'] ? `TEL;TYPE=CELL:${content.data['mobile']}` : '',
        content.data['email'] ? `EMAIL:${content.data['email']}` : '',
        content.data['website'] ? `URL:${content.data['website']}` : '',
        content.data['address'] ? `ADR;TYPE=WORK:;;${content.data['address']};;;;` : '',
        'END:VCARD',
      ]
      return vcard.filter(Boolean).join('\n')

    case 'wifi':
      // Format: WIFI:T:WPA;S:NetworkName;P:Password;H:false;;
      const security = String(content.data['security'] ?? 'WPA')
      const ssid = String(content.data['ssid'] ?? '')
      const password = String(content.data['password'] ?? '')
      const hidden = content.data['hidden'] ? 'true' : 'false'
      return `WIFI:T:${security};S:${ssid};P:${password};H:${hidden};;`

    case 'geo':
      // Format: geo:latitude,longitude
      const lat = String(content.data['latitude'] ?? '0')
      const lng = String(content.data['longitude'] ?? '0')
      return `geo:${lat},${lng}`

    case 'event':
      // Format iCalendar (simplifié)
      const eventData = [
        'BEGIN:VEVENT',
        content.data['title'] ? `SUMMARY:${content.data['title']}` : '',
        content.data['location'] ? `LOCATION:${content.data['location']}` : '',
        content.data['description'] ? `DESCRIPTION:${content.data['description']}` : '',
        content.data['start'] ? `DTSTART:${content.data['start']}` : '',
        content.data['end'] ? `DTEND:${content.data['end']}` : '',
        'END:VEVENT',
      ]
      return eventData.filter(Boolean).join('\n')

    case 'custom':
      // Pour les données personnalisées, on retourne une chaîne JSON
      return JSON.stringify(content.data)

    default:
      return String(content.data['text'] ?? '')
  }
}

/**
 * Génère un QR code à partir d'un contenu structuré
 *
 * @param content Configuration du contenu
 * @param options Options de génération
 * @returns Buffer de l'image PNG
 */
export async function generateQRCodeFromContent(
  content: QRCodeContent,
  options: QRCodeOptions = {}
): Promise<Buffer> {
  const formattedData = formatQRCodeContent(content)
  return generateQRCodeBuffer(formattedData, options)
}

/**
 * Génère un QR code DataURL à partir d'un contenu structuré
 *
 * @param content Configuration du contenu
 * @param options Options de génération
 * @returns DataURL (data:image/png;base64,...)
 */
export async function generateQRCodeDataURLFromContent(
  content: QRCodeContent,
  options: QRCodeOptions = {}
): Promise<string> {
  const formattedData = formatQRCodeContent(content)
  return generateQRCodeDataURL(formattedData, options)
}

/**
 * Valide les données d'un QR code selon son type
 *
 * @param content Configuration du contenu
 * @returns true si valide, sinon lance une erreur
 */
export function validateQRCodeContent(content: QRCodeContent): boolean {
  switch (content.type) {
    case 'text':
      if (!content.data['text']) {
        throw new Error('Le champ "text" est requis pour un QR code de type text')
      }
      break

    case 'url':
      if (!content.data['url']) {
        throw new Error('Le champ "url" est requis pour un QR code de type url')
      }
      // Vérifier que c'est une URL valide
      try {
        new URL(String(content.data['url']))
      } catch {
        throw new Error("L'URL fournie n'est pas valide")
      }
      break

    case 'email':
      if (!content.data['email']) {
        throw new Error('Le champ "email" est requis pour un QR code de type email')
      }
      // Validation simple d'email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(String(content.data['email']))) {
        throw new Error("L'adresse email fournie n'est pas valide")
      }
      break

    case 'tel':
    case 'sms':
      if (!content.data['phone']) {
        throw new Error(`Le champ "phone" est requis pour un QR code de type ${content.type}`)
      }
      break

    case 'vcard':
      if (!content.data['firstName'] && !content.data['lastName']) {
        throw new Error('Au moins un nom (firstName ou lastName) est requis pour un QR code vCard')
      }
      break

    case 'wifi':
      if (!content.data['ssid']) {
        throw new Error('Le champ "ssid" est requis pour un QR code WiFi')
      }
      break

    case 'geo':
      if (content.data['latitude'] === undefined || content.data['longitude'] === undefined) {
        throw new Error('Les champs "latitude" et "longitude" sont requis pour un QR code geo')
      }
      break

    case 'event':
      if (!content.data['title'] || !content.data['start']) {
        throw new Error('Les champs "title" et "start" sont requis pour un QR code event')
      }
      break

    case 'custom':
      // Pas de validation spécifique pour custom
      break
  }

  return true
}
