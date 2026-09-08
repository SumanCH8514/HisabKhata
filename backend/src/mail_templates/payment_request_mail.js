import { APP_HOME_URL, renderHeader, renderFooter, wrapHtmlDoc } from './base.js';

export function renderPaymentVerificationTemplate(data = {}) {
  const customer = data.customerName || 'Customer';
  const merchant = data.merchantName || 'Merchant';
  const amount = data.amount != null ? Math.abs(Number(data.amount)).toLocaleString('en-IN') : '0';
  const txRef = data.transactionId || data.utr || 'Not Provided';
  const actionUrl = data.actionUrl || `${APP_HOME_URL}admin`;
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const bodyContent = `
    ${renderHeader('Online Payment Alert')}
    <tr>
      <td style="padding: 28px 24px;">
        <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
          Hello ${merchant},
        </div>
        
        <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 20px 0;">
          <strong>${customer}</strong> has submitted an online payment proof for verification and ledger settlement.
        </p>

        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; margin-bottom: 22px;">
          <tr>
            <td align="center" style="padding: 22px 16px;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #b45309; margin-bottom: 4px;">
                SUBMITTED ONLINE PAYMENT
              </div>
              <div style="font-size: 34px; font-weight: 900; color: #0057BB; margin: 0; letter-spacing: -1px; line-height: 1.2;">
                &#8377;${amount}
              </div>
              <div style="margin-top: 8px;">
                <table border="0" cellpadding="0" cellspacing="0" align="center">
                  <tr>
                    <td bgcolor="#fef3c7" style="background-color: #fef3c7; color: #92400e; font-size: 11px; font-weight: 700; padding: 4px 14px; border-radius: 9999px; border: 1px solid #fde68a;">
                      Pending Merchant Approval
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
        </table>

        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 20px; font-size: 13px;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;">Customer Name:</td>
            <td align="right" style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 700;">${customer}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;">Transaction Ref / UTR:</td>
            <td align="right" style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0057BB; font-family: monospace; font-weight: 700;">${txRef}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;">Submitted Time:</td>
            <td align="right" style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 700;">${dateStr}, ${timeStr}</td>
          </tr>
        </table>

        <div style="background-color: #f8fafc; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px; font-size: 12px; color: #475569; line-height: 1.5;">
          <strong>Action Required:</strong> Verify the UTR / Ref in your bank account or UPI app, then click below to approve and automatically credit the customer's ledger.
        </div>

        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 12px 0;">
          <tr>
            <td align="center">
              <a href="${actionUrl}" target="_blank" style="display: inline-block; background-color: #0057BB; background: linear-gradient(135deg, #0057BB 0%, #00479e 100%); color: #ffffff !important; text-decoration: none; padding: 14px 34px; border-radius: 12px; font-size: 14px; font-weight: 700; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(0, 87, 187, 0.3);">
                Review &amp; Approve Payment &rarr;
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${renderFooter({
      badgeText: 'PAYMENT VERIFICATION REQUEST',
      badgeBg: '#fef3c7',
      badgeBorder: '#fde68a',
      badgeColor: '#92400e'
    })}`;

  return wrapHtmlDoc(bodyContent, `Payment Verification: ₹${amount} from ${customer}`);
}
