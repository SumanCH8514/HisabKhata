import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/HisabKhata_logo.png';
import '../styles/LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [openFaq, setOpenFaq] = React.useState(null);

  useEffect(() => {
    // ... existing scroll animation logic ...
    const observerOptions = {
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.feature-card, .hero-content, .hero-image');
    animatedElements.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition = 'all 0.8s ease-out';
      observer.observe(el);
    });

    // Navbar Scroll Effect
    const handleScroll = () => {
      const nav = document.querySelector('.landing-page nav');
      if (nav) {
        if (window.scrollY > 50) {
          nav.style.padding = '10px 0';
          nav.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
        } else {
          nav.style.padding = '20px 0';
          nav.style.boxShadow = 'none';
        }
      }
    };

    window.addEventListener('scroll', handleScroll);

    // Stat Counter Animation
    const statsSection = document.querySelector('.stats');
    const statsObserver = new IntersectionObserver((entries) => {
      if (entries[0] && entries[0].isIntersecting) {
        animateCounters();
        statsObserver.unobserve(statsSection);
      }
    }, { threshold: 0.5 });

    const animateCounters = () => {
      const stats = document.querySelectorAll('.stat-item h3');
      stats.forEach(stat => {
        const originalText = stat.innerText;
        const targetStr = originalText.replace(/\D/g, '');
        if (!targetStr) return; // Skip if no digits are found

        const target = parseInt(targetStr);
        let current = 0;
        const increment = target / 50;
        const updateCount = () => {
          if (current < target) {
            current += increment;
            const suffix = originalText.includes('k') ? 'k+' : (originalText.includes('%') ? '%' : '');
            const prefix = originalText.includes('₹') ? '₹' : '';
            stat.innerText = prefix + Math.ceil(current) + suffix;
            setTimeout(updateCount, 20);
          } else {
            stat.innerText = originalText;
          }
        };
        updateCount();
      });
    };

    if (statsSection) statsObserver.observe(statsSection);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
      statsObserver.disconnect();
    };
  }, []);

  return (
    <div className="landing-page">
      <nav>
        <div className="container nav-container">
          <Link to="/" className="logo" aria-label="HisabKhata Home">
            <img src={logo} alt="HisabKhata Logo" width="160" height="50" className="nav-logo-img" />
          </Link>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it Works</a>
            <a href="#security">Security</a>
            <a href="#about">About</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="nav-actions">
            {currentUser ? (
              <button className="btn btn-login" onClick={() => navigate('/customers')}>Dashboard</button>
            ) : (
              <button className="btn btn-login" onClick={() => navigate('/login')}>Login</button>
            )}
            <button className="btn btn-primary">Download App</button>
          </div>
        </div>
      </nav>

      <main>
        <header className="hero">
          <div className="container hero-grid">
            <div className="hero-content">
              <span className="hero-brand-tag">HisabKhata</span>
              <h1>The Smartest Way to Manage <br /> Your Personal Credit</h1>
              <p>
                Simplify your accounting, recover payments faster, and grow your business with
                India's most trusted digital ledger. 100% Secure. 100% Free.
              </p>
              <div className="hero-cta">
                {currentUser ? (
                  <button className="btn btn-google-hero" onClick={() => navigate('/customers')} aria-label="Open Dashboard">
                    <span className="material-symbols-outlined" style={{ marginRight: '8px' }}>dashboard</span>
                    Open Dashboard
                  </button>
                ) : (
                  <button className="btn btn-google-hero" onClick={() => navigate('/login')}>
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="24" height="24" />
                    Get started with Google Mail
                  </button>
                )}
                <p style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                  {currentUser ? 'Welcome back! Manage your ledger instantly.' : 'No credit card required • Instant access'}
                </p>
              </div>
            </div>
            <div className="hero-image">
              <img
                src="/hero.png"
                alt="HisabKhata App Interface"
                width="650"
                height="400"
                fetchPriority="high"
                loading="eager"
                decoding="async"
              />
            </div>
          </div>
        </header>

        <section className="stats">
          <div className="container stats-container">
            <div className="stat-item">
              <h3>10k+</h3>
              <p>Active Merchants</p>
            </div>
            <div className="stat-item">
              <h3>Bank-Grade</h3>
              <p>Security & Privacy</p>
            </div>
            <div className="stat-item">
              <h3>Real-time</h3>
              <p>Cloud Data Sync</p>
            </div>
            <div className="stat-item">
              <h3>₹0</h3>
              <p>Lifetime Free</p>
            </div>
          </div>
        </section>

        <section className="features" id="features">
          <div className="container">
            <div className="section-header">
              <h2>Powerful Features to Grow Your Business</h2>
              <p>Everything you need to manage your business credit and cash flow in one simple app.</p>
            </div>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">💸</div>
                <h3>1-Tap Credit Tracking</h3>
                <p>Ditch the paper diary. Record every "Got" and "Gave" transaction in seconds with zero errors.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔔</div>
                <h3>Smart WhatsApp Alerts</h3>
                <p>Automate your collections. Send professional payment reminders that get you paid 3x faster.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📊</div>
                <h3>One-Click Insights</h3>
                <p>Get a bird's-eye view of your business. Generate professional GST-ready PDF reports instantly.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">☁️</div>
                <h3>Immutable Cloud Backup</h3>
                <p>Your data is precious. We mirror your records across multiple secure servers in real-time.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🏢</div>
                <h3>Multi-Store Support</h3>
                <p>Scaling up? Manage multiple shop branches and inventory from a single master dashboard.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔒</div>
                <h3>Privileged Encryption</h3>
                <p>Your financial secrets are safe. We use AES-256 encryption to keep your data strictly private.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="how-it-works" id="how-it-works" style={{ padding: '100px 0', background: 'var(--bg-light)' }}>
          <div className="container">
            <div className="section-header">
              <h2>How HisabKhata Works</h2>
              <p>Start managing your business credit in 3 simple steps.</p>
            </div>
            <div className="steps-grid">
              <div className="step-card">
                <div className="step-number">1</div>
                <h3>Download & Sign Up</h3>
                <p>Download the app or use the web version. Register your business with just your mobile number.</p>
              </div>
              <div className="step-card">
                <div className="step-number">2</div>
                <h3>Add Customers</h3>
                <p>Add your regular customers to your digital ledger. Import contacts directly from your phone.</p>
              </div>
              <div className="step-card">
                <div className="step-number">3</div>
                <h3>Record Transactions</h3>
                <p>Enter "Got" or "Gave" amounts. The app automatically calculates the balance and sends alerts.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="security" id="security" style={{ padding: '100px 0', background: 'var(--white)' }}>
          <div className="container hero-grid" style={{ alignItems: 'center' }}>
            <div className="hero-image">
              <img src="/security.png" alt="Security Illustration" width="500" height="400" loading="lazy" style={{ maxWidth: '500px' }} />
            </div>
            <div className="hero-content">
              <h2>Your Data is Our Priority</h2>
              <p>
                HisabKhata uses bank-grade encryption to ensure your business data is always safe.
                We comply with international security standards to provide you a worry-free experience.
              </p>
              <ul className="security-list">
                <li>
                  <span className="check-icon">✓</span> ISO 27001 Certified Security
                </li>
                <li>
                  <span className="check-icon">✓</span> Daily Automatic Backups
                </li>
                <li>
                  <span className="check-icon">✓</span> End-to-End Data Encryption
                </li>
                <li>
                  <span className="check-icon">✓</span> 100% Privacy - We never share your data
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="about" id="about" style={{ padding: '100px 0', background: 'var(--bg-light)' }}>
          <div className="container">
            <div className="section-header">
              <h2>Our Story & Mission</h2>
              <p>Driving financial inclusion through digital transformation.</p>
            </div>
            <div className="about-content">
              <div className="about-text">
                <p>
                  HisabKhata was founded with a singular purpose: to bridge the gap between traditional credit management and modern financial technology. We observed millions of small business owners struggling with bulky ledgers, lost records, and delayed payments.
                </p>
                <p>
                  Today, we provide a robust ecosystem that goes beyond simple bookkeeping. We empower merchants with real-time analytics, automated recovery tools, and a secure infrastructure that allows them to focus on what matters most—growth.
                </p>
              </div>
              <div className="about-mission">
                <div className="mission-item">
                  <h3>The Goal</h3>
                  <p>To eliminate paper-based risks and provide a transparent, efficient ledger system for every shopkeeper in India.</p>
                </div>
                <div className="mission-item">
                  <h3>The Impact</h3>
                  <p>Helping merchants reduce bad debts by 40% and recover their working capital faster than ever before.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="faq" id="faq" style={{ padding: '100px 0', background: 'var(--white)' }}>
          <div className="container">
            <div className="section-header">
              <h2>Expert Support & FAQs</h2>
              <p>Clear answers to help you make the switch.</p>
            </div>
            <div className="faq-grid accordion">
              {[
                {
                  q: "Is my business data shared with third parties?",
                  a: "Absolutely not. Your data belongs to you. We use bank-grade AES-256 encryption to ensure that only you can access your business records."
                },
                {
                  q: "What happens if I lose my mobile phone?",
                  a: "Since HisabKhata is cloud-synced, all your data is safe. Simply log in with your verified mobile number on any new device to instantly restore your entire ledger."
                },
                {
                  q: "Can I use HisabKhata for GST and tax audits?",
                  a: "Yes. The app allows you to export professional PDF and Excel reports that are widely accepted for accounting, tax filing, and business audits."
                },
                {
                  q: "Do I need an active internet connection to record entries?",
                  a: "You can record entries offline, and they will automatically sync to the cloud as soon as your device connects to the internet."
                }
              ].map((item, index) => (
                <div
                  key={index}
                  className={`faq-item ${openFaq === index ? 'active' : ''}`}
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                >
                  <div className="faq-question">
                    <h3>{item.q}</h3>
                    <span className="faq-icon">{openFaq === index ? '−' : '+'}</span>
                  </div>
                  <div className="faq-answer">
                    <p>{item.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="cta-banner" style={{ padding: '80px 0', background: 'var(--primary-blue)', color: 'white', textAlign: 'center' }}>
          <div className="container">
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>Ready to Grow Your Business?</h2>
            <p style={{ fontSize: '1.2rem', marginBottom: '2.5rem', opacity: '0.9' }}>Join thousands of smart merchants who have already switched to HisabKhata.</p>
            <button
              className="btn btn-primary"
              style={{ background: 'white', color: 'var(--primary-blue)', padding: '1rem 3rem', fontSize: '1.1rem' }}
              onClick={() => navigate(currentUser ? '/customers' : '/signup')}
            >
              {currentUser ? 'Open Dashboard' : 'Get Started for Free'}
            </button>
          </div>
        </section>
      </main>

      <footer>
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <p className="footer-logo-text">Hisab<span>Khata</span></p>
              <p>The definitive digital ledger for India's growing MSME sector. Empowering merchants with smart financial infrastructure.</p>
            </div>
            <div className="footer-links">
              <h3>Product</h3>
              <ul>
                <li><a href="#">Business Ledger</a></li>
                <li><a href="#">Payment Reminders</a></li>
                <li><a href="#">QR Codes</a></li>
                <li><a href="#">Staff Management</a></li>
              </ul>
            </div>
            <div className="footer-links">
              <h3>Resources</h3>
              <ul>
                <li><a href="#">Help Center</a></li>
                <li><a href="#">Blog</a></li>
                <li><Link to="/terms-of-condition">Terms of Service</Link></li>
                <li><Link to="/privacy-policy">Privacy Policy</Link></li>
              </ul>
            </div>
            <div className="footer-links">
              <h3>Contact</h3>
              <ul>
                <li><a href="mailto:hisabkhata@sumanonline.com">hisabkhata@sumanonline.com</a></li>
                <li><a href="tel:+918918153949">+91 8918153949</a></li>
                <li><a href="#">Twitter</a></li>
                <li><a href="#">LinkedIn</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} HisabKhata. All rights reserved.</p>
            <p>Made with ❤️ by SumanOnline Web Services</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
