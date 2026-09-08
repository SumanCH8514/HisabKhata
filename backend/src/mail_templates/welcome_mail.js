import { APP_HOME_URL, renderHeader, renderFooter, wrapHtmlDoc } from './base.js';

export function renderWelcomeTemplate(data = {}) {
  const userName = data.customerName || data.toName || data.name || 'Merchant';
  const actionUrl = data.actionUrl || `${APP_HOME_URL}login`;

  const bodyContent = `
    ${renderHeader('Smart Digital Ledger Platform')}
    <tr>
      <td style="padding: 32px 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; font-size: 38px; margin-bottom: 8px;">🎉</div>
          <div style="font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
            Welcome to HisabKhata!
          </div>
          <div style="font-size: 14px; color: #64748b; margin-top: 4px;">
            Your modern financial ledger &amp; credit accounting companion
          </div>
        </div>

        <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 20px 0;">
          Hello <strong>${userName}</strong>, welcome aboard! We are thrilled to empower your business with instant credit tracking, customer online payments, and automated financial statements.
        </p>

        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin-bottom: 24px; padding: 16px;">
          <tr>
            <td style="padding: 10px 8px; vertical-align: top;" width="36">
              <span style="font-size: 20px;">📒</span>
            </td>
            <td style="padding: 10px 8px;">
              <div style="font-size: 13px; font-weight: 700; color: #0f172a;">Real-Time Credit &amp; Debit Tracking</div>
              <div style="font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 2px;">Record Got (Credit) &amp; Gave (Debit) entries with instant calculation of balances.</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 8px; vertical-align: top; border-top: 1px solid #edf2f7;" width="36">
              <span style="font-size: 20px;">💳</span>
            </td>
            <td style="padding: 10px 8px; border-top: 1px solid #edf2f7;">
              <div style="font-size: 13px; font-weight: 700; color: #0f172a;">Customer Online UPI Collection</div>
              <div style="font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 2px;">Share live ledger links allowing customers to pay directly via UPI and upload UTR proof.</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 8px; vertical-align: top; border-top: 1px solid #edf2f7;" width="36">
              <span style="font-size: 20px;">📑</span>
            </td>
            <td style="padding: 10px 8px; border-top: 1px solid #edf2f7;">
              <div style="font-size: 13px; font-weight: 700; color: #0f172a;">Professional PDF Reports &amp; Reminders</div>
              <div style="font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 2px;">Download itemized GST/audit-ready statements and send friendly payment reminders in 1-click.</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 8px; vertical-align: top; border-top: 1px solid #edf2f7;" width="36">
              <span style="font-size: 20px;">🛡️</span>
            </td>
            <td style="padding: 10px 8px; border-top: 1px solid #edf2f7;">
              <div style="font-size: 13px; font-weight: 700; color: #0f172a;">Cloud-Synced &amp; 100% Secure</div>
              <div style="font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 2px;">Your transactions and party records are safely backed up with encrypted cloud storage.</div>
            </td>
          </tr>
        </table>

        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 16px 0;">
          <tr>
            <td align="center">
              <a href="${actionUrl}" target="_blank" style="display: inline-block; background-color: #0057BB; background: linear-gradient(135deg, #0057BB 0%, #00479e 100%); color: #ffffff !important; text-decoration: none; padding: 14px 36px; border-radius: 12px; font-size: 15px; font-weight: 700; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(0, 87, 187, 0.3);">
                Go to Your Dashboard &rarr;
              </a>
              <div style="font-size: 12px; color: #94a3b8; margin-top: 10px;">
                Start adding customers and recording daily transactions
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${renderFooter({
      badgeText: 'VERIFIED ONBOARDING',
      badgeBg: '#eff6ff',
      badgeBorder: '#bfdbfe',
      badgeColor: '#1e40af',
      disclaimer: 'Welcome to HisabKhata by SumanOnline. If you did not create this account, please ignore this email.'
    })}`;

  return wrapHtmlDoc(bodyContent, 'Welcome to HisabKhata - Smart Digital Ledger');
}
