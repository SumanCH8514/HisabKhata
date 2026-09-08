import { renderHeader, renderFooter, wrapHtmlDoc } from './base.js';

export function renderOtpVerificationTemplate(data = {}) {
  const userName = data.userName || data.customerName || data.toName || 'User';
  const otpCode = String(data.otp || data.code || data.otpCode || '000000').trim();
  const purpose = data.purpose || 'account authentication';
  const expiry = data.expiry || '10 minutes';

  const bodyContent = `
    ${renderHeader('One-Time Security Code')}
    <tr>
      <td style="padding: 32px 24px; text-align: center;">
        <div style="font-size: 38px; margin-bottom: 8px;">🛡️</div>
        <div style="font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; margin-bottom: 4px;">
          Your Verification Code
        </div>
        <div style="font-size: 14px; color: #64748b; margin-bottom: 24px;">
          Use the OTP below to complete your ${purpose}
        </div>

        <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 24px 0; text-align: left;">
          Hello <strong>${userName}</strong>, here is your one-time verification code:
        </p>

        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f0f9ff; border: 2px dashed #0057BB; border-radius: 14px; margin-bottom: 22px;">
          <tr>
            <td align="center" style="padding: 24px 16px;">
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #0369a1; margin-bottom: 8px;">
                ONE-TIME PASSWORD (OTP)
              </div>
              <div style="font-size: 36px; font-weight: 900; color: #0057BB; letter-spacing: 10px; padding-left: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Courier New', Courier, monospace; line-height: 1.2; user-select: all; -webkit-user-select: all;">${otpCode}</div>
              <div style="margin-top: 10px;">
                <table border="0" cellpadding="0" cellspacing="0" align="center">
                  <tr>
                    <td bgcolor="#e0f2fe" style="background-color: #e0f2fe; color: #0284c7; font-size: 11px; font-weight: 700; padding: 4px 14px; border-radius: 9999px;">
                      ⏳ Valid for ${expiry}
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
        </table>

        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 10px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 12px 16px; text-align: left; font-size: 12px; color: #92400e; line-height: 1.5;">
              ⚠️ <strong>Security Notice:</strong> Never share this OTP with anyone, including HisabKhata support or staff. We will never ask for your verification code.
            </td>
          </tr>
        </table>

        <div style="font-size: 12px; color: #94a3b8; text-align: left; line-height: 1.5;">
          If you did not initiate this verification request, please change your account password immediately to secure your ledger.
        </div>
      </td>
    </tr>
    ${renderFooter({
      badgeText: 'ONE-TIME AUTHENTICATION',
      badgeBg: '#eff6ff',
      badgeBorder: '#bfdbfe',
      badgeColor: '#1e40af',
      disclaimer: 'This is an automated authentication advisory from HisabKhata.'
    })}`;

  return wrapHtmlDoc(bodyContent, `Your HisabKhata Verification Code: ${otpCode}`);
}
