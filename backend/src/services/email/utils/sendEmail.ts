// services/utils/sendEmail.ts
import nodemailer from 'nodemailer'
import { Resend } from 'resend'

const isProd = process.env.NODE_ENV === 'production'

// ============ TRANSPORTERS ============

const sender = 'myprout <noreply@myprout.fr>'

// Dev
let transporter: nodemailer.Transporter
const testAccount = await nodemailer.createTestAccount()
transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: testAccount.user,
    pass: testAccount.pass,
  },
})

// Prod
const resend = new Resend(process.env.RESEND_API_KEY)

// ============ FONCTION GÉNÉRIQUE ============
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  templateId?: string,
  templateVariables?: Record<string, any>
) {
  if (isProd && templateId) {
    await resend.emails.send({
      from: sender,
      to,
      subject,
      template: {
        id: templateId,
        variables: templateVariables || {},
      },
    })
  } else {
    const info = await transporter.sendMail({
      from: sender,
      to,
      subject,
      html,
    })
    console.log('[EMAIL PREVIEW]', nodemailer.getTestMessageUrl(info))
  }
}
