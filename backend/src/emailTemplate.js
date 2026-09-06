/**
 * Generates high-fidelity HTML email template matching HisabKhata design system
 * Uses 100% inline CSS and HTML tables for universal email client compatibility (Gmail, Outlook, Apple Mail)
 */
export function generateEmailHtml({
    customerName,
    merchantName,
    merchantPhone,
    amount,
    balance,
    txType,
    description,
    actionUrl,
    customMessage
}) {
    const isGave = txType === 'Payment Requested' || txType === 'GAVE' || txType === 'credit' || (amount != null && Number(amount) < 0);
    const absAmount = amount != null ? Math.abs(Number(amount)).toLocaleString('en-IN') : '0';
    const absBalance = balance != null ? Math.abs(Number(balance)).toLocaleString('en-IN') : absAmount;
    const isBalanceDebit = balance != null ? Number(balance) < 0 : isGave;
    const merchant = merchantName || 'HisabKhata Merchant';
    const customer = customerName || 'Valued Customer';
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const formattedDesc = description 
        ? String(description).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>') 
        : '';

    const verifyUrl = actionUrl || 'https://hisabkhata.sumanonline.com/';

    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>HisabKhata Transaction Statement</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 24px 12px; margin: 0;">
    <tr>
      <td align="center" valign="top">
        
        <!-- Main Card Container -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
          
          <!-- Gradient Brand Header with Official App Icon -->
          <tr>
            <td align="center" bgcolor="#0057BB" style="background-color: #0057BB; background: linear-gradient(135deg, #0057BB 0%, #003a80 100%); padding: 30px 24px; text-align: center;">
              <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto;">
                <tr>
                  <td valign="middle" style="padding-right: 10px;">
                    <img src="https://hisabkhata.sumanonline.com/icons/icon-192x192.png" width="34" height="34" alt="HisabKhata" style="display: block; width: 34px; height: 34px; border-radius: 9px; vertical-align: middle; border: 0;" />
                  </td>
                  <td valign="middle" style="font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 28px;">
                    HisabKhata
                  </td>
                  <td valign="middle" style="padding-left: 8px;">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td bgcolor="#ef4444" style="background-color: #ef4444; color: #ffffff; font-size: 11px; font-weight: 800; padding: 3px 7px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; line-height: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                          PRO
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <div style="font-size: 12px; color: #bfdbfe; font-weight: 600; margin-top: 6px; letter-spacing: 0.3px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                A SumanOnline Project
              </div>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 28px 24px;">
              
              <!-- Greeting -->
              <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                Hello ${customer},
              </div>
              
              <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                ${customMessage || (isGave 
                    ? `A new transaction record has been updated by <strong>${merchant}</strong>.` 
                    : `Your payment was successfully received and recorded by <strong>${merchant}</strong>.`)}
              </p>

              <!-- Amount Highlight Card -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 22px;">
                <tr>
                  <td align="center" style="padding: 22px 16px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #64748b; margin-bottom: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                      ${isGave ? 'AMOUNT DUE (GAVE)' : 'PAYMENT RECEIVED (GOT)'}
                    </div>
                    <div style="font-size: 34px; font-weight: 900; color: ${isGave ? '#dc2626' : '#16a34a'}; margin: 0; letter-spacing: -1px; line-height: 1.2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                      &#8377;${absAmount}
                    </div>
                    <div style="margin-top: 8px;">
                      <table border="0" cellpadding="0" cellspacing="0" align="center">
                        <tr>
                          <td bgcolor="${isGave ? '#fee2e2' : '#dcfce7'}" style="background-color: ${isGave ? '#fee2e2' : '#dcfce7'}; color: ${isGave ? '#991b1b' : '#166534'}; font-size: 11px; font-weight: 700; padding: 4px 14px; border-radius: 9999px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                            ${isGave ? 'Payment Pending' : 'Payment Verified / Received'}
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Key Information Table -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 20px; font-size: 13px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
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
                ${merchantPhone ? `
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: 600;">
                    Merchant Contact:
                  </td>
                  <td align="right" style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 700;">
                    ${merchantPhone}
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

              <!-- Remarks / Details with line-breaks -->
              ${formattedDesc ? `
              <div style="margin-bottom: 20px;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 6px; letter-spacing: 0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                  Transaction Remarks &amp; Details:
                </div>
                <table width="100%" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background-color: #f8fafc; border-left: 4px solid #0057BB; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 13px; color: #334155; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                      ${formattedDesc}
                    </td>
                  </tr>
                </table>
              </div>` : ''}

              <!-- Verify Transaction Button Link -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 12px 0;">
                <tr>
                  <td align="center">
                    <a href="${verifyUrl}" target="_blank" style="display: inline-block; background-color: #0057BB; background: linear-gradient(135deg, #0057BB 0%, #00479e 100%); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 14px; font-weight: 700; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(0, 87, 187, 0.3); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                      Verify Transaction &rarr;
                    </a>
                    <div style="font-size: 11px; color: #94a3b8; margin-top: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                      Click to view verified ledger entry &amp; download PDF receipts
                    </div>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Appropriate Professional Email Footer -->
          <tr>
            <td align="center" bgcolor="#f8fafc" style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 20px; text-align: center;">
              <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 10px auto;">
                <tr>
                  <td bgcolor="#ecfdf5" style="background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; font-weight: 700; font-size: 10px; padding: 4px 12px; border-radius: 9999px; letter-spacing: 0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                    &#10003; VERIFIED DIGITAL STATEMENT
                  </td>
                </tr>
              </table>
              <div style="color: #475569; font-size: 11px; max-width: 440px; margin: 0 auto; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                This is an official automated transaction advisory generated by <a href="https://hisabkhata.sumanonline.com/" target="_blank" style="color: #0057BB; font-weight: 700; text-decoration: none;">HisabKhata</a> for real-time ledger accounting.
              </div>
              <div style="color: #94a3b8; font-size: 10px; margin-top: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                For any questions regarding this entry, please contact the merchant directly.
              </div>
              <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #64748b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
                &copy; <a href="https://hisabkhata.sumanonline.com/" target="_blank" style="color: #0057BB; font-weight: 700; text-decoration: none;">HisabKhata</a> &bull; A <a href="https://sumanonline.com" target="_blank" style="color: #0057BB; font-weight: 700; text-decoration: none;">SumanOnline</a> Project
              </div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`.trim();
}
