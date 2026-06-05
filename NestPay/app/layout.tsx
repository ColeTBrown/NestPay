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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap"
        />
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
