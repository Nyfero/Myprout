// services/email.ts
import nodemailer from 'nodemailer'
import { Resend } from 'resend'

const isProd = process.env.NODE_ENV === 'production'

// ============ TRANSPORTERS ============

let transporter: nodemailer.Transporter

if (!isProd) {
  const testAccount = await nodemailer.createTestAccount()
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  })
}

const resend = isProd ? new Resend(process.env.RESEND_API_KEY) : null

// ============ FONCTION GÉNÉRIQUE ============

async function sendEmail(to: string, subject: string, html: string) {
  if (isProd) {
    await resend!.emails.send({
      from: 'myprout <noreply@myprout.fr>',
      to,
      subject,
      html,
    })
  } else {
    const info = await transporter.sendMail({
      from: '"myprout" <noreply@myprout.fr>',
      to,
      subject,
      html,
    })
    console.log('[EMAIL PREVIEW]', nodemailer.getTestMessageUrl(info))
  }
}

// ============ EMAILS ============

export async function sendApprovalEmailToAdmin(user: any) {
  const adminEmail = process.env.ADMIN_EMAIL!
  const adminPanelLink = `${process.env.FRONTEND_URL}/admin/users`

  await sendEmail(
    adminEmail,
    `Nouveau compte en attente de validation : ${user.email}`,
    `
      <p>Un nouvel utilisateur s'est inscrit et attend votre validation :</p>
      <ul>
        <li><strong>Nom</strong>: ${user.firstName} ${user.lastName}</li>
        <li><strong>Email</strong>: ${user.email}</li>
      </ul>
      <p><a href="${adminPanelLink}">Accéder au panel d'administration</a></p>
    `
  )
}

export async function sendPendingApprovalEmail(user: any) {
  await sendEmail(
    user.email,
    'Votre demande de création compte est en attente de validation',
    `
      <p>Bonjour ${user.firstName},</p>
      <p>Votre demande de création compte est en attente de validation par l'administrateur.</p>
      <p>Vous recevrez un email une fois votre demande de compte validé pour définir votre mot de passe.</p>
    `
  )
}

export async function sendPasswordSetupEmail(user: any, token: string) {
  const passwordSetupLink = `${process.env.FRONTEND_URL}/login?token=${token}`

  await sendEmail(
    user.email,
    'Définissez votre mot de passe',
    `
      <p>Bonjour ${user.firstName},</p>
      <p>Votre compte a été validé par l'administrateur. Vous pouvez maintenant définir votre mot de passe :</p>
      <p><a href="${passwordSetupLink}">Définir mon mot de passe</a></p>
      <p>Ce lien expire dans 1 semaine.</p>
    `
  )
}

export async function sendRejectionEmail(user: any) {
  await sendEmail(
    user.email,
    'Votre demande a été refusée',
    `
      <p>Bonjour ${user.firstName},</p>
      <p>Votre demande de création compte a été refusée par l'administrateur.</p>
    `
  )
}

export async function sendRecoveryMail(user: any, token: string) {
  const resetLink = `${process.env.FRONTEND_URL}/login?token=${token}&mode=reset`

  await sendEmail(
    user.email,
    'Réinitialisation de votre mot de passe',
    `
        <p>Bonjour ${user.firstName},</p>
        <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
        <p>Cliquez sur le lien ci-dessous pour continuer :</p>
        <a href="${resetLink}">Réinitialiser mon mot de passe</a>
        <p>Ce lien est valable <strong>1 heure</strong>.</p>
        <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
      `
  )
}
