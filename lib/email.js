import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || 'admin@arcaccra.org';

export async function sendWelcomeEmail({ to, firstName, course }) {
  const appUrl = process.env.APP_URL || 'https://www.arcaccra.org';
  return resend.emails.send({
    from: `ARC Accra <${FROM}>`,
    to,
    subject: 'Welcome to the Accra Resource Center',
    html: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1FA0EF;padding:24px 16px;font-family:'Helvetica Neue',Arial,sans-serif;">
        <tr><td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
            <tr><td>
              <a href="${appUrl}/signin.html" style="display:block;">
                <img src="${appUrl}/assets/images/email/welcome-email.jpg" width="480" alt="Welcome to the Accra Resource Center, ${firstName || 'there'}! Your account has been created successfully." style="width:100%;max-width:480px;display:block;border-radius:12px;" />
              </a>
            </td></tr>
            <tr><td align="center" style="padding:24px 8px 0;">
              ${course ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#fff;">You've registered interest in <strong>${course}</strong> — we'll be in touch with cohort details soon.</p>` : ''}
              <a href="${appUrl}/signin.html" style="display:inline-block;background:#fff;color:#1FA0EF;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">Sign in to ARC →</a>
            </td></tr>
          </table>
        </td></tr>
      </table>
    `,
  });
}

export async function sendRegistrationEmail({ to, firstName, course }) {
  return resend.emails.send({
    from: `ARC Accra <${FROM}>`,
    to,
    subject: `Your ARC registration for ${course}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
        <h2>Registration confirmed, ${firstName}!</h2>
        <p>We've received your registration for <strong>${course}</strong>.</p>
        <p>Our team will review your application and reach out within 3–5 business days with next steps.</p>
        <p style="color:#888;font-size:.85rem;">— The ARC Team</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail({ to, firstName, resetUrl }) {
  return resend.emails.send({
    from: `ARC Accra <${FROM}>`,
    to,
    subject: 'Reset your ARC password',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
        <h2>Reset your password${firstName ? `, ${firstName}` : ''}</h2>
        <p>We received a request to reset your ARC account password. Click the button below to choose a new one — this link expires in 1 hour.</p>
        <p style="margin:1.5rem 0;">
          <a href="${resetUrl}" style="background:#6B4FD8;color:#fff;padding:.75rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;">Reset password</a>
        </p>
        <p style="color:#888;font-size:.85rem;">If you didn't request this, you can safely ignore this email — your password won't change.</p>
        <p style="color:#888;font-size:.85rem;">— The ARC Team</p>
      </div>
    `,
  });
}

export async function sendContactNotification({ name, email, message }) {
  return resend.emails.send({
    from: `ARC Website <${FROM}>`,
    to: FROM,
    replyTo: email,
    subject: `New enquiry from ${name}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
        <h3>New contact form submission</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong><br>${message.replace(/\n/g, '<br>')}</p>
      </div>
    `,
  });
}
