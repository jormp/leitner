import nodemailer from 'nodemailer';
import { config } from './config.js';

const { host, port, user, pass, from } = config.smtp;
const smtpConfigured = Boolean(host && user && pass);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 587 usa STARTTLS
      auth: { user, pass },
    })
  : null;

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export async function sendVerificationEmail({ to, name, token }) {
  const link = `${config.appUrl}/verify-email?token=${encodeURIComponent(token)}`;

  if (!transporter) {
    console.warn('[mailer] SMTP no configurado. Enlace de verificación (solo desarrollo):', link);
    return;
  }

  await transporter.sendMail({
    from,
    to,
    subject: 'Verifica tu correo - Caja Leitner',
    text:
      `Hola ${name},\n\n` +
      `Gracias por registrarte en Caja Leitner. Para activar tu cuenta abre este enlace:\n\n${link}\n\n` +
      `El enlace caduca en ${config.verificationTtlHours} horas.\n` +
      `Si no has creado la cuenta, ignora este mensaje.`,
    html:
      `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">` +
      `<h2>Hola ${escapeHtml(name)} 👋</h2>` +
      `<p>Gracias por registrarte en <strong>Caja Leitner</strong>. Para activar tu cuenta, verifica tu correo:</p>` +
      `<p><a href="${link}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Verificar correo</a></p>` +
      `<p style="color:#555;font-size:13px">Si el botón no funciona, copia este enlace en tu navegador:<br>${link}</p>` +
      `<p style="color:#555;font-size:13px">El enlace caduca en ${config.verificationTtlHours} horas. Si no has creado la cuenta, ignora este mensaje.</p>` +
      `</div>`,
  });
}
