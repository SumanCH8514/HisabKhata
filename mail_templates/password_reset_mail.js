import { APP_HOME_URL, renderHeader, renderFooter, wrapHtmlDoc } from './base.js';

export function renderPasswordResetTemplate(data = {}) {
  const userName = data.userName || data.customerName || data.toName || 'User';
  const resetUrl = data.actionUrl || `${APP_HOME_URL}reset-password`;
  const expiry = data.expiry || '30 minutes';

  const bodyContent = `
    ${renderHeader('Account Security Advisory')}
    <tr>
      <td style="padding: 32px 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; font-size: 38px; margin-bottom: 8px;">🔒</div>
          <div style="font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
            Password Reset Request
          </div>
          <div style="font-size: 14px; color: #64748b; margin-top: 4px;">
            Secure access restoration for your HisabKhata account
          </div>
        </div>

        <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 20px 0;">
          Hello <strong>${userName}</strong>, we received a request to reset the password for your HisabKhata account. Click the button below to choose a new, secure password:
        </p>

        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 20px 0;">
          <tr>
            <td align="center">
              <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #0057BB; background: linear-gradient(135deg, #0057BB 0%, #00479e 100%); color: #ffffff !important; text-decoration: none; padding: 14px 36px; border-radius: 12px; font-size: 15px; font-weight: 700; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(0, 87, 187, 0.3);">
                Reset Your Password &rarr;
              </a>
            </td>
          </tr>
        </table>

        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 22px;">
          <tr>
            <td style="padding: 16px 20px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 12px; color: #64748b; line-height: 1.6;">
                <tr>
                  <td style="padding-bottom: 6px;">
                    ⏳ <strong>Link Expiration:</strong> This secure link will expire in <strong>${expiry}</strong>.
                  </td>
                </tr>
                <tr>
                  <td>
                    🛡️ <strong>Didn't request this?</strong> You can safely ignore this email. Your current password will remain unchanged and your account stays protected.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <div style="font-size: 11px; color: #94a3b8; word-break: break-all; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 14px;">
          If the button above does not work, copy and paste this link into your browser:<br/>
          <a href="${resetUrl}" target="_blank" style="color: #0057BB; text-decoration: underline;">${resetUrl}</a>
        </div>
      </td>
    </tr>
    ${renderFooter({
      badgeText: 'SECURITY VERIFICATION',
      badgeBg: '#fef2f2',
      badgeBorder: '#fecaca',
      badgeColor: '#991b1b',
      disclaimer: 'This is an official security advisory from HisabKhata. Never share your password or security tokens with anyone.'
    })}`;

  return wrapHtmlDoc(bodyContent, 'Password Reset Request - HisabKhata');
}
