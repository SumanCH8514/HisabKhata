import { APP_HOME_URL, renderHeader, renderFooter, wrapHtmlDoc } from './base.js';

export function renderWeeklyNewsletterTemplate(data = {}) {
  const userName = data.userName || data.customerName || data.toName || 'Merchant';
  const totalCollections = data.totalCollections || data.collections != null ? Math.abs(Number(data.totalCollections || data.collections)).toLocaleString('en-IN') : '0.00';
  const activeCustomers = data.activeCustomers || data.customersCount || '0';
  const pendingSettlements = data.pendingSettlements || data.pending != null ? Math.abs(Number(data.pendingSettlements || data.pending)).toLocaleString('en-IN') : '0.00';
  const tip = data.proTip || data.tip || 'Share itemized PDF statements and UPI QR links with your customers on WhatsApp for 3x faster payment collections.';
  const actionUrl = data.actionUrl || `${APP_HOME_URL}admin`;

  const bodyContent = `
    ${renderHeader('Weekly Financial Digest')}
    <tr>
      <td style="padding: 30px 24px;">
        <div style="text-align: center; margin-bottom: 22px;">
          <div style="display: inline-block; font-size: 36px; margin-bottom: 6px;">📈</div>
          <div style="font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
            Your Weekly Ledger Snapshot
          </div>
          <div style="font-size: 13px; color: #64748b; margin-top: 4px;">
            Weekly insights, collections &amp; accounting performance
          </div>
        </div>

        <p style="font-size: 14px; color: #334155; line-height: 1.6; margin: 0 0 22px 0;">
          Hello <strong>${userName}</strong>, here is your business recap and accounting overview for the past week on HisabKhata:
        </p>

        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
          <tr>
            <td width="32%" bgcolor="#f0fdf4" style="background-color: #f0fdf4; border: 1px solid #dcfce7; border-radius: 12px; padding: 14px 10px; text-align: center; vertical-align: top;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #166534; letter-spacing: 0.5px;">
                Collected (GOT)
              </div>
              <div style="font-size: 18px; font-weight: 900; color: #16a34a; margin-top: 4px;">
                &#8377;${totalCollections}
              </div>
              <div style="font-size: 10px; color: #15803d; margin-top: 2px;">
                This Week
              </div>
            </td>
            <td width="2%">&nbsp;</td>
            <td width="32%" bgcolor="#eff6ff" style="background-color: #eff6ff; border: 1px solid #dbeafe; border-radius: 12px; padding: 14px 10px; text-align: center; vertical-align: top;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #1e40af; letter-spacing: 0.5px;">
                Active Ledgers
              </div>
              <div style="font-size: 18px; font-weight: 900; color: #0057BB; margin-top: 4px;">
                ${activeCustomers}
              </div>
              <div style="font-size: 10px; color: #2563eb; margin-top: 2px;">
                Customer Parties
              </div>
            </td>
            <td width="2%">&nbsp;</td>
            <td width="32%" bgcolor="#fff1f2" style="background-color: #fff1f2; border: 1px solid #ffe4e6; border-radius: 12px; padding: 14px 10px; text-align: center; vertical-align: top;">
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #9f1239; letter-spacing: 0.5px;">
                Pending Dues
              </div>
              <div style="font-size: 18px; font-weight: 900; color: #e11d48; margin-top: 4px;">
                &#8377;${pendingSettlements}
              </div>
              <div style="font-size: 10px; color: #be123c; margin-top: 2px;">
                To Collect
              </div>
            </td>
          </tr>
        </table>

        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-left: 4px solid #0057BB; border-radius: 0 10px 10px 0; margin-bottom: 24px;">
          <tr>
            <td style="padding: 14px 18px;">
              <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #0057BB; letter-spacing: 0.5px; margin-bottom: 4px;">
                💡 Pro Growth Tip for This Week
              </div>
              <div style="font-size: 13px; color: #334155; line-height: 1.5;">
                ${tip}
              </div>
            </td>
          </tr>
        </table>

        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
          <tr>
            <td style="font-size: 13px; font-weight: 700; color: #0f172a; padding-bottom: 6px;">
              🚀 What's New in HisabKhata PRO:
            </td>
          </tr>
          <tr>
            <td style="font-size: 12px; color: #475569; line-height: 1.6;">
              &bull; Instant QR Online Payments with automatic UTR reference verification.<br/>
              &bull; Filter transactions by Date range, Parties, and Got/Gave categories.<br/>
              &bull; High-speed Cloudflare Worker backend for sub-second email delivery.
            </td>
          </tr>
        </table>

        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 24px 0 12px 0;">
          <tr>
            <td align="center">
              <a href="${actionUrl}" target="_blank" style="display: inline-block; background-color: #0057BB; background: linear-gradient(135deg, #0057BB 0%, #00479e 100%); color: #ffffff !important; text-decoration: none; padding: 14px 34px; border-radius: 12px; font-size: 14px; font-weight: 700; letter-spacing: 0.3px; box-shadow: 0 4px 14px rgba(0, 87, 187, 0.3);">
                View Full Analytics in Dashboard &rarr;
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    ${renderFooter({
      badgeText: 'WEEKLY FINANCIAL DIGEST',
      badgeBg: '#f8fafc',
      badgeBorder: '#e2e8f0',
      badgeColor: '#475569',
      disclaimer: 'You are receiving this weekly digest because you are a registered merchant on HisabKhata.'
    })}`;

  return wrapHtmlDoc(bodyContent, 'HisabKhata Weekly Business & Ledger Digest');
}
