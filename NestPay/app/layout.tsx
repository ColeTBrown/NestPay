import type { Metadata } from 'next'
import './globals.css'

export const metadata = {
  title: 'Rentidge',
  description: 'Modern property management & rent payments',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
