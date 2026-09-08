import { APP_HOME_URL, renderHeader, renderFooter, wrapHtmlDoc } from './base.js';

export function renderPaymentReminderTemplate(data = {}) {
  const customer = data.customerName || data.customer_name || data.toName || data.to_name || 'Valued Customer';
  const merchant = data.merchantName || data.businessName || data.merchant_name || data.business_name || 'Your Merchant';
  const balance = data.balance != null ? Math.abs(Number(data.balance)).toLocaleString('en-IN') : '0';
  const dueDate = data.dueDate || data.due_date || '';
  const actionUrl = data.actionUrl || data.action_url || APP_HOME_URL;

  const bodyContent = `
    ${renderHeader('Payment Settlement Reminder')}
    <tr>
      <td style="padding: 28px 24px;">
        <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
          Hello ${customer},
        </div>
        
        <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 20px 0;">
          This is a friendly reminder regarding your outstanding balance with <strong>${merchant}</strong>. Please find the statement summary below:
        </p>

        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #fff1f2; border: 1px solid #ffe4e6; border-radius: 12px; margin-bottom: 22px;">
          <tr>
            <td align="center" style="padding: 22px 16px;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #e11d48; margin-bottom: 4px;">
                OUTSTANDING BALANCE DUE
              </div>
              <div style="font-size: 34px; font-weight: 900; color: #e11d48; margin: 0; letter-spacing: -1px; line-height: 1.2;">
                &#8377;${balance}
              </div>
              ${dueDate ? `
              <div style="margin-top: 8px; font-size: 12px; color: #9f1239; font-weight: 600;">
                Due Date: ${dueDate}
              </div>` : ''}
            </td>
          </tr>
        </table>

        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 20px; font-size: 13px;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;">Payee / Merchant:</td>
            <td align="right" style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 700;">${merchant}</td>
          </tr>
          ${data.merchantPhone ? `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;">Merchant Contact:</td>
            <td align="right" style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 700;">${data.merchantPhone}</td>
          </tr>` : ''}
        </table>

        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 12px 0;">
          <tr>
            <td align="center">
              <a href="${actionUrl}" target="_blank" style="display: inline-block; background-color: #0057BB; background: linear-gradient(135deg, #0057BB 0%, #00479e 100%); color: #ffffff !important; text-decoration: none; padding: 14px 34px; border-radius: 12px; font-size: 14px; font-weight: 700; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(0, 87, 187, 0.3);">
                Pay Now / View Statement &rarr;
              </a>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
                Click to pay via UPI QR or view itemized transaction bills
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${renderFooter({
      badgeText: 'PAYMENT ADVISORY',
      badgeBg: '#fff1f2',
      badgeBorder: '#fecdd3',
      badgeColor: '#be123c'
    })}`;

  return wrapHtmlDoc(bodyContent, `Payment Reminder: ₹${balance} due to ${merchant}`);
}
