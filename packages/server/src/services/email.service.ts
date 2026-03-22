import nodemailer from 'nodemailer';

export interface EmailPayload {
  to: string[];
  subject: string;
  summary: string;
  actionItems: { description: string; assignee: string; dueDate: string }[];
}

function buildTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendMeetingSummaryEmail(payload: EmailPayload): Promise<void> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn('[email] SMTP not configured — skipping email send');
    return;
  }

  const actionRows = payload.actionItems
    .map(
      item => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #1e2235;">${item.description}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1e2235;">${item.assignee}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1e2235;">${item.dueDate}</td>
      </tr>`
    )
    .join('');

  const html = `
    <div style="font-family:sans-serif;background:#0d0f14;color:#f0f2f8;padding:32px;border-radius:12px;max-width:640px;margin:0 auto;">
      <h1 style="font-size:20px;color:#6c8aff;margin-bottom:4px;">Axythic Notes</h1>
      <h2 style="font-size:16px;color:#f0f2f8;margin-top:0;">${payload.subject}</h2>

      <h3 style="color:#9aa3bc;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Summary</h3>
      <p style="color:#f0f2f8;line-height:1.7;">${payload.summary.replace(/\n/g, '<br/>')}</p>

      ${
        payload.actionItems.length > 0
          ? `<h3 style="color:#9aa3bc;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Action Items</h3>
             <table style="width:100%;border-collapse:collapse;background:#13161e;border-radius:8px;overflow:hidden;">
               <thead>
                 <tr style="background:#1a1d28;">
                   <th style="padding:10px 12px;text-align:left;color:#9aa3bc;font-size:12px;">Task</th>
                   <th style="padding:10px 12px;text-align:left;color:#9aa3bc;font-size:12px;">Owner</th>
                   <th style="padding:10px 12px;text-align:left;color:#9aa3bc;font-size:12px;">Due</th>
                 </tr>
               </thead>
               <tbody>${actionRows}</tbody>
             </table>`
          : ''
      }

      <p style="margin-top:32px;font-size:11px;color:#5a6484;">Sent by Axythic Notes · AI-powered meeting assistant</p>
    </div>
  `;

  await buildTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: payload.to.join(', '),
    subject: payload.subject,
    html,
  });
}
