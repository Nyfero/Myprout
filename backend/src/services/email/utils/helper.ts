import { readFile } from 'fs/promises'
import path from 'path'

export async function loadEmailTemplate(templateName: string): Promise<string> {
  const templatePath = path.resolve(
    'src/services/email/template',
    `${templateName}.html`
  )
  return await readFile(templatePath, 'utf-8')
}

export function replaceVariables(
  html: string,
  variables: Record<string, any>
): string {
  return Object.entries(variables).reduce((acc, [key, value]) => {
    return acc.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
  }, html)
}
