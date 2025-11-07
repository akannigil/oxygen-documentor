import mammoth from 'mammoth'
import puppeteer from 'puppeteer'
import PizZip from 'pizzip'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import os from 'os'

const execAsync = promisify(exec)

/**
 * Convertit un document DOCX en PDF
 *
 * @param docxBuffer Buffer du document DOCX
 * @returns Buffer du document PDF généré
 */
export async function convertDOCXToPDF(docxBuffer: Buffer): Promise<Buffer> {
  try {
    // Étape 1 : Convertir DOCX → HTML avec mammoth
    const htmlResult = await mammoth.convertToHtml({ buffer: docxBuffer })
    const htmlContent = htmlResult.value

    // Étape 2 : Convertir HTML → PDF avec puppeteer
    const pdfBuffer = await convertHTMLToPDF(htmlContent)

    return pdfBuffer
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Erreur lors de la conversion DOCX → PDF: ${error.message}`)
    }
    throw new Error('Erreur inconnue lors de la conversion DOCX → PDF')
  }
}

/**
 * Convertit du HTML en PDF avec puppeteer
 */
async function convertHTMLToPDF(htmlContent: string): Promise<Buffer> {
  let browser

  try {
    // Lancer le navigateur headless
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Pour éviter les problèmes de mémoire
      ],
    })

    const page = await browser.newPage()

    // Charger le HTML dans la page
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
    })

    // Générer le PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm',
      },
    })

    return Buffer.from(pdfBuffer)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'

    // Messages d'erreur plus explicites
    if (errorMessage.includes('Could not find Chromium') || errorMessage.includes('Executable')) {
      throw new Error(
        "Puppeteer n'a pas pu trouver Chromium. " +
          'Assurez-vous que les dépendances de Puppeteer sont installées. ' +
          'Sur Linux/Docker, vous devrez peut-être installer des packages système supplémentaires.'
      )
    }

    throw new Error(`Erreur lors de la conversion HTML → PDF: ${errorMessage}`)
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

export type PageFormat = 'A4' | 'A3' | 'Letter' | 'Legal' | 'Tabloid'
export type PageOrientation = 'portrait' | 'landscape'

export interface PDFConversionOptions {
  format?: PageFormat
  orientation?: PageOrientation
  margins?: {
    top?: string
    right?: string
    bottom?: string
    left?: string
  }
  /**
   * Méthode de conversion à utiliser
   * - 'libreoffice': Utilise LibreOffice en mode headless (recommandé, fidèle à Word)
   * - 'puppeteer': Utilise mammoth + puppeteer (fallback si LibreOffice n'est pas disponible)
   */
  method?: 'libreoffice' | 'puppeteer'
}

/**
 * Vérifie si LibreOffice est installé et disponible
 */
async function isLibreOfficeAvailable(): Promise<boolean> {
  try {
    const commands = [
      'libreoffice --version',
      'soffice --version',
      '/usr/bin/libreoffice --version',
      '/Applications/LibreOffice.app/Contents/MacOS/soffice --version',
    ]

    for (const cmd of commands) {
      try {
        await execAsync(cmd)
        console.log(`✅ LibreOffice trouvé avec: ${cmd}`)
        return true
      } catch {
        // Essayer la commande suivante
      }
    }

    console.warn('⚠️ LibreOffice non trouvé')
    return false
  } catch {
    return false
  }
}

/**
 * Obtient la commande LibreOffice appropriée selon le système
 */
function getLibreOfficeCommand(): string {
  const platform = os.platform()

  if (platform === 'win32') {
    // Windows : chercher dans les emplacements courants
    return 'soffice' // On essaiera avec 'soffice' dans le PATH
  } else if (platform === 'darwin') {
    // macOS
    return '/Applications/LibreOffice.app/Contents/MacOS/soffice'
  } else {
    // Linux
    return 'libreoffice'
  }
}

/**
 * Convertit un DOCX en PDF en utilisant LibreOffice (méthode recommandée)
 * Cette méthode préserve PARFAITEMENT la mise en page, les images de fond, etc.
 */
async function convertDOCXToPDFWithLibreOffice(
  docxBuffer: Buffer,
  _options?: PDFConversionOptions
): Promise<Buffer> {
  const tmpDir = path.join(os.tmpdir(), `docx-pdf-${Date.now()}`)
  const inputPath = path.join(tmpDir, 'input.docx')
  const outputPath = path.join(tmpDir, 'input.pdf')

  try {
    // Créer le dossier temporaire
    await mkdir(tmpDir, { recursive: true })

    // Écrire le fichier DOCX temporaire
    await writeFile(inputPath, docxBuffer)

    // Commande LibreOffice
    const libreOfficeCmd = getLibreOfficeCommand()
    const command = `${libreOfficeCmd} --headless --convert-to pdf --outdir "${tmpDir}" "${inputPath}"`

    console.log('🔄 Conversion avec LibreOffice:', command)

    // Exécuter la conversion (timeout de 30 secondes)
    await execAsync(command, { timeout: 30000 })

    // Vérifier que le PDF a été créé
    if (!existsSync(outputPath)) {
      throw new Error("Le fichier PDF n'a pas été généré par LibreOffice")
    }

    // Lire le PDF généré
    const fs = await import('fs/promises')
    const pdfBuffer = await fs.readFile(outputPath)

    console.log('✅ Conversion LibreOffice réussie')

    return pdfBuffer
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'

    // Messages d'erreur plus explicites
    if (errorMessage.includes('command not found') || errorMessage.includes('is not recognized')) {
      throw new Error(
        "LibreOffice n'est pas installé ou n'est pas dans le PATH. " +
          'Installation : ' +
          'Ubuntu/Debian: sudo apt-get install libreoffice, ' +
          'macOS: brew install libreoffice, ' +
          'Windows: télécharger depuis https://www.libreoffice.org/download/'
      )
    }

    throw new Error(`Erreur lors de la conversion avec LibreOffice: ${errorMessage}`)
  } finally {
    // Nettoyer les fichiers temporaires
    try {
      if (existsSync(inputPath)) await unlink(inputPath)
      if (existsSync(outputPath)) await unlink(outputPath)
      // Note: on ne supprime pas le dossier tmpDir car il peut contenir d'autres fichiers
    } catch (cleanupError) {
      console.warn('Erreur lors du nettoyage des fichiers temporaires:', cleanupError)
    }
  }
}

/**
 * Analyse le document.xml pour détecter les éléments avec positionnement absolu
 */
async function analyzeDocumentPositioning(
  docxBuffer: Buffer
): Promise<{ hasAbsolutePositioning: boolean; hasBackgroundImages: boolean }> {
  try {
    const zip = new PizZip(docxBuffer)
    const documentXml = zip.file('word/document.xml')

    if (!documentXml) {
      return { hasAbsolutePositioning: false, hasBackgroundImages: false }
    }

    const xmlContent = documentXml.asText()

    // Détecter les text boxes et formes avec positionnement absolu
    // <w:txbxContent> indique une text box
    // <wp:anchor> indique un élément flottant (positionné de manière absolue)
    const hasAbsolutePositioning =
      xmlContent.includes('<w:txbxContent>') ||
      xmlContent.includes('<wp:anchor') ||
      xmlContent.includes('<w:pict>')

    // Détecter les images de fond
    // <v:background> ou <w:background> indiquent une image de fond
    const hasBackgroundImages =
      xmlContent.includes('<v:background') || xmlContent.includes('<w:background')

    return { hasAbsolutePositioning, hasBackgroundImages }
  } catch (error) {
    console.error("Erreur lors de l'analyse du positionnement:", error)
    return { hasAbsolutePositioning: false, hasBackgroundImages: false }
  }
}

/**
 * Extrait les images d'un document DOCX
 */
async function extractImagesFromDOCX(
  docxBuffer: Buffer
): Promise<Array<{ name: string; data: Buffer; contentType: string }>> {
  try {
    const zip = new PizZip(docxBuffer)
    const images: Array<{ name: string; data: Buffer; contentType: string }> = []

    // Parcourir tous les fichiers dans le DOCX
    Object.keys(zip.files).forEach((filename) => {
      // Les images sont dans word/media/
      if (filename.startsWith('word/media/')) {
        const file = zip.files[filename]
        if (file && !file.dir) {
          const imageData = file.asNodeBuffer()

          // Déterminer le type MIME
          let contentType = 'image/png'
          if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
            contentType = 'image/jpeg'
          } else if (filename.endsWith('.png')) {
            contentType = 'image/png'
          } else if (filename.endsWith('.gif')) {
            contentType = 'image/gif'
          } else if (filename.endsWith('.bmp')) {
            contentType = 'image/bmp'
          }

          images.push({
            name: filename,
            data: imageData,
            contentType,
          })
        }
      }
    })

    return images
  } catch (error) {
    console.error("Erreur lors de l'extraction des images:", error)
    return []
  }
}

/**
 * Version alternative avec styles améliorés pour préserver le formatage exact
 *
 * Par défaut, utilise LibreOffice (conversion fidèle à Word)
 * Si LibreOffice n'est pas disponible, fallback vers mammoth+puppeteer
 */
export async function convertDOCXToPDFWithStyles(
  docxBuffer: Buffer,
  options?: PDFConversionOptions
): Promise<Buffer> {
  try {
    // Déterminer la méthode à utiliser
    const preferredMethod = options?.method || 'libreoffice'

    // Tentative 1 : LibreOffice (recommandé pour une conversion fidèle)
    if (preferredMethod === 'libreoffice') {
      const libreOfficeAvailable = await isLibreOfficeAvailable()

      if (libreOfficeAvailable) {
        console.log('📄 Conversion DOCX → PDF avec LibreOffice (fidèle à Word)')
        try {
          return await convertDOCXToPDFWithLibreOffice(docxBuffer, options)
        } catch (error) {
          console.error('❌ Erreur LibreOffice, fallback vers Puppeteer:', error)
          // Continuer avec puppeteer en fallback
        }
      } else {
        console.warn(
          '⚠️ LibreOffice non disponible, utilisation de Puppeteer (conversion approximative)'
        )
      }
    }

    // Tentative 2 : Puppeteer (fallback ou si explicitement demandé)
    console.log('📄 Conversion DOCX → PDF avec Puppeteer (mammoth + HTML)')

    // Analyser le document pour détecter le positionnement absolu et les images de fond
    const positioning = await analyzeDocumentPositioning(docxBuffer)

    // Extraire les images du DOCX
    const images = await extractImagesFromDOCX(docxBuffer)

    console.log('Analyse du document DOCX:', {
      hasAbsolutePositioning: positioning.hasAbsolutePositioning,
      hasBackgroundImages: positioning.hasBackgroundImages,
      imageCount: images.length,
    })

    // Convertir DOCX → HTML avec conversion des styles et images
    const htmlResult = await mammoth.convertToHtml(
      { buffer: docxBuffer },
      {
        styleMap: [
          // Préserver les styles de paragraphe
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Normal'] => p:fresh",
          // Préserver les listes
          "r[style-name='Strong'] => strong",
          "p[style-name='List Paragraph'] => p:fresh",
        ],
        // Convertir les images en base64 pour les inclure dans le HTML
        convertImage: mammoth.images.imgElement(async (image) => {
          const imageBuffer = await image.read()
          const base64 = imageBuffer.toString('base64')
          const contentType = image.contentType || 'image/png'
          return {
            src: `data:${contentType};base64,${base64}`,
          }
        }),
      }
    )
    let htmlContent = htmlResult.value

    // Si le document contient des images de fond ou du positionnement absolu,
    // on ajoute une classe spéciale au premier élément img
    if (positioning.hasBackgroundImages || positioning.hasAbsolutePositioning) {
      htmlContent = htmlContent.replace(/<img /i, '<img class="background-image" ')
    }

    // Styles CSS améliorés pour préserver exactement le formatage DOCX
    // avec support des images de fond et positionnement du texte
    const styledHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      box-sizing: border-box;
    }
    html, body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000;
      margin: 0;
      padding: 0;
      width: 100%;
      position: relative;
    }
    body {
      padding: 0;
      margin: 0;
      /* Important : créer un contexte de positionnement */
      position: relative;
    }
    /* Wrapper pour gérer les images de fond et la superposition */
    .page-wrapper {
      position: relative;
      width: 100%;
      min-height: 100vh;
    }
    /* Préserver les paragraphes exactement comme dans Word */
    p {
      margin: 0;
      padding: 0;
      text-align: left;
      page-break-inside: avoid;
      /* Position relative pour permettre le positionnement */
      position: relative;
      z-index: 10;
    }
    /* Préserver les tableaux */
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 0.5em 0;
      page-break-inside: auto;
      position: relative;
      z-index: 10;
    }
    table tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    table td, table th {
      border: 1px solid #ddd;
      padding: 4px 8px;
      vertical-align: top;
    }
    /* Préserver les images - Important pour les images de fond */
    img {
      max-width: 100%;
      height: auto;
      display: block;
      page-break-inside: avoid;
      /* Les images doivent être derrière le texte */
      position: relative;
      z-index: 1;
    }
    /* Images de fond (si elles ont une classe spécifique) */
    img[style*="position: absolute"],
    img.background-image {
      position: absolute;
      z-index: 0 !important;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    /* Préserver les listes */
    ul, ol {
      margin: 0.5em 0;
      padding-left: 2em;
      position: relative;
      z-index: 10;
    }
    li {
      margin: 0.25em 0;
    }
    /* Préserver les titres */
    h1, h2, h3, h4, h5, h6 {
      margin: 0.5em 0;
      font-weight: bold;
      page-break-after: avoid;
      position: relative;
      z-index: 10;
    }
    h1 { font-size: 18pt; }
    h2 { font-size: 16pt; }
    h3 { font-size: 14pt; }
    /* Préserver les sauts de ligne */
    br {
      display: block;
      margin: 0.5em 0;
      content: "";
    }
    /* Améliorer le rendu des caractères spéciaux */
    code {
      font-family: 'Courier New', monospace;
      background-color: #f5f5f5;
      padding: 2px 4px;
      border-radius: 2px;
    }
    /* Support des text-box et formes avec texte */
    div, span {
      position: relative;
      z-index: 10;
    }
    /* Forcer le texte au-dessus des images */
    body > * {
      position: relative;
      z-index: 10;
    }
    body > img:first-child {
      position: absolute;
      z-index: 0;
      top: 0;
      left: 0;
    }
  </style>
  <script>
    // Script pour améliorer le positionnement avant la conversion en PDF
    window.addEventListener('DOMContentLoaded', function() {
      // Détecter si la première image pourrait être une image de fond
      const firstImg = document.querySelector('body > img:first-child');
      if (firstImg) {
        // Vérifier si l'image est grande (probablement une image de fond)
        firstImg.addEventListener('load', function() {
          const imgWidth = this.naturalWidth;
          const imgHeight = this.naturalHeight;
          const bodyWidth = document.body.offsetWidth;
          
          // Si l'image est presque aussi large que le body, c'est probablement une image de fond
          if (imgWidth >= bodyWidth * 0.8) {
            this.classList.add('background-image');
            this.style.position = 'absolute';
            this.style.zIndex = '0';
            this.style.top = '0';
            this.style.left = '0';
            this.style.width = '100%';
            this.style.height = 'auto';
            console.log('Image de fond détectée et repositionnée');
          }
        });
      }
      
      // S'assurer que tout le texte a un z-index supérieur aux images
      const allText = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, span');
      allText.forEach(function(el) {
        if (el.textContent && el.textContent.trim()) {
          el.style.position = 'relative';
          el.style.zIndex = '10';
        }
      });
      
      console.log('Positionnement du texte optimisé pour PDF');
    });
  </script>
</head>
<body>
  ${htmlContent}
</body>
</html>
`

    // Convertir HTML → PDF
    let browser

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })

      const page = await browser.newPage()

      // Définir la taille du viewport selon le format et l'orientation
      // Les dimensions sont en pixels pour un bon rendu
      let viewportWidth = 794 // A4 portrait par défaut
      let viewportHeight = 1123

      const format = options?.format || 'A4'
      const isLandscape = options?.orientation === 'landscape'

      if (format === 'A3') {
        viewportWidth = isLandscape ? 1682 : 1191
        viewportHeight = isLandscape ? 1191 : 1682
      } else if (format === 'A4') {
        viewportWidth = isLandscape ? 1123 : 794
        viewportHeight = isLandscape ? 794 : 1123
      } else if (format === 'Letter') {
        viewportWidth = isLandscape ? 1056 : 816
        viewportHeight = isLandscape ? 816 : 1056
      } else if (format === 'Legal') {
        viewportWidth = isLandscape ? 1344 : 816
        viewportHeight = isLandscape ? 816 : 1344
      } else if (format === 'Tabloid') {
        viewportWidth = isLandscape ? 1648 : 1224
        viewportHeight = isLandscape ? 1224 : 1648
      }

      await page.setViewport({
        width: viewportWidth,
        height: viewportHeight,
      })

      await page.setContent(styledHTML, {
        waitUntil: ['networkidle0', 'load', 'domcontentloaded'],
      })

      // Attendre que toutes les images soient chargées
      await page
        .evaluate(() => {
          return Promise.all(
            Array.from(document.images)
              .filter((img) => !img.complete)
              .map((img) => {
                return new Promise((resolve, reject) => {
                  img.addEventListener('load', resolve)
                  img.addEventListener('error', reject)
                  // Timeout après 5 secondes
                  setTimeout(() => resolve(null), 5000)
                })
              })
          )
        })
        .catch(() => {
          // Ignorer les erreurs de chargement d'images
          console.warn("Certaines images n'ont pas pu être chargées")
        })

      // Attendre un court instant pour que le JavaScript de positionnement s'exécute
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Vérifier et ajuster le positionnement si nécessaire
      await page.evaluate(() => {
        // Forcer la réorganisation des éléments si nécessaire
        const images = document.querySelectorAll('img')
        const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div, span')

        console.log(`Images trouvées: ${images.length}, Éléments texte: ${textElements.length}`)

        // Log pour debugging dans Puppeteer
        images.forEach((img, idx) => {
          console.log(`Image ${idx}: position=${img.style.position}, zIndex=${img.style.zIndex}`)
        })
      })

      // Configuration PDF avec orientation
      // Marges réduites par défaut pour mieux correspondre au formatage Word
      const pdfOptions: Parameters<typeof page.pdf>[0] = {
        format: options?.format || 'A4',
        landscape: options?.orientation === 'landscape',
        printBackground: true,
        margin: {
          top: options?.margins?.top || '10mm',
          right: options?.margins?.right || '10mm',
          bottom: options?.margins?.bottom || '10mm',
          left: options?.margins?.left || '10mm',
        },
        preferCSSPageSize: false, // Utiliser les dimensions Puppeteer pour un meilleur contrôle
        // Options supplémentaires pour améliorer le rendu
        omitBackground: false, // Conserver les images de fond
      }

      const pdfBuffer = await page.pdf(pdfOptions)

      return Buffer.from(pdfBuffer)
    } finally {
      if (browser) {
        await browser.close()
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Erreur lors de la conversion DOCX → PDF: ${error.message}`)
    }
    throw new Error('Erreur inconnue lors de la conversion DOCX → PDF')
  }
}
