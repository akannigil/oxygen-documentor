import type { GenerationContext, GenerationResult } from '@/lib/generation/adapters'
import type { TemplateType, OutputFormat } from '@/shared/types'
import { getAdapter } from '@/lib/generation/adapters'

export interface GenerateDocumentParams extends GenerationContext {
  templateType: TemplateType
  outputFormat: OutputFormat
}

export async function generateDocumentBuffer(
  params: GenerateDocumentParams
): Promise<GenerationResult> {
  const adapter = getAdapter(params.templateType)
  const result = await adapter.generate(params.outputFormat, {
    templateBuffer: params.templateBuffer,
    templateMimeType: params.templateMimeType,
    data: params.data,
    fields: params.fields ?? [],
    ...(params.qrcodeConfigs ? { qrcodeConfigs: params.qrcodeConfigs } : {}),
    ...(params.documentFilePath ? { documentFilePath: params.documentFilePath } : {}),
    ...(params.getStorageUrl ? { getStorageUrl: params.getStorageUrl } : {}),
    ...(params.authConfig ? { authConfig: params.authConfig } : {}),
    ...(params.pdfOptions ? { pdfOptions: params.pdfOptions } : {}),
    ...(params.styleOptions ? { styleOptions: params.styleOptions } : {}),
  })
  return result
}
