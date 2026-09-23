import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ArrowRight,
  Download,
  Smartphone,
  Menu,
  X,
  ChevronDown,
  Check,
  CheckCircle2,
  MessageCircle,
  QrCode,
  FileText,
  Cloud,
  Lock,
  Calendar,
  Share2,
  Send,
  AlertCircle,
  XCircle,
  Phone,
  Mail,
  Settings,
  ArrowUpRight,
  ArrowDownLeft,
  Image as ImageIcon,
  Info,
  Link2,
  MessageSquare,
  ArrowLeft,
  Video,
  MoreVertical
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePWAInstall } from '../utils/pwaUtils';
import logo from '../assets/HisabKhata_logo.png';
import '../styles/LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [openFaq, setOpenFaq] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { canInstall, isInstalled, triggerInstall } = usePWAInstall();
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [settlementChannel, setSettlementChannel] = useState('whatsapp');

  const handleDownloadApp = async () => {
    if (isInstalled) {
      navigate('/customers');
      return;
    }
    if (canInstall) {
      const outcome = await triggerInstall();
      if (outcome) {
        navigate('/customers');
      }
    } else {
      setShowInstallGuide(true);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const nav = document.querySelector('.landing-page nav');
      if (nav) {
        if (window.scrollY > 30) {
          nav.classList.add('nav-scrolled');
        } else {
          nav.classList.remove('nav-scrolled');
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="landing-page">
      <nav>
        <div className="container nav-container">
          <Link to="/" className="logo" aria-label="HisabKhata Home">
            <img src={logo} alt="HisabKhata" width="145" height="42" className="nav-logo-img" />
          </Link>

          <div className="nav-links desktop-only">
            <a href="#ledger-preview">How It Works</a>
            <a href="#comparison">Notes vs Digital</a>
            <a href="#features">Features</a>
            <a href="#faq">FAQs</a>
          </div>

          <div className="nav-actions desktop-only">
            {currentUser ? (
              <button className="btn btn-secondary" onClick={() => navigate('/customers')}>
                Open Khata
              </button>
            ) : (
              <>
                <button className="btn btn-secondary" onClick={() => navigate('/login')}>
                  Login
                </button>
                <button className="btn btn-primary" onClick={() => navigate('/signup')}>
                  Start Free Khata
                </button>
              </>
            )}
            <button className="btn btn-download-nav" onClick={handleDownloadApp} title="Install HisabKhata">
              <Download className="w-4 h-4 mr-1.5" />
              <span>{isInstalled ? 'App Ready' : 'Install App'}</span>
            </button>
          </div>

          <div className="mobile-nav-actions mobile-only">
            <button
              className="btn btn-secondary btn-mobile-login"
              onClick={() => navigate(currentUser ? '/customers' : '/login')}
            >
              {currentUser ? 'Open Khata' : 'Login'}
            </button>
            <button
              className="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="mobile-nav-drawer">
            <div className="container mobile-nav-content">
              <a href="#ledger-preview" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
              <a href="#comparison" onClick={() => setMobileMenuOpen(false)}>Notes vs Digital</a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQs</a>
              <div className="mobile-nav-cta">
                {currentUser ? (
                  <button className="btn btn-primary w-full" onClick={() => { setMobileMenuOpen(false); navigate('/customers'); }}>
                    Open My Khata
                  </button>
                ) : (
                  <button className="btn btn-primary w-full" onClick={() => { setMobileMenuOpen(false); navigate('/signup'); }}>
                    Create Free Account
                  </button>
                )}
                <button className="btn btn-download-nav w-full" onClick={() => { setMobileMenuOpen(false); handleDownloadApp(); }}>
                  <Download className="w-4 h-4 mr-1.5" />
                  <span>{isInstalled ? 'App Ready' : 'Install on Phone'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div className="hero-text-col">
              <h1>
                HisabKhata Pro, <br />
                <span className="text-highlight">Apna Personal Hisab-Kitab</span>
              </h1>

              <p className="hero-desc">
                The smart, private digital ledger for personal expense tracking and lending hisab. Easily track where your money goes, manage money lent or borrowed with friends and flatmates, and send polite WhatsApp reminders with UPI links.
              </p>

              <div className="hero-perks-list">
                <div className="hero-perk-item">
                  <div className="perk-icon-circle">
                    <Check className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <span><strong>Track Daily Spends:</strong> Know where your money goes with quick notes &amp; photo bills</span>
                </div>
                <div className="hero-perk-item">
                  <div className="perk-icon-circle">
                    <Check className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <span><strong>Friend Lending Hisab:</strong> Never forget who gave or got money for rent, trips, or dining</span>
                </div>
                <div className="hero-perk-item">
                  <div className="perk-icon-circle">
                    <Check className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <span><strong>Polite Reminders:</strong> Settle up smoothly on WhatsApp with direct UPI payment links</span>
                </div>
              </div>

              <div className="hero-btn-row">
                {currentUser ? (
                  <button className="btn btn-hero-main" onClick={() => navigate('/customers')}>
                    <span>Open My Khata Book</span>
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </button>
                ) : (
                  <button className="btn btn-hero-main" onClick={() => navigate('/signup')}>
                    <span>Start Free (No Credit Card)</span>
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </button>
                )}
                <button className="btn btn-hero-sub" onClick={handleDownloadApp}>
                  <Download className="w-5 h-5 mr-2 text-blue-700" />
                  <span>{isInstalled ? 'App Installed' : 'Install on Phone (PWA)'}</span>
                </button>
              </div>

              <div className="hero-checks-container">
                <div className="hero-checks-track">
                  <div className="check-item">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>100% Free Lifetime</span>
                  </div>
                  <div className="check-item">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Works without Internet</span>
                  </div>
                  <div className="check-item">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Automatic Cloud Backup</span>
                  </div>
                  <div className="check-item mobile-only-check">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>100% Free Lifetime</span>
                  </div>
                  <div className="check-item mobile-only-check">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Works without Internet</span>
                  </div>
                  <div className="check-item mobile-only-check">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Automatic Cloud Backup</span>
                  </div>
                </div>
              </div>

              <div className="hero-trust-badge">
                <div className="trust-avatar-group">
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=64&h=64&q=80" alt="User" className="trust-avatar" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%230284c7'/%3E%3Ctext x='50%25' y='55%25' text-anchor='middle' dominant-baseline='middle' fill='%23fff' font-family='sans-serif' font-weight='bold' font-size='14'%3EU1%3C/text%3E%3C/svg%3E"; }} />
                  <img src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=64&h=64&q=80" alt="User" className="trust-avatar" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%230d9488'/%3E%3Ctext x='50%25' y='55%25' text-anchor='middle' dominant-baseline='middle' fill='%23fff' font-family='sans-serif' font-weight='bold' font-size='14'%3EU2%3C/text%3E%3C/svg%3E"; }} />
                  <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=64&h=64&q=80" alt="User" className="trust-avatar" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23f59e0b'/%3E%3Ctext x='50%25' y='55%25' text-anchor='middle' dominant-baseline='middle' fill='%23fff' font-family='sans-serif' font-weight='bold' font-size='14'%3EU3%3C/text%3E%3C/svg%3E"; }} />
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=64&h=64&q=80" alt="User" className="trust-avatar" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%236366f1'/%3E%3Ctext x='50%25' y='55%25' text-anchor='middle' dominant-baseline='middle' fill='%23fff' font-family='sans-serif' font-weight='bold' font-size='14'%3EU4%3C/text%3E%3C/svg%3E"; }} />
                  <span className="trust-avatar-count">+25k</span>
                </div>
                <div className="trust-meta">
                  <div className="trust-stars">
                    <span className="star-icons">★★★★★</span>
                    <span className="star-score">4.9/5</span>
                  </div>
                  <span className="trust-label">Trusted by 25,000+ users across India</span>
                </div>
              </div>
            </div>

            <div className="hero-card-col">
              <div className="ledger-card-preview" id="ledger-preview">
                <div className="preview-ledger-header">
                  <div className="customer-main-info">
                    <div className="customer-avatar-wrap">
                      <img
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80"
                        alt="Rajesh Kumar"
                        className="customer-avatar-img"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%230057BB'/%3E%3Ctext x='50%25' y='55%25' text-anchor='middle' dominant-baseline='middle' fill='%23fff' font-family='sans-serif' font-weight='bold' font-size='15'%3ERK%3C/text%3E%3C/svg%3E";
                        }}
                      />
                    </div>
                    <div className="customer-text-meta">
                      <span className="customer-name">Rajesh Kumar</span>
                      <span className="customer-phone">+91 98765 43210</span>
                    </div>
                  </div>
                  <div className="customer-quick-actions">
                    <button type="button" className="circle-action-btn action-report" title="Statement PDF">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </button>
                    <button type="button" className="circle-action-btn" title="Call">
                      <Phone className="w-4 h-4 text-gray-500" />
                    </button>
                    <button type="button" className="circle-action-btn" title="Email">
                      <Mail className="w-4 h-4 text-gray-500" />
                    </button>
                    <button type="button" className="circle-action-btn" title="Settings">
                      <Settings className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>

                <div className="preview-due-balance-bar">
                  <div className="due-date-chip">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>Due in 9 days (29 Sept 2026)</span>
                    <span className="chip-close">×</span>
                  </div>
                  <div className="net-balance-summary">
                    <span className="net-balance-label">NET BALANCE:</span>
                    <span className="net-balance-amount">You'll Get: ₹12,420</span>
                  </div>
                </div>

                <div className="preview-reminder-bar">
                  <div className="reminder-title-box">
                    <span>SEND REMINDER</span>
                    <Info className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                  <div className="reminder-buttons-scroll">
                    <button type="button" className="reminder-chip chip-report">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Report</span>
                    </button>
                    <button type="button" className="reminder-chip chip-wa">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                      <span>WhatsApp</span>
                    </button>
                    <button type="button" className="reminder-chip chip-sms">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>SMS</span>
                    </button>
                    <button type="button" className="reminder-chip chip-email">
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email</span>
                    </button>
                    <button type="button" className="reminder-chip chip-link">
                      <Link2 className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </button>
                  </div>
                </div>

                <div className="preview-table-header">
                  <div className="th-entries">ENTRIES</div>
                  <div className="th-gave">YOU GAVE</div>
                  <div className="th-got">YOU GOT</div>
                </div>

                <div className="preview-entries-body custom-scrollbar">
                  <div className="preview-entry-item">
                    <div className="entry-col-main">
                      <div className="entry-timestamp">19 Sept 2026 • 11:30 AM</div>
                      <div className="entry-sub-meta">
                        <span className="entry-bal">Balance: -12,420</span>
                        <span className="entry-attachment-badge">
                          <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                        </span>
                      </div>
                      <div className="entry-narrative">
                        Weekend Roadtrip &amp; Hotel booking split
                      </div>
                    </div>
                    <div className="entry-col-gave">
                      <span className="amount-val gave-val">₹3,420</span>
                    </div>
                    <div className="entry-col-got">
                      <span className="amount-empty">-</span>
                    </div>
                  </div>

                  <div className="preview-entry-item">
                    <div className="entry-col-main">
                      <div className="entry-timestamp">17 Sept 2026 • 06:15 PM</div>
                      <div className="entry-sub-meta">
                        <span className="entry-bal">Balance: -9,000</span>
                        <span className="entry-attachment-badge">
                          <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                        </span>
                      </div>
                      <div className="entry-narrative">
                        Shared Dinner at BBQ Nation &amp; Cab fare
                      </div>
                    </div>
                    <div className="entry-col-gave">
                      <span className="amount-val gave-val">₹4,500</span>
                    </div>
                    <div className="entry-col-got">
                      <span className="amount-empty">-</span>
                    </div>
                  </div>

                  <div className="preview-entry-item">
                    <div className="entry-col-main">
                      <div className="entry-timestamp">14 Sept 2026 • 01:20 PM</div>
                      <div className="entry-sub-meta">
                        <span className="entry-bal">Balance: -4,500</span>
                      </div>
                      <div className="entry-narrative">
                        Partial settlement received via PhonePe UPI
                      </div>
                    </div>
                    <div className="entry-col-gave">
                      <span className="amount-empty">-</span>
                    </div>
                    <div className="entry-col-got">
                      <span className="amount-val got-val">₹5,000</span>
                    </div>
                  </div>

                  <div className="preview-entry-item">
                    <div className="entry-col-main">
                      <div className="entry-timestamp">10 Sept 2026 • 04:45 PM</div>
                      <div className="entry-sub-meta">
                        <span className="entry-bal">Balance: -9,500</span>
                        <span className="entry-attachment-badge">
                          <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                        </span>
                      </div>
                      <div className="entry-narrative">
                        Concert tickets &amp; Event passes advance
                      </div>
                    </div>
                    <div className="entry-col-gave">
                      <span className="amount-val gave-val">₹4,000</span>
                    </div>
                    <div className="entry-col-got">
                      <span className="amount-empty">-</span>
                    </div>
                  </div>

                  <div className="preview-entry-item">
                    <div className="entry-col-main">
                      <div className="entry-timestamp">01 Sept 2026 • 10:00 AM</div>
                      <div className="entry-sub-meta">
                        <span className="entry-bal">Balance: -5,500</span>
                      </div>
                      <div className="entry-narrative">
                        Emergency personal loan advance for laptop repair
                      </div>
                    </div>
                    <div className="entry-col-gave">
                      <span className="amount-val gave-val">₹5,500</span>
                    </div>
                    <div className="entry-col-got">
                      <span className="amount-empty">-</span>
                    </div>
                  </div>
                </div>

                <div className="preview-bottom-actions">
                  <button type="button" className="preview-btn-gave">
                    <ArrowUpRight className="w-4 h-4 text-red-600" />
                    <span>You Gave ₹</span>
                  </button>
                  <button type="button" className="preview-btn-got">
                    <ArrowDownLeft className="w-4 h-4 text-green-700" />
                    <span>You Got ₹</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="merchant-types-bar">
          <div className="container">
            <p className="merchant-bar-title">Trusted for personal expense tracking, friend loans &amp; everyday hisab</p>
          </div>
          <div className="merchant-marquee-container">
            <div className="merchant-marquee-track marquee-row-1">
              <span className="m-type-badge"><span className="badge-dot dot-blue"></span><span>Personal Daily Expenses</span></span>
              <span className="m-type-badge"><span className="badge-dot dot-emerald"></span><span>Lending &amp; Borrowing (Udhar)</span></span>
              <span className="m-type-badge"><span className="badge-dot dot-indigo"></span><span>Flatmates &amp; Room Rent Split</span></span>
              <span className="m-type-badge"><span className="badge-dot dot-purple"></span><span>Personal Digital Ledger</span></span>
              <span className="m-type-badge"><span className="badge-dot dot-amber"></span><span>Group Trips &amp; Dinners</span></span>
              <span className="m-type-badge"><span className="badge-dot dot-blue"></span><span>Freelancers &amp; Client Work</span></span>
              <span className="m-type-badge"><span className="badge-dot dot-rose"></span><span>Family &amp; Household Budget</span></span>
              <span className="m-type-badge"><span className="badge-dot dot-blue"></span><span>Personal Daily Expenses</span></span>
              <span className="m-type-badge"><span className="badge-dot dot-emerald"></span><span>Lending &amp; Borrowing (Udhar)</span></span>
              <span className="m-type-badge"><span className="badge-dot dot-indigo"></span><span>Flatmates &amp; Room Rent Split</span></span>
              <span className="m-type-badge"><span className="badge-dot dot-purple"></span><span>Personal Digital Ledger</span></span>
              <span className="m-type-badge"><span className="badge-dot dot-amber"></span><span>Group Trips &amp; Dinners</span></span>
              <span className="m-type-badge"><span className="badge-dot dot-blue"></span><span>Freelancers &amp; Client Work</span></span>
              <span className="m-type-badge"><span className="badge-dot dot-rose"></span><span>Family &amp; Household Budget</span></span>
            </div>
            <div className="merchant-marquee-track marquee-row-2">
              <span className="m-type-badge"><span className="badge-dot dot-emerald"></span><span>Personal Expense Tracker</span></span>
              <span className="m-type-badge"><span className="badge-dot dot-amber"></span><span>Colleagues &amp; Office Chai-Snacks</span></span>
              <span className="m-type-badge"><span className="badge-dot dot-blue"></span><span>Personal Lending HisabKhata</span></span>
              <span className="m-type-badge"><span className="badge-dot dot-purple"></span><span>Shared Apartment Expenses</span></span>
              <span className="m-type-badge"><span className="badge-dot dot-rose"></span><span>Emergency Cash Advances</span></span>
              <span className="m-type-badge"><span className="badge-dot dot-indigo"></span><span>For Our Community</span></span>
              <span className="m-type-badge"><span className="badge-dot dot-emerald"></span><span>Instant UPI Settlement</span></span>
              <span className="m-type-badge"><span className="badge-dot dot-emerald"></span><span>Personal Expense Tracker</span></span>
              <span className="m-type-badge"><span className="badge-dot dot-amber"></span><span>Colleagues &amp; Office Chai-Snacks</span></span>
              <span className="m-type-badge"><span className="badge-dot dot-blue"></span><span>Personal Lending HisabKhata</span></span>
              <span className="m-type-badge"><span className="badge-dot dot-purple"></span><span>Shared Apartment Expenses</span></span>
              <span className="m-type-badge"><span className="badge-dot dot-rose"></span><span>Emergency Cash Advances</span></span>
              <span className="m-type-badge"><span className="badge-dot dot-indigo"></span><span>For Our Community</span></span>
              <span className="m-type-badge"><span className="badge-dot dot-emerald"></span><span>Instant UPI Settlement</span></span>
            </div>
          </div>
        </section>

        <section className="comparison-section" id="comparison">
          <div className="container">
            <div className="section-head">
              <h2>Why People Switched from Messy Notes &amp; Memory to HisabKhata Pro</h2>
              <p>Tracking expenses in messy phone notes, WhatsApp chats, or mental calculation leads to forgotten loans and awkward conversations. HisabKhata Pro brings clarity to every rupee.</p>
            </div>

            <div className="comparison-cards-grid">
              <div className="comp-card comp-paper">
                <div className="comp-card-head text-rose-700 bg-rose-50 border-rose-100">
                  <XCircle className="w-5 h-5 mr-2" />
                  <span>Old Manual Method (Notes &amp; Diary)</span>
                </div>
                <ul className="comp-list">
                  <li>
                    <span className="bullet-x">✕</span>
                    <div>
                      <strong>Forgotten Loans &amp; Borrows:</strong> Money lent to friends or colleagues without a structured record gets forgotten, causing silent financial loss.
                    </div>
                  </li>
                  <li>
                    <span className="bullet-x">✕</span>
                    <div>
                      <strong>Confusing Split Calculations:</strong> Splitting vacation bills, flat rent, or group dinners manually in chat groups causes confusion and disputes.
                    </div>
                  </li>
                  <li>
                    <span className="bullet-x">✕</span>
                    <div>
                      <strong>Awkward Money Reminders:</strong> Asking friends, relatives, or roommates to return money feels uncomfortable without a clear statement breakdown.
                    </div>
                  </li>
                  <li>
                    <span className="bullet-x">✕</span>
                    <div>
                      <strong>Zero Spending Clarity:</strong> Without automated running balances, you lose track of monthly spends and wonder where your money went.
                    </div>
                  </li>
                </ul>
              </div>

              <div className="comp-card comp-digital">
                <div className="comp-card-head text-blue-700 bg-blue-50 border-blue-100">
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  <span>HisabKhata Digital Ledger</span>
                </div>
                <ul className="comp-list">
                  <li>
                    <span className="bullet-check">✓</span>
                    <div>
                      <strong>100% Safe Cloud Backup:</strong> Every expense and lending record is synced securely to your private cloud; never lose history even if you switch phones.
                    </div>
                  </li>
                  <li>
                    <span className="bullet-check">✓</span>
                    <div>
                      <strong>Instant &amp; Accurate Net Balances:</strong> Real-time Gave vs Got running totals with date stamps, categorization, and receipt attachments.
                    </div>
                  </li>
                  <li>
                    <span className="bullet-check">✓</span>
                    <div>
                      <strong>Polite 1-Tap WhatsApp Reminders:</strong> Friends receive clear, respectful breakdowns with 1-tap UPI payment links so you settle up without friction.
                    </div>
                  </li>
                  <li>
                    <span className="bullet-check">✓</span>
                    <div>
                      <strong>Works Anywhere, Even Offline:</strong> Record personal spends on flights, road trips, or basements without internet; syncs automatically when online.
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="features-section" id="features">
          <div className="container">
            <div className="section-head">
              <h2>Built for Your Everyday Personal Expenses &amp; Lending</h2>
              <p>Everything you need to track personal spending, manage shared expenses, and settle accounts effortlessly.</p>
            </div>

            <div className="features-three-grid">
              <div className="feat-box">
                <div className="feat-icon-wrap bg-blue-50 text-blue-700">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3>1-Tap Expense &amp; Lending Entry</h3>
                <p>Record Gave (money lent / spent) or Got (money received) in 3 seconds. Attach bill photos, add notes, and see updated balances instantly.</p>
              </div>

              <div className="feat-box">
                <div className="feat-icon-wrap bg-emerald-50 text-emerald-700">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <h3>WhatsApp Payment Reminders</h3>
                <p>Send a polite pre-written WhatsApp message with the exact pending amount and your direct payment link with a single tap.</p>
              </div>

              <div className="feat-box">
                <div className="feat-icon-wrap bg-indigo-50 text-indigo-700">
                  <QrCode className="w-6 h-6" />
                </div>
                <h3>Dynamic UPI QR Code</h3>
                <p>Generate exact-amount QR codes so friends can scan and pay back with PhonePe, Google Pay, Paytm, or BHIM without typing amounts manually.</p>
              </div>

              <div className="feat-box">
                <div className="feat-icon-wrap bg-purple-50 text-purple-700">
                  <FileText className="w-6 h-6" />
                </div>
                <h3>Date-Wise PDF Statements</h3>
                <p>Download clean, organized account statements for trips, shared flats, or individual lending history. Share them directly on WhatsApp.</p>
              </div>

              <div className="feat-box">
                <div className="feat-icon-wrap bg-amber-50 text-amber-700">
                  <Cloud className="w-6 h-6" />
                </div>
                <h3>Works Completely Offline</h3>
                <p>No signal while traveling or out with friends? HisabKhata works offline without lagging and synchronizes with the cloud when reconnected.</p>
              </div>

              <div className="feat-box">
                <div className="feat-icon-wrap bg-slate-100 text-slate-800">
                  <Lock className="w-6 h-6" />
                </div>
                <h3>Encrypted &amp; Strictly Private</h3>
                <p>Your personal finances and contacts belong solely to you. Everything is encrypted with bank-standard AES-256 security and never shared.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="whatsapp-spotlight" id="settlement-spotlight">
          <div className="container spotlight-grid">
            <div className="spotlight-text">
              <span className="spotlight-tag">Hassle-Free Settlements</span>
              <h2>Get Back Money Lent to Friends &amp; Flatmates Without Awkwardness</h2>
              <p>
                Asking friends or roommates to return money or clear shared trip bills can feel awkward.
                HisabKhata lets you send transparent, polite reminders via WhatsApp or formal Email statements with live transaction breakdowns and 1-tap UPI payment links.
              </p>

              <ul className="spotlight-bullets">
                <li>
                  <Check className="w-5 h-5 text-emerald-600 mr-2 flex-shrink-0" />
                  <span>Send 1-tap polite reminders via WhatsApp or formal PDF Email statements</span>
                </li>
                <li>
                  <Check className="w-5 h-5 text-emerald-600 mr-2 flex-shrink-0" />
                  <span>Friends see complete itemized breakdown &amp; attached receipts without disputes</span>
                </li>
                <li>
                  <Check className="w-5 h-5 text-emerald-600 mr-2 flex-shrink-0" />
                  <span>1-Click opens PhonePe, GPay, or Paytm with exact amount pre-filled</span>
                </li>
                <li>
                  <Check className="w-5 h-5 text-emerald-600 mr-2 flex-shrink-0" />
                  <span>Money settles directly into your own bank account with 0% fees</span>
                </li>
              </ul>
            </div>

            <div className="spotlight-mockup">
              <div className="settlement-channel-tabs" role="tablist" aria-label="Settlement Channels">
                <button
                  type="button"
                  role="tab"
                  aria-selected={settlementChannel === 'whatsapp'}
                  onClick={() => setSettlementChannel('whatsapp')}
                  className={`channel-tab-pill ${settlementChannel === 'whatsapp' ? 'active-wa' : ''}`}
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span className="tab-pill-label">WhatsApp Reminder</span>
                  {settlementChannel === 'whatsapp' && <span className="channel-active-dot" />}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={settlementChannel === 'email'}
                  onClick={() => setSettlementChannel('email')}
                  className={`channel-tab-pill ${settlementChannel === 'email' ? 'active-email' : ''}`}
                >
                  <Mail className="w-4 h-4 shrink-0" />
                  <span className="tab-pill-label">Email Statement</span>
                  {settlementChannel === 'email' && <span className="channel-active-dot" />}
                </button>
              </div>

              {settlementChannel === 'whatsapp' ? (
                <div className="wa-device-frame">
                  <div className="wa-app-header">
                    <div className="wa-header-left">
                      <ArrowLeft className="w-5 h-5 text-slate-300 cursor-pointer" />
                      <div className="wa-header-avatar">
                        <img
                          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80"
                          alt="Rajesh Kumar"
                          className="wa-avatar-img"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%230057BB'/%3E%3Ctext x='50%25' y='55%25' text-anchor='middle' dominant-baseline='middle' fill='%23fff' font-family='sans-serif' font-weight='bold' font-size='15'%3ERK%3C/text%3E%3C/svg%3E";
                          }}
                        />
                      </div>
                      <div className="wa-header-meta">
                        <span className="wa-header-name">Rajesh Kumar</span>
                        <span className="wa-header-status">online</span>
                      </div>
                    </div>
                    <div className="wa-header-right">
                      <Video className="w-4 h-4 text-slate-300 cursor-pointer" />
                      <Phone className="w-4 h-4 text-slate-300 cursor-pointer" />
                      <MoreVertical className="w-4 h-4 text-slate-300 cursor-pointer" />
                    </div>
                  </div>

                  <div className="wa-chat-canvas">
                    <div className="wa-message-bubble outgoing">
                      <div className="wa-bubble-top-row">
                        <div className="wa-bubble-dropdown">
                          <ChevronDown className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      <div className="wa-link-preview-box">
                        <div className="wa-preview-meta">
                          <span className="wa-preview-title">HisabKhata - Free Billing, Digital Udhaar Book &amp; Shop Ledger App</span>
                          <span className="wa-preview-snippet">India's #1 free billing software, digital bahi khata &amp; shop management</span>
                          <span className="wa-preview-domain">hisabkhata.sumanonline.com</span>
                        </div>
                      </div>

                      <div className="wa-msg-content">
                        <p className="wa-msg-line">👋 Hello Rajesh Kumar,</p>

                        <p className="wa-msg-line wa-msg-alert">📢 Payment Reminder from HisabKhata Web</p>

                        <div className="wa-msg-balance-group">
                          <p className="wa-msg-line">Your outstanding balance is:</p>
                          <p className="wa-msg-amount">₹12,420.00</p>
                          <p className="wa-msg-line wa-due-line">📅 Due Date: 29 Sept 2026</p>
                        </div>

                        <div className="wa-msg-link-group">
                          <p className="wa-msg-line">🔗 View your full digital statement here:</p>
                          <p className="wa-msg-url">https://hisabkhata.sumanonline.com/customer/share/-Oro5tDKNU1gXysKcA8h</p>
                        </div>

                        <p className="wa-msg-line wa-msg-closing">🙏 Please verify your transactions and clear dues. Thank you!</p>

                        <div className="wa-meta-row">
                          <span className="wa-time">9:01 pm</span>
                          <span className="wa-ticks">✓✓</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="email-device-frame">
                  <div className="email-app-header">
                    <div className="email-header-left">
                      <ArrowLeft className="w-5 h-5 text-slate-300 cursor-pointer" />
                      <div className="email-header-avatar">
                        <img
                          src="/icons/icon-192x192.png"
                          alt="HisabKhata"
                          className="email-header-avatar-img"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%230057BB'/%3E%3Ctext x='50%25' y='55%25' text-anchor='middle' dominant-baseline='middle' fill='%23fff' font-family='sans-serif' font-weight='bold' font-size='14'%3EHK%3C/text%3E%3C/svg%3E";
                          }}
                        />
                      </div>
                      <div className="email-header-meta">
                        <div className="email-header-from-row">
                          <span className="email-header-name">HisabKhata PRO</span>
                          <span className="email-header-badge">Inbox</span>
                        </div>
                        <span className="email-header-status">to rajesh.kumar@gmail.com</span>
                      </div>
                    </div>
                    <div className="email-header-right">
                      <span className="email-header-time">14:30</span>
                      <MoreVertical className="w-4 h-4 text-slate-300 cursor-pointer" />
                    </div>
                  </div>

                  <div className="email-chat-canvas">
                    <div className="email-inner-card">
                      <div className="email-brand-banner">
                        <div className="email-brand-header-row">
                          <img
                            src="/icons/icon-192x192.png"
                            alt="HisabKhata"
                            className="email-brand-logo-img"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          <span className="email-brand-logo-text">HisabKhata</span>
                          <span className="email-brand-pro-pill">PRO</span>
                        </div>
                        <p className="email-brand-subheading">Payment Settlement Reminder</p>
                      </div>

                      <div className="email-body-text">
                        <p className="email-salutation">Hello <strong>Rajesh Kumar</strong>,</p>
                        <p className="email-desc">
                          Friendly reminder regarding your outstanding balance with <strong>SumanOnline Demo</strong>:
                        </p>

                        <div className="email-amount-card">
                          <span className="email-due-tag">OUTSTANDING BALANCE DUE</span>
                          <div className="email-due-sum">₹12,420.00</div>
                          <div className="email-due-date-val">📅 Due Date: 29 Sept 2026</div>
                        </div>

                        <div className="email-merchant-meta">
                          <div className="email-meta-line">
                            <span className="email-meta-label">Payee / Merchant:</span>
                            <span className="email-meta-value">SumanOnline Demo</span>
                          </div>
                          <div className="email-meta-line">
                            <span className="email-meta-label">Merchant Contact:</span>
                            <span className="email-meta-value">+91 98765 43210</span>
                          </div>
                        </div>

                        <div className="email-cta-center">
                          <a href="#ledger-preview" className="email-pay-btn">
                            <span>Pay Now / View Statement &rarr;</span>
                          </a>
                          <p className="email-cta-hint">Click to pay via UPI QR or view itemized transaction bills</p>
                        </div>

                        <div className="email-advisory-box">
                          <div className="email-advisory-pill-wrap">
                            <span className="email-advisory-pill">&#10003; PAYMENT ADVISORY</span>
                          </div>
                          <p className="email-advisory-p1">
                            Official automated notification for real-time digital ledger accounting.
                          </p>
                          <p className="email-advisory-footer">
                            &copy; <strong>HisabKhata</strong> &bull; A <strong>SumanOnline</strong> Project
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="faq-section" id="faq">
          <div className="container">
            <div className="section-head">
              <h2>Frequently Asked Questions</h2>
              <p>Clear answers about using HisabKhata Pro for personal expenses and lending hisab.</p>
            </div>

            <div className="faq-list">
              {[
                {
                  q: "Is HisabKhata Pro completely free for personal use?",
                  a: "Yes, HisabKhata Pro is 100% free for lifetime. There are no subscription fees, no limits on transactions, and no hidden charges. You can track daily spending and manage lending hisab for as many friends and contacts as you need."
                },
                {
                  q: "How does it help with tracking money lent to friends or flatmates?",
                  a: "Whenever you lend money or pay a shared bill (rent, groceries, vacation, dinner), record it in 'You Gave'. When they pay you back, record 'You Got'. You always have an accurate net balance and can send polite WhatsApp reminders with 1-click UPI links."
                },
                {
                  q: "Can I use it as a daily personal expense tracker?",
                  a: "Yes! You can record daily personal spends, categorize your expenses, attach photo receipts or bills, and view running totals to stay on top of your monthly budget."
                },
                {
                  q: "What happens if my phone gets lost, damaged, or replaced?",
                  a: "Your data is safe and stored securely in the private cloud. If you switch phones, simply log in with your account, and your entire personal expense and lending history restores immediately."
                },
                {
                  q: "Do my friends need to install the HisabKhata app to see their statement?",
                  a: "No. When you share a WhatsApp reminder or statement, your friends open a clean, mobile-optimized web link in their browser. They can view the breakdown and settle up directly using Google Pay, PhonePe, or Paytm without installing anything."
                },
                {
                  q: "Can I use HisabKhata Pro when I don't have internet access?",
                  a: "Yes. HisabKhata Pro works completely offline. Whether you are traveling, in a basement parking, or have poor network, you can add entries without delay. Everything automatically syncs to the cloud when you reconnect."
                },
                {
                  q: "Can I download and share PDF statements of trip or room expenses?",
                  a: "Yes. You can generate custom date-wise PDF statements with full breakdowns, dates, and running balances with one tap to share in WhatsApp groups or with roommates."
                }
              ].map((item, index) => (
                <div
                  key={index}
                  className={`faq-item ${openFaq === index ? 'faq-item-open' : ''}`}
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <button className="faq-trigger" aria-expanded={openFaq === index}>
                    <span>{item.q}</span>
                    <ChevronDown className={`faq-arrow ${openFaq === index ? 'arrow-up' : ''}`} />
                  </button>
                  {openFaq === index && (
                    <div className="faq-body">
                      <p>{item.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="cta-banner">
          <div className="container text-center">
            <h2>Take Control of Your Personal Expenses &amp; Lending Hisab</h2>
            <p className="cta-sub">Join thousands of individuals who have simplified their daily money tracking with HisabKhata Pro.</p>
            <div className="cta-button-row">
              <button className="btn btn-cta-white" onClick={() => navigate(currentUser ? '/customers' : '/signup')}>
                <span>{currentUser ? 'Go to My Khata' : 'Start Free Personal Khata'}</span>
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
              <button className="btn btn-cta-outline" onClick={handleDownloadApp}>
                <Download className="w-5 h-5 mr-2" />
                <span>{isInstalled ? 'App Ready' : 'Install App on Phone'}</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="container">
          <div className="footer-columns">
            <div className="footer-col-about">
              <Link to="/" className="footer-logo-link" aria-label="HisabKhata Home">
                <img src={logo} alt="HisabKhata" width="130" height="38" className="footer-logo-img" />
              </Link>
              <p className="footer-desc">
                The smart digital ledger and personal expense tracker. Manage daily spending, track money lent or borrowed, and settle up effortlessly across India.
              </p>
              <div className="footer-social-links">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="Facebook">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                </a>
                <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="X (Twitter)">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="Instagram">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                </a>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="YouTube">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="LinkedIn">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.761-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                </a>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="social-icon-btn" aria-label="GitHub">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg>
                </a>
              </div>
            </div>

            <div className="footer-col">
              <h4>Features</h4>
              <ul>
                <li><a href="#ledger-preview">Personal Expense Ledger</a></li>
                <li><a href="#settlement-spotlight">WhatsApp &amp; Email Reminders</a></li>
                <li><a href="#features">Dynamic UPI QR Collection</a></li>
                <li><a href="#features">Date-Wise PDF Statements</a></li>
                <li><a href="#features">Offline Bahi Khata Mode</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Legal &amp; Trust</h4>
              <ul>
                <li><Link to="/privacy-policy">Privacy Policy</Link></li>
                <li><Link to="/terms-of-condition">Terms of Service</Link></li>
                <li><a href="#faq">Frequently Asked Questions</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Contact &amp; Support</h4>
              <ul className="footer-contact-list">
                <li>
                  <a href="mailto:hisabkhata@sumanonline.com" className="footer-contact-link">
                    <Mail className="w-4 h-4 shrink-0 text-blue-400" />
                    <span>hisabkhata@sumanonline.com</span>
                  </a>
                </li>
                <li>
                  <a href="tel:+918918153949" className="footer-contact-link">
                    <Phone className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>+91 8918153949</span>
                  </a>
                </li>
                <li className="footer-contact-item">
                  <span className="footer-contact-link cursor-default">
                    <span className="w-4 h-4 shrink-0 text-amber-400 flex items-center justify-center text-xs">📍</span>
                    <span>Kolkata, West Bengal, India</span>
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom-bar">
            <p>&copy; {new Date().getFullYear()} <b>HisabKhata</b>. All rights reserved.</p>
            <p className="footer-credit">
              Designed &amp; Developed with ❤️ by{' '}
              <a href="https://sumanonline.com/" target="_blank" rel="noopener noreferrer" className="footer-dev-link">
                SumanOnline.Com
              </a>
            </p>
          </div>
        </div>
      </footer>

      {showInstallGuide && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#0057BB] flex items-center justify-center text-white">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Install HisabKhata App</h3>
                </div>
              </div>
              <button
                onClick={() => setShowInstallGuide(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center font-bold"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-100">
                <p className="font-bold text-blue-900 mb-1">On Chrome / Edge (Android &amp; Desktop):</p>
                <p>Click the <strong>Install</strong> icon in your browser address bar or menu (⋮) &gt; <strong>Install HisabKhata</strong>.</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-800 mb-1">On iPhone / iPad (Safari):</p>
                <p>Tap the <strong>Share</strong> button (⎋) in Safari, scroll down and tap <strong>Add to Home Screen</strong> (⊞).</p>
              </div>
            </div>

            <button
              onClick={() => setShowInstallGuide(false)}
              className="w-full py-2.5 bg-[#0057BB] text-white font-bold rounded-xl hover:bg-[#004291] transition-colors cursor-pointer text-sm"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
