import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rentidge — Modern property management & rent payments',
  description: 'Rentidge connects landlords and tenants in one seamless platform — payments, maintenance, and accounting all in one place.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          html, body {
            background: #020617;
            color: #E2E8F0;
            margin: 0;
            padding: 0;
          }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  )
}
