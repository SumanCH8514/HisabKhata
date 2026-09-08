import { APP_HOME_URL, renderHeader, renderFooter, wrapHtmlDoc } from './base.js';

export function renderTransactionTemplate(data = {}) {
  const isGave = data.txType === 'Payment Requested' || data.txType === 'GAVE' || data.txType === 'Credit Given' || data.txType === 'credit' || (data.amount != null && Number(data.amount) < 0);
  const absAmount = data.amount != null ? Math.abs(Number(data.amount)).toLocaleString('en-IN') : '0';
  const absBalance = data.balance != null ? Math.abs(Number(data.balance)).toLocaleString('en-IN') : absAmount;
  const isBalanceDebit = data.balance != null ? Number(data.balance) < 0 : isGave;
  const merchant = data.merchantName || data.businessName || data.merchant_name || data.business_name || 'HisabKhata Merchant';
  const customer = data.customerName || data.customer_name || data.toName || data.to_name || 'Valued Customer';
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const verifyUrl = data.actionUrl || data.action_url || APP_HOME_URL;

  const rawDesc = data.description || data.note || data.remarks || '';
  const formattedDesc = rawDesc 
    ? String(rawDesc).replace(/^Note:\s*/i, '').replace(/^Note:\s*/i, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>') 
    : '';

  const bodyContent = `
    ${renderHeader('Digital Ledger Advisory')}
    <tr>
      <td style="padding: 28px 24px;">
        <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
          Hello ${customer},
        </div>
        
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
          A new transaction amount of <strong>&#8377;${absAmount}</strong> has been recorded on your account. Please check the details below:
        </p>

        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 22px;">
          <tr>
            <td align="center" style="padding: 22px 16px;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #64748b; margin-bottom: 4px;">
                ${isGave ? 'AMOUNT DUE (GAVE / DEBIT)' : 'PAYMENT RECEIVED (GOT / CREDIT)'}
              </div>
              <div style="font-size: 34px; font-weight: 900; color: ${isGave ? '#dc2626' : '#16a34a'}; margin: 0; letter-spacing: -1px; line-height: 1.2;">
                &#8377;${absAmount}
              </div>
              <div style="margin-top: 8px;">
                <table border="0" cellpadding="0" cellspacing="0" align="center">
                  <tr>
                    <td bgcolor="${isGave ? '#fee2e2' : '#dcfce7'}" style="background-color: ${isGave ? '#fee2e2' : '#dcfce7'}; color: ${isGave ? '#991b1b' : '#166534'}; font-size: 11px; font-weight: 700; padding: 4px 14px; border-radius: 9999px;">
                      ${isGave ? 'Debit Recorded' : 'Credit Settled / Received'}
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
        </table>

        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 20px; font-size: 13px;">
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;">
              Current Net Balance:
            </td>
            <td align="right" style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 700;">
              &#8377;${absBalance} ${isBalanceDebit ? '(Dr / Due)' : '(Cr / Advance)'}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;">
              Merchant Name:
            </td>
            <td align="right" style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 700;">
              ${merchant}
            </td>
          </tr>
          ${data.merchantPhone || data.merchant_phone ? `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;">
              Merchant Contact:
            </td>
            <td align="right" style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 700;">
              ${data.merchantPhone || data.merchant_phone}
            </td>
          </tr>` : ''}
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;">
              Date &amp; Time:
            </td>
            <td align="right" style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 700;">
              ${dateStr}, ${timeStr}
            </td>
          </tr>
        </table>

        ${formattedDesc ? `
        <div style="margin-bottom: 20px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 6px; letter-spacing: 0.5px;">
            Transaction Remarks &amp; Details:
          </div>
          <table width="100%" border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background-color: #f8fafc; border-left: 4px solid #0057BB; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 13px; color: #334155; line-height: 1.6;">
                ${formattedDesc}
              </td>
            </tr>
          </table>
        </div>` : ''}

        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 12px 0;">
          <tr>
            <td align="center">
              <a href="${verifyUrl}" target="_blank" style="display: inline-block; background-color: #0057BB; background: linear-gradient(135deg, #0057BB 0%, #00479e 100%); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 14px; font-weight: 700; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(0, 87, 187, 0.3);">
                Verify Transaction &rarr;
              </a>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
                Click to view verified ledger entry &amp; download PDF statement
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${renderFooter()}`;

  return wrapHtmlDoc(bodyContent, `HisabKhata Transaction Statement - ₹${absAmount}`);
}
