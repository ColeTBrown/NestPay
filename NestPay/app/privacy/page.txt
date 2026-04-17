export default function PrivacyPolicy() {
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
          <h1 style={{ fontSize: '42px', fontWeight: '700', color: '#f8fafc', marginTop: '24px', marginBottom: '8px', lineHeight: 1.2 }}>Privacy Policy</h1>
          <p style={{ color: '#64748b', fontSize: '14px', fontFamily: 'monospace' }}>Last updated: April 17, 2025</p>
          <div style={{ width: '48px', height: '3px', background: '#38BDF8', marginTop: '24px' }} />
        </div>
        <Section>
          <p>Rentidge ("we," "our," or "us") operates the Rentidge platform, a property management service connecting landlords and tenants. This Privacy Policy explains how we collect, use, disclose, and protect your information when you use our platform at <a href="https://rentidge.com" style={{ color: '#38BDF8' }}>rentidge.com</a> and any associated services.</p>
          <p>By using Rentidge, you agree to the collection and use of information in accordance with this policy.</p>
        </Section>
        <Section title="1. Information We Collect">
          <p><strong style={{ color: '#f1f5f9' }}>Account Information:</strong> When you register, we collect your name, email address, phone number, and role (landlord or tenant).</p>
          <p><strong style={{ color: '#f1f5f9' }}>Payment Information:</strong> Rent payments are processed through Stripe. We do not store full payment card details.</p>
          <p><strong style={{ color: '#f1f5f9' }}>Usage Data:</strong> We collect log data, device information, IP addresses, and browser type.</p>
        </Section>
        <Section title="2. How We Use Your Information">
          <ul style={{ paddingLeft: '20px', lineHeight: '2' }}>
            <li>Provide, maintain, and improve the Rentidge platform</li>
            <li>Process rent payments and financial transactions</li>
            <li>Sync financial data with QuickBooks at the landlord's request</li>
            <li>Comply with legal obligations and detect fraud</li>
          </ul>
        </Section>
        <Section title="3. Sharing of Information">
          <p>We do not sell your personal information. We share data with Stripe, Supabase, Vercel, and Intuit QuickBooks only as necessary to provide our services.</p>
        </Section>
        <Section title="4. Security">
          <p>We implement TLS encryption, Supabase row-level security, and Stripe's PCI-compliant infrastructure. No method of transmission over the Internet is 100% secure.</p>
        </Section>
        <Section title="5. Your Rights">
          <p>Contact us at <a href="mailto:privacy@rentidge.com" style={{ color: '#38BDF8' }}>privacy@rentidge.com</a> to access, correct, or delete your data.</p>
        </Section>
        <Section title="6. Contact Us">
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '20px 24px', marginTop: '12px', fontFamily: 'monospace', fontSize: '14px', lineHeight: '2' }}>
            <div>Rentidge</div>
            <div><a href="mailto:privacy@rentidge.com" style={{ color: '#38BDF8' }}>privacy@rentidge.com</a></div>
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
