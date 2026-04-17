export default function EULA() {
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
          <h1 style={{ fontSize: '42px', fontWeight: '700', color: '#f8fafc', marginTop: '24px', marginBottom: '8px', lineHeight: 1.2 }}>End-User License Agreement</h1>
          <p style={{ color: '#64748b', fontSize: '14px', fontFamily: 'monospace' }}>Last updated: April 17, 2025</p>
          <div style={{ width: '48px', height: '3px', background: '#38BDF8', marginTop: '24px' }} />
        </div>
        <Section>
          <p>This End-User License Agreement ("Agreement") is a legal agreement between you ("User") and Rentidge ("Company," "we," "us," or "our") governing your use of the Rentidge platform and associated services. By accessing or using Rentidge, you agree to be bound by this Agreement.</p>
        </Section>
        <Section title="1. Grant of License">
          <p>Subject to your compliance with this Agreement, Rentidge grants you a limited, non-exclusive, non-transferable, revocable license to access and use the platform solely for your personal or internal business purposes as a landlord or tenant.</p>
        </Section>
        <Section title="2. User Accounts">
          <p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately of any unauthorized use at <a href="mailto:support@rentidge.com" style={{ color: '#38BDF8' }}>support@rentidge.com</a>.</p>
        </Section>
        <Section title="3. Acceptable Use">
          <p>You agree not to use the platform for any unlawful purpose, submit fraudulent information, attempt unauthorized access, reverse engineer any part of the platform, or resell access without written consent.</p>
        </Section>
        <Section title="4. Payment Terms">
          <p>Rent payments and platform fees are processed through Stripe. Rentidge charges a platform service fee on each transaction. All fees are disclosed at the time of transaction. Disputes must be submitted within 30 days.</p>
        </Section>
        <Section title="5. Third-Party Services">
          <p>Rentidge integrates with Stripe, QuickBooks Online (Intuit), and Supabase. Your use of these integrations is subject to their respective terms of service.</p>
        </Section>
        <Section title="6. Intellectual Property">
          <p>All content, features, and functionality of the Rentidge platform are owned by Rentidge and protected by applicable intellectual property laws.</p>
        </Section>
        <Section title="7. Disclaimer of Warranties">
          <p>THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. RENTIDGE DOES NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED OR ERROR-FREE.</p>
        </Section>
        <Section title="8. Limitation of Liability">
          <p>TO THE FULLEST EXTENT PERMITTED BY LAW, RENTIDGE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED AMOUNTS PAID TO RENTIDGE IN THE THREE MONTHS PRECEDING THE CLAIM.</p>
        </Section>
        <Section title="9. Governing Law">
          <p>This Agreement shall be governed by the laws of the Commonwealth of Massachusetts. Disputes shall be subject to the exclusive jurisdiction of courts located in Massachusetts.</p>
        </Section>
        <Section title="10. Contact">
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', padding: '20px 24px', marginTop: '12px', fontFamily: 'monospace', fontSize: '14px', lineHeight: '2' }}>
            <div>Rentidge</div>
            <div><a href="mailto:legal@rentidge.com" style={{ color: '#38BDF8' }}>legal@rentidge.com</a></div>
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
