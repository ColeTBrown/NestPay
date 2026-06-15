import type { Metadata } from 'next'

// The sales deck is for direct sharing with prospects, not search results.
// noindex keeps it out of Google. Anyone with the link can still view it —
// nothing sensitive on the page.

export const metadata: Metadata = {
  title: 'Rentidge — Sales overview',
  description: 'A 15-minute walkthrough of what Rentidge can do for small landlords.',
  robots: { index: false, follow: false },
}

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return children
}
