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
  const isGave = txType === 'Payment Requested' || txType === 'GAVE' || txType === 'credit' || (amount && amount < 0);
  const absAmount = amount != null ? Math.abs(amount).toLocaleString('en-IN') : '0';
  const absBalance = balance != null ? Math.abs(balance).toLocaleString('en-IN') : absAmount;
  const isBalanceDebit = balance != null ? balance < 0 : isGave;
  const merchant = merchantName || 'HisabKhata Merchant';
  const customer = customerName || 'Valued Customer';
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HisabKhata Statement</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
    .container { max-width: 580px; margin: 24px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0057BB 0%, #00418c 100%); padding: 32px 28px; text-align: center; color: #ffffff; }
    .brand-title { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin: 0; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
    .pro-badge { background-color: #e53935; color: #ffffff; font-size: 10px; font-weight: 800; padding: 3px 6px; border-radius: 4px; vertical-align: middle; }
    .brand-sub { font-size: 11px; color: #bfdbfe; font-weight: 600; margin-top: 4px; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 8px; }
    .message-text { font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
    .amount-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 24px; text-align: center; margin-bottom: 24px; }
    .amount-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 6px; }
    .amount-val { font-size: 32px; font-weight: 900; color: ${isGave ? '#dc2626' : '#16a34a'}; margin: 0; letter-spacing: -1px; }
    .status-badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 9999px; background-color: ${isGave ? '#fee2e2' : '#dcfce7'}; color: ${isGave ? '#991b1b' : '#166534'}; margin-top: 8px; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
    .info-table td { padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
    .info-label { color: #64748b; font-weight: 600; }
    .info-val { color: #0f172a; font-weight: 700; text-align: right; }
    .notes-box { background-color: #f8fafc; border-left: 4px solid #0057BB; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px; font-size: 13px; color: #334155; line-height: 1.5; white-space: pre-wrap; }
    .btn-container { text-align: center; margin: 32px 0 16px; }
    .btn-primary { display: inline-block; background-color: #0057BB; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 14px; font-weight: 700; box-shadow: 0 4px 12px rgba(0, 87, 187, 0.25); }
    .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.6; }
    .footer-badge { display: inline-block; padding: 3px 10px; background-color: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; font-weight: 700; font-size: 10px; border-radius: 9999px; margin-bottom: 10px; }
    .footer-link { color: #0057BB; font-weight: 700; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand-title">
        <span>HisabKhata</span>
        <span class="pro-badge">PRO</span>
      </div>
      <div class="brand-sub">a SumanOnline Project</div>
    </div>

    <div class="content">
      <div class="greeting">Hello ${customer},</div>
      <p class="message-text">
        ${customMessage || (isGave
      ? `A payment update has been recorded by <strong>${merchant}</strong>.`
      : `Your payment was successfully received and updated by <strong>${merchant}</strong>.`)}
      </p>

      <div class="amount-card">
        <div class="amount-label">${isGave ? 'Amount Due (Gave)' : 'Payment Received (Got)'}</div>
        <div class="amount-val">₹${absAmount}</div>
        <div class="status-badge">${isGave ? 'Payment Pending' : 'Payment Verified / Received'}</div>
      </div>

      <table class="info-table">
        <tr>
          <td class="info-label">Current Net Balance:</td>
          <td class="info-val">₹${absBalance} ${isBalanceDebit ? '(Dr / Due)' : '(Cr / Advance)'}</td>
        </tr>
        <tr>
          <td class="info-label">Merchant Name:</td>
          <td class="info-val">${merchant}</td>
        </tr>
        ${merchantPhone ? `
        <tr>
          <td class="info-label">Merchant Contact:</td>
          <td class="info-val">${merchantPhone}</td>
        </tr>` : ''}
        <tr>
          <td class="info-label">Date & Time:</td>
          <td class="info-val">${dateStr}, ${timeStr}</td>
        </tr>
      </table>

      ${description ? `
      <div>
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 6px;">Transaction Remarks & Details:</div>
        <div class="notes-box">${description}</div>
      </div>` : ''}

      ${actionUrl ? `
      <div class="btn-container">
        <a href="${actionUrl}" target="_blank" class="btn-primary">
          View Complete Live Statement & Receipts →
        </a>
      </div>` : ''}
    </div>

    <div class="footer">
      <div>
        <span class="footer-badge">✓ VERIFIED DIGITAL STATEMENT</span>
      </div>
      <div>This automated notification is provided for real-time ledger transparency.</div>
      <div style="margin-top: 6px;">
        Platform by <a href="https://sumanonline.com" target="_blank" class="footer-link">SumanOnline.Com</a>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
}
