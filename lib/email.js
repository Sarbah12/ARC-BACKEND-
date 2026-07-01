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
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1FA0EF;padding:32px 16px;font-family:'Helvetica Neue',Arial,sans-serif;">
        <tr><td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
            <tr><td style="padding:40px 40px 32px;">
              <img src="${appUrl}/assets/images/arc-logo-color.png" alt="ARC" height="36" style="height:36px;width:auto;display:block;margin-bottom:32px;" />
              <h1 style="margin:0 0 24px;font-size:32px;line-height:1.25;font-weight:800;color:#111827;">
                Welcome to the <span style="color:#F07000;">Accra</span><br />
                <span style="color:#1FA0EF;">Resource</span> Center.
              </h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333;">Your account has been created successfully.</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333;">
                You can now <a href="${appUrl}/signin.html" style="color:#1FA0EF;font-weight:600;text-decoration:none;">sign in</a>,
                explore <a href="${appUrl}/programs.html" style="color:#1FA0EF;font-weight:600;text-decoration:none;">available courses</a>,
                manage your learning profile and continue your journey toward building valuable digital and professional skills.
              </p>
              ${course ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333;">You've registered interest in <strong>${course}</strong> — we'll be in touch with cohort details soon.</p>` : ''}
              <p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#333;">We are glad to have you as part of our growing learning community.</p>
              <p style="margin:0 0 4px;font-size:15px;font-style:italic;color:#333;">Thank you for choosing us.</p>
              <p style="margin:0;font-size:12px;font-style:italic;letter-spacing:.03em;color:#888;">AFIA OWUSU<br />EXECUTIVE DIRECTOR</p>
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
