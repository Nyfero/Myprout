// services/email.ts
import { sendEmail } from './utils/sendEmail'
import { loadEmailTemplate, replaceVariables } from './utils/helper'

const isProd = process.env.NODE_ENV === 'production'

// ADMIN
export async function sendRequestInscriptionToAdmin(user: any) {
  const adminEmail = process.env.ADMIN_EMAIL!
  const adminPanelLink = `${process.env.FRONTEND_URL}/admin/users`
  let title = "Demande d'inscription de " + user.firstName

  let html = ''
  let template = ''
  let templateVariables = {}

  if (isProd) {
    template = 'new-user-registration-1'
    templateVariables = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      date: user.created_at,
      adminURL: adminPanelLink,
    }
  } else {
    html = await loadEmailTemplate('Admin')

    html = replaceVariables(html, {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      date: user.created_at,
      adminURL: adminPanelLink,
    })
  }

  await sendEmail(adminEmail, title, html, template, templateVariables)
}

// EMAIL VERIFICATION
export async function sendConfirmEmailToUser(user: any, token: string) {
  const confirmLink = `${process.env.FRONTEND_URL}/login?token=${token}&mode=email`
  let title = 'Confirmer votre mot de passe'

  let html = ''
  let template = ''
  let templateVariables = {}

  if (isProd) {
    template = 'email-validation'
    templateVariables = {
      firstName: user.firstName,
      confirmMailRoute: confirmLink,
    }
  } else {
    html = await loadEmailTemplate('EmailValidation')

    html = replaceVariables(html, {
      firstName: user.firstName,
      confirmMailRoute: confirmLink,
    })
  }

  await sendEmail(user.email, title, html, template, templateVariables)
}

// ACTIVATE
export async function sendAccountSetupToUser(user: any, token: string) {
  const passwordSetupLink = `${process.env.FRONTEND_URL}/login?token=${token}&mode=set`
  let title = 'Définissez votre mot de passe'

  let html = ''
  let template = ''
  let templateVariables = {}

  if (isProd) {
    template = 'account-verified'
    templateVariables = {
      firstName: user.firstName,
      setupLinkURL: passwordSetupLink,
    }
  } else {
    html = await loadEmailTemplate('Activate')

    html = replaceVariables(html, {
      firstName: user.firstName,
      setupLinkURL: passwordSetupLink,
    })
  }

  await sendEmail(user.email, title, html, template, templateVariables)
}

// REFUSE
export async function sendRejectedToUser(user: any) {
  let title = 'Votre demande a été refusée'

  let html = ''
  let template = ''
  let templateVariables = {}

  if (isProd) {
    template = 'account-rejected'
    templateVariables = {
      firstName: user.firstName,
    }
  } else {
    html = await loadEmailTemplate('Refuse')

    html = replaceVariables(html, {
      firstName: user.firstName,
    })
  }

  await sendEmail(user.email, title, html, template, templateVariables)
}

// RECOVERY
export async function sendRecoveryToUser(user: any, token: string) {
  const resetUrl = `${process.env.FRONTEND_URL}/login?token=${token}&mode=reset`
  let title = 'Réinitialisez votre mot de passe (valable 1h)'

  let html = ''
  let template = ''
  let templateVariables = {}

  if (isProd) {
    template = 'password-reset'
    templateVariables = {
      firstName: user.firstName,
      recoveryURL: resetUrl,
    }
  } else {
    html = await loadEmailTemplate('Recovery')

    html = replaceVariables(html, {
      firstName: user.firstName,
      recoveryURL: resetUrl,
    })
  }

  await sendEmail(user.email, title, html, template, templateVariables)
}
