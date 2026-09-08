import { BRAND_LOGO_URL, APP_HOME_URL, SUMAN_ONLINE_URL, renderHeader, renderFooter, wrapHtmlDoc } from './base.js';
import { renderWelcomeTemplate } from './welcome_mail.js';
import { renderOtpVerificationTemplate } from './otp_verify.js';
import { renderTransactionTemplate } from './transaction_mail.js';
import { renderCustomerAddedTemplate } from './customer_add_mail.js';
import { renderPaymentVerificationTemplate } from './payment_request_mail.js';
import { renderPaymentReminderTemplate } from './payment_reminder_mail.js';
import { renderPasswordResetTemplate } from './password_reset_mail.js';
import { renderWeeklyNewsletterTemplate } from './weekly_report_mail.js';
import { renderTestTemplate } from './test_mail.js';

export {
  BRAND_LOGO_URL,
  APP_HOME_URL,
  SUMAN_ONLINE_URL,
  renderHeader,
  renderFooter,
  wrapHtmlDoc,
  renderWelcomeTemplate,
  renderOtpVerificationTemplate,
  renderOtpVerificationTemplate as renderOtpTemplate,
  renderTransactionTemplate,
  renderCustomerAddedTemplate,
  renderPaymentVerificationTemplate,
  renderPaymentReminderTemplate,
  renderPasswordResetTemplate,
  renderWeeklyNewsletterTemplate,
  renderWeeklyNewsletterTemplate as renderWeeklyReportTemplate,
  renderTestTemplate
};

export function generateEmailHtml(data = {}) {
  const type = String(data.type || data.template || data.txType || '').toUpperCase();

  if (type === 'WELCOME' || type === 'ONBOARDING') {
    return renderWelcomeTemplate(data);
  }
  
  if (type === 'CUSTOMER_ADDED' || type === 'NEW_CUSTOMER') {
    return renderCustomerAddedTemplate(data);
  }

  if (type === 'PAYMENT_VERIFY' || type === 'PAYMENT_VERIFICATION' || type === 'ONLINE_PAYMENT' || type === 'PAYMENT_REQUEST') {
    return renderPaymentVerificationTemplate(data);
  }

  if (type === 'REMINDER' || type === 'PAYMENT_REMINDER' || type === 'DUE_ALERT') {
    return renderPaymentReminderTemplate(data);
  }

  if (type === 'PASSWORD_RESET' || type === 'RESET_PASSWORD' || type === 'FORGOT_PASSWORD') {
    return renderPasswordResetTemplate(data);
  }

  if (type === 'OTP' || type === 'OTP_VERIFICATION' || type === 'VERIFY_OTP' || type === 'AUTH_CODE' || type === 'LOGIN_OTP' || type === 'EMAIL_OTP' || type === 'SECURITY_OTP' || type === 'ALERT_OTP' || data.otp != null || data.loginOtp != null) {
    return renderOtpVerificationTemplate(data);
  }

  if (type === 'WEEKLY_NEWSLETTER' || type === 'NEWSLETTER' || type === 'WEEKLY_DIGEST' || type === 'DIGEST' || type === 'WEEKLY_REPORT') {
    return renderWeeklyNewsletterTemplate(data);
  }

  if (type === 'TEST' || type === 'TEST_EMAIL') {
    return renderTestTemplate(data);
  }

  return renderTransactionTemplate(data);
}
