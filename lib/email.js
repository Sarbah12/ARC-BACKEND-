import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || 'admin@arcaccra.org';

// Sends a 6-digit verification code for a registration or enquiry.
// Returns true on success, false on failure (never throws).
export async function sendVerificationCode({ to, code, purpose = 'registration' }) {
  if (!process.env.RESEND_API_KEY) return false;
  const label = purpose === 'enquiry' ? 'enquiry' : 'registration';
  try {
    const { error } = await resend.emails.send({
      from: `ARC Accra <${FROM}>`,
      to,
      subject: `Your ARC verification code: ${code}`,
      text: `Your ARC ${label} verification code is ${code}. It expires in 10 minutes.\n\nIf you did not request this, you can ignore this email.`,
      html: `
        <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <h2 style="margin:0 0 8px;color:#1a1a2e;">Verify your email</h2>
          <p style="color:#555;margin:0 0 20px;">Use this code to complete your ARC ${label}. It expires in 10 minutes.</p>
          <div style="font-size:34px;letter-spacing:8px;font-weight:700;color:#5b2ee6;background:#f4f0ff;padding:18px;text-align:center;border-radius:12px;">${code}</div>
          <p style="color:#999;font-size:13px;margin:20px 0 0;">If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
    });
    if (error) { console.error('[sendVerificationCode]', error); return false; }
    return true;
  } catch (err) {
    console.error('[sendVerificationCode]', err.message || err);
    return false;
  }
}

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
              <a href="${appUrl}/programs.html" style="display:block;">
                <img src="${appUrl}/assets/images/email/welcome-email.jpg" width="480" alt="Welcome to the Accra Resource Center, ${firstName || 'there'}! Your account has been created successfully." style="width:100%;max-width:480px;display:block;border-radius:12px;" />
              </a>
            </td></tr>
            <tr><td align="center" style="padding:24px 8px 0;">
              ${course ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#fff;">You've registered interest in <strong>${course}</strong> — we'll be in touch with cohort details soon.</p>` : ''}
              <a href="${appUrl}/programs.html" style="display:inline-block;background:#fff;color:#1FA0EF;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">Explore our courses →</a>
            </td></tr>
          </table>
        </td></tr>
      </table>
    `,
  });
}

export async function sendRegistrationEmail({ to, firstName, course }) {
  const appUrl = process.env.APP_URL || 'https://www.arcaccra.org';
  return resend.emails.send({
    from: `ARC Accra <${FROM}>`,
    to,
    subject: `Your registration for ${course} — Accra Resource Center`,
    html: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1FA0EF;padding:24px 16px;font-family:'Helvetica Neue',Arial,sans-serif;">
        <tr><td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;">
            <tr><td style="padding:40px 40px 32px;">
              <img src="${appUrl}/assets/images/arc-logo-color.png" alt="ARC" height="32" style="height:32px;width:auto;display:block;margin-bottom:28px;" />
              <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;font-weight:800;color:#111827;">Thank you for registering for a course at the Accra Resource Center.</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333;">
                Your submission for <strong>${course}</strong> has been received successfully. Our team will review your details and contact you shortly with the next steps.
              </p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333;">
                We are excited to have you take this important step toward improving your skills, building your confidence and preparing yourself for new opportunities.
              </p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#333;">
                We look forward to welcoming you and supporting you throughout your learning journey.
              </p>
              <p style="margin:0 0 4px;font-size:15px;font-style:italic;color:#333;">Thank you for choosing us.</p>
              <p style="margin:0;font-size:12px;font-style:italic;letter-spacing:.03em;color:#888;">AFIA OWUSU<br />EXECUTIVE DIRECTOR</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
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
