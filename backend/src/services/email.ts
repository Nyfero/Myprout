// services/email.ts
import nodemailer from 'nodemailer';

// var transporter  = nodemailer.createTransport({
//   host: "sandbox.smtp.mailtrap.io",
//   port: 2525,
//   auth: {
//     user: process.env.MAILTRAP_USER,
//     pass: process.env.MAILTRAP_PASSWORD,
//   },
// });

const testAccount = await nodemailer.createTestAccount();
var transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

export async function sendApprovalEmailToAdmin(user: any) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPanelLink = `${process.env.FRONTEND_URL}/admin/users`;

  const info = await transporter.sendMail({
    from: '"myprout" <noreply@myprout.fr>',
    to: adminEmail,
    subject: `Nouveau compte en attente de validation : ${user.email}`,
    html: `
      <p>Un nouvel utilisateur s'est inscrit et attend votre validation :</p>
      <ul>
        <li><strong>Nom</strong>: ${user.firstName} ${user.lastName}</li>
        <li><strong>Email</strong>: ${user.email}</li>
      </ul>
      <p><a href="${adminPanelLink}">Accéder au panel d'administration</a></p>
    `,
  });

  console.log('[EMAIL PREVIEW]', nodemailer.getTestMessageUrl(info));
}

export async function sendPendingApprovalEmail(user: any) {
  const info = await transporter.sendMail({
    from: '"myprout" <noreply@myprout.fr>',
    to: user.email,
    subject: "Votre demande de création compte est en attente de validation",
    html: `
      <p>Bonjour ${user.firstName},</p>
      <p>Votre demande de création compte est en attente de validation par l'administrateur.</p>
      <p>Vous recevrez un email une fois votre demande de compte validé pour définir votre mot de passe.</p>
    `,
  });

  console.log('[EMAIL PREVIEW]', nodemailer.getTestMessageUrl(info));
}

export async function sendPasswordSetupEmail(user: any, token: string) {
  const passwordSetupLink = `${process.env.FRONTEND_URL}/login?token=${token}`;

  const info = await transporter.sendMail({
    from: '"myprout" <noreply@myprout.fr>',
    to: user.email,
    subject: "Définissez votre mot de passe",
    html: `
      <p>Bonjour ${user.firstName},</p>
      <p>Votre compte a été validé par l'administrateur. Vous pouvez maintenant définir votre mot de passe :</p>
      <p><a href="${passwordSetupLink}">Définir mon mot de passe</a></p>
      <p>Ce lien expire dans 1 semaine.</p>
    `,
  });

  console.log('[EMAIL PREVIEW]', nodemailer.getTestMessageUrl(info));
}

export async function sendRejectionEmail(user: any) {
    const info = await transporter.sendMail({
    from: '"myprout" <noreply@myprout.fr>',
    to: user.email,
    subject: "Votre demande a été refusé",
    html: `
      <p>Bonjour ${user.firstName},</p>
      <p>Votre demande de création compte a été refusé par l'administrateur.</p>
    `,
  });

  console.log('[EMAIL PREVIEW]', nodemailer.getTestMessageUrl(info));
}