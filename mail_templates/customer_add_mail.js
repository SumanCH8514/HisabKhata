import { APP_HOME_URL, renderHeader, renderFooter, wrapHtmlDoc } from './base.js';

export function renderCustomerAddedTemplate(data = {}) {
  const customer = data.customerName || data.toName || 'Valued Customer';
  const merchant = data.merchantName || 'Your Merchant';
  const actionUrl = data.actionUrl || APP_HOME_URL;

  const bodyContent = `
    ${renderHeader('Digital Account Advisory')}
    <tr>
      <td style="padding: 28px 24px;">
        <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
          Hello ${customer},
        </div>
        
        <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 20px 0;">
          <strong>${merchant}</strong> has opened a verified digital ledger for you on <strong>HisabKhata</strong> to give you transparent, 24/7 access to your transaction records, bills, and balance settlements.
        </p>

        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 22px;">
          <tr>
            <td style="padding: 18px 20px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 13px;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Merchant / Store:</td>
                  <td align="right" style="padding: 6px 0; color: #0f172a; font-weight: 700;">${merchant}</td>
                </tr>
                ${data.merchantPhone ? `
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Contact Phone:</td>
                  <td align="right" style="padding: 6px 0; color: #0f172a; font-weight: 700;">${data.merchantPhone}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Ledger Status:</td>
                  <td align="right" style="padding: 6px 0; color: #16a34a; font-weight: 700;">&#10003; Active &amp; Verified</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px; font-size: 13px; color: #166534; line-height: 1.5;">
          <strong>No app installation needed!</strong> You can click the link below at any time to inspect your live balance, download PDF statements, or make UPI payments directly.
        </div>

        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 12px 0;">
          <tr>
            <td align="center">
              <a href="${actionUrl}" target="_blank" style="display: inline-block; background-color: #0057BB; background: linear-gradient(135deg, #0057BB 0%, #00479e 100%); color: #ffffff !important; text-decoration: none; padding: 14px 34px; border-radius: 12px; font-size: 14px; font-weight: 700; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(0, 87, 187, 0.3);">
                View Your Live Ledger &rarr;
              </a>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
                Secure link to view your personal transaction statement
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${renderFooter()}`;

  return wrapHtmlDoc(bodyContent, `New HisabKhata Ledger - ${merchant}`);
}
