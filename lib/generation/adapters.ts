import { generateDOCX } from '@/lib/generators/docx'
import { convertDOCXToPDFWithStyles, type PDFConversionOptions } from '@/lib/converters/docx-to-pdf'
import { generateDocumentFromTemplate } from '@/lib/pdf/generator'
import type { TemplateField, DOCXQRCodeConfig, TemplateType, OutputFormat } from '@/shared/types'
import type { CertificateAuthConfig } from '@/lib/qrcode/certificate-auth'
import type { DOCXStyleOptions } from '@/lib/generators/docx-style-module'


export interface GenerationContext {
  templateBuffer: Buffer
  templateMimeType: string
  data: Record<string, string | number | Date>
  fields?: TemplateField[]
  qrcodeConfigs?: DOCXQRCodeConfig[]
  documentFilePath?: string
  getStorageUrl?: (filePath: string, signed?: boolean, expiresIn?: number) => Promise<string>
  authConfig?: CertificateAuthConfig
  pdfOptions?: PDFConversionOptions
  styleOptions?: DOCXStyleOptions
}

export interface GenerationResult {
  buffer: Buffer
  mimeType: string
}

export interface TemplateGeneratorAdapter {
  supports(templateType: TemplateType): boolean
  generate(desired: OutputFormat, ctx: GenerationContext): Promise<GenerationResult>
}

export class DocxGeneratorAdapter implements TemplateGeneratorAdapter {
  supports(templateType: TemplateType): boolean {
    return templateType === 'docx'
  }

  async generate(desired: OutputFormat, ctx: GenerationContext): Promise<GenerationResult> {
    const docxBuffer = await generateDOCX(ctx.templateBuffer, {
      variables: ctx.data,
      ...(ctx.qrcodeConfigs ? { qrcodeConfigs: ctx.qrcodeConfigs } : {}),
      ...(ctx.documentFilePath ? { documentFilePath: ctx.documentFilePath } : {}),
      ...(ctx.getStorageUrl ? { getStorageUrl: ctx.getStorageUrl } : {}),
      ...(ctx.styleOptions ? { styleOptions: ctx.styleOptions } : {}),
    })

    if (desired === 'pdf') {
      const pdf = await convertDOCXToPDFWithStyles(docxBuffer, ctx.pdfOptions)
      return { buffer: pdf, mimeType: 'application/pdf' }
    }

    return {
      buffer: docxBuffer,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }
  }
}

export class PdfImageGeneratorAdapter implements TemplateGeneratorAdapter {
  supports(templateType: TemplateType): boolean {
    return templateType === 'pdf' || templateType === 'image'
  }

  async generate(_desired: OutputFormat, ctx: GenerationContext): Promise<GenerationResult> {
    const fields: TemplateField[] = ctx.fields ?? []
    const hasQRCodeWithOptions = fields.some(
      (f) => f.type === 'qrcode' && ((f.qrcodeAuth?.enabled === true) || (f.qrcodeStorageUrl?.enabled === true))
    )

    const qrOptions = hasQRCodeWithOptions && ctx.authConfig
      ? {
          authConfig: ctx.authConfig,
          ...(ctx.documentFilePath ? { documentFilePath: ctx.documentFilePath } : {}),
          ...(ctx.getStorageUrl ? { getStorageUrl: ctx.getStorageUrl } : {}),
        }
      : undefined

    const buffer = await generateDocumentFromTemplate(
      ctx.templateBuffer,
      ctx.templateMimeType,
      fields,
      ctx.data,
      qrOptions
    )

    return { buffer, mimeType: 'application/pdf' }
  }
}

export function getAdapter(templateType: TemplateType): TemplateGeneratorAdapter {
  const adapters: TemplateGeneratorAdapter[] = [
    new DocxGeneratorAdapter(),
    new PdfImageGeneratorAdapter(),
  ]

  const found = adapters.find((a) => a.supports(templateType))
  if (!found) {
    throw new Error(`Aucun adapter trouvé pour le type de template: ${templateType}`)
  }
  return found
}


