export default function TermsOfService() {
  return (
    <main style={{
      background: '#020617',
      minHeight: '100vh',
      color: '#e2e8f0',
      fontFamily: "'Georgia', serif",
      padding: '60px 24px',
    }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <div style={{ marginBottom: '48px' }}>
          <a href="/" style={{ color: '#38BDF8', textDecoration: 'none', fontSize: '14px', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
            ← RENTIDGE
          </a>
          <h1 style={{ fontSize: '42px', fontWeight: '700', color: '#f8fafc', marginTop: '24px', marginBottom: '8px', lineHeight: 1.2 }}>Terms of Service</h1>
          <p style={{ color: '#64748b', fontSize: '14px', fontFamily: 'monospace' }}>Last updated: April 22, 2026</p>
          <div style={{ width: '48px', height: '3px', background: '#38BDF8', marginTop: '24px' }} />
        </div>
        <Section>
          <p>Welcome to Rentidge. By accessing or using our platform at <a href="https://rentidge.com" style={{ color: '#38BDF8' }}>rentidge.com</a>, you agree to be bound by these Terms of Service. Please read them carefully.</p>
        </Section>
        <Section title="1. Use of the Platform">
          <p>Rentidge provides a property management platform for landlords and tenants. You agree to use the platform only for lawful purposes and in accordance with these terms. You must be at least 18 years old to use Rentidge.</p>
        </Section>
        <Section title="2. Accounts">
          <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately at <a href="mailto:cole@rentidge.com" style={{ color: '#38BDF8' }}>cole@rentidge.com</a> if you suspect unauthorized access.</p>
        </Section>
        <Section title="3. Payments">
          <p>Rent payments are processed through Stripe. Rentidge charges a platform fee of 8% on transactions. All fees are disclosed at the time of payment. We are not responsible for errors made by Stripe or your financial institution.</p>
        </Section>
        <Section title="4. QuickBooks Integration">
          <p>Landlords may connect their QuickBooks account to sync financial data. By connecting QuickBooks, you authorize Rentidge to access and write financial data on your behalf. You may disconnect at any time from your dashboard.</p>
        </Section>
        <Section title="5. Prohibited Conduct">
          <ul style={{ paddingLeft: '20px', lineHeight: '2' }}>
            <li>Use the platform for fraudulent or illegal purposes</li>
            <li>Attempt to gain unauthorized access to any part of the platform</li>
            <li>Interfere with or disrupt the integrity of the platform</li>
            <li>Impersonate any person or entity</li>
          </ul>
        </Section>
        <Section title="6. Termination">
          <p>We reserve the right to suspend or terminate your account at any time for violations of these terms. You may cancel your account at any time by contacting us.</p>
        </Section>
        <Section title="7. Disclaimer of Warranties">
          <p>Rentidge is provided "as is" without warranties of any kind, either express or implied. We do not guarantee that the platform will be uninterrupted or error-free.</p>
        </Section>
        <Section title="8. Limitation of Liability">
          <p>To the fullest extent permitted by law, Rentidge shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform.</p>
        </Section>
        <Section title="9. Changes to Terms">
          <p>We may update these terms from time to time. Continued use of the platform after changes constitutes acceptance of the new terms.</p>
        </Section>
        <Section title="10. Contact Us">
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '20px 24px', marginTop: '12px', fontFamily: 'monospace', fontSize: '14px', lineHeight: '2' }}>
            <div>Rentidge</div>
            <div><a href="mailto:cole@rentidge.com" style={{ color: '#38BDF8' }}>cole@rentidge.com</a></div>
            <div><a href="https://rentidge.com" style={{ color: '#38BDF8' }}>rentidge.com</a></div>
          </div>
        </Section>
        <div style={{ borderTop: '1px solid #1e293b', marginTop: '48px', paddingTop: '24px', color: '#475569', fontSize: '13px', fontFamily: 'monospace' }}>
          © {new Date().getFullYear()} Rentidge. All rights reserved.
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '36px' }}>
      {title && <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#f1f5f9', marginBottom: '12px', fontFamily: "'Georgia', serif" }}>{title}</h2>}
      <div style={{ color: '#94a3b8', lineHeight: '1.8', fontSize: '15px' }}>{children}</div>
    </div>
  );
}
