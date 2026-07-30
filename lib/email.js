const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM || 'onboarding@resend.dev';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendEmail({ to, subject, html }) {
  if (!RESEND_API_KEY) {
    console.log(`[email:dev] RESEND_API_KEY not set, skipping send.\nTo: ${to}\nSubject: ${subject}\n${html}`);
    return { skipped: true };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Resend email failed:', res.status, text);
  }
  return res;
}

function sendWelcomeEmail(user) {
  return sendEmail({
    to: user.email,
    subject: '歡迎加入昱柔SPA蘆洲徐匯店',
    html: `<p>${escapeHtml(user.name)} 你好,</p><p>歡迎成為昱柔SPA蘆洲徐匯店的會員,期待陪你重新愛自己。</p><p>你可以隨時到會員中心線上預約服務。</p>`,
  });
}

function sendPasswordResetEmail(user, resetUrl) {
  return sendEmail({
    to: user.email,
    subject: '重設密碼 - 昱柔SPA蘆洲徐匯店',
    html: `<p>${escapeHtml(user.name)} 你好,</p><p>請點擊以下連結重設密碼(1 小時內有效):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>若非本人操作,請忽略此信。</p>`,
  });
}

function sendBookingConfirmationEmail(user, booking) {
  return sendEmail({
    to: user.email,
    subject: '預約已收到 - 昱柔SPA蘆洲徐匯店',
    html: `<p>${escapeHtml(user.name)} 你好,</p><p>已收到你的預約申請:</p><ul><li>服務項目:${escapeHtml(booking.service)}</li><li>希望日期:${escapeHtml(booking.preferred_date)}</li></ul><p>我們會盡快與你確認時間,謝謝你的耐心等候。</p>`,
  });
}

function sendBookingAdminNotification(adminEmail, user, booking) {
  return sendEmail({
    to: adminEmail,
    subject: `新預約通知 - ${user.name}`,
    html: `<p>有新的預約申請:</p><ul><li>會員:${escapeHtml(user.name)} (${escapeHtml(user.email)})</li><li>服務項目:${escapeHtml(booking.service)}</li><li>希望日期:${escapeHtml(booking.preferred_date)}</li><li>備註:${escapeHtml(booking.note || '無')}</li></ul>`,
  });
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendBookingConfirmationEmail,
  sendBookingAdminNotification,
};
