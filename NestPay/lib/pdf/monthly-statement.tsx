import 'server-only'
import * as ReactPdf from '@react-pdf/renderer'
import React from 'react'
import type { MonthlyIncomeRow } from '@/lib/portfolio-stats'

// @react-pdf/renderer's component types don't satisfy React's JSX
// constraints under our tsconfig (the union-typed children prop trips
// TS's IntrinsicAttributes check). Casting to React's loosest function-
// component type at the import boundary keeps every callsite below clean
// without disabling type checking project-wide.
type AnyFC = React.ComponentType<any>
const Document = ReactPdf.Document as unknown as AnyFC
const Page = ReactPdf.Page as unknown as AnyFC
const Text = ReactPdf.Text as unknown as AnyFC
const View = ReactPdf.View as unknown as AnyFC
const { StyleSheet, renderToBuffer } = ReactPdf

// Server-only PDF template for the monthly income statement. Rendered to a
// Buffer that we attach to the Resend email.

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 11, color: '#1a1a1a' },
  header: { marginBottom: 24 },
  brand: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  brandAccent: { color: '#38BDF8' },
  title: { fontSize: 20, marginTop: 18, marginBottom: 4 },
  subtitle: { fontSize: 11, color: '#64748B', marginBottom: 24 },
  sectionLabel: { fontSize: 9, fontWeight: 'bold', color: '#64748B', letterSpacing: 1, marginTop: 18, marginBottom: 8, textTransform: 'uppercase' },
  narrative: { fontSize: 11, lineHeight: 1.5, color: '#1a1a1a', marginBottom: 12 },
  table: { marginTop: 6 },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', paddingVertical: 6 },
  rowHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#0F172A', paddingVertical: 6 },
  th: { fontSize: 9, fontWeight: 'bold', color: '#0F172A', textTransform: 'uppercase', letterSpacing: 0.5 },
  cellUnit: { width: '20%' },
  cellTenant: { width: '30%' },
  cellCategory: { width: '25%' },
  cellAmount: { width: '25%', textAlign: 'right' },
  totalRow: { flexDirection: 'row', marginTop: 14, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#0F172A' },
  totalLabel: { width: '75%', fontWeight: 'bold' },
  totalAmount: { width: '25%', textAlign: 'right', fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, fontSize: 8, color: '#94A3B8', textAlign: 'center' },
})

export type MonthlyStatementProps = {
  landlordName: string
  monthLabel: string // e.g. "May 2026"
  paymentMonth: string // e.g. "2026-05"
  narrative: string
  rows: MonthlyIncomeRow[]
  totalCollected: number
  byCategory: Record<string, number>
}

function formatUsd(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function prettifyCategory(c: string) {
  if (c === 'monthly_rent') return 'Monthly rent'
  if (c === 'move_in') return 'Move-in payment'
  if (c === 'security_deposit') return 'Security deposit'
  if (c === 'last_month_credit') return 'Last-month credit'
  return c
}

export function MonthlyStatement(props: MonthlyStatementProps) {
  const { landlordName, monthLabel, narrative, rows, totalCollected, byCategory } = props
  const categoryEntries = Object.entries(byCategory).sort(([, a], [, b]) => b - a)

  return (
    <Document title={`Rentidge — ${monthLabel} statement`}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>
            Rent<Text style={styles.brandAccent}>idge</Text>
          </Text>
          <Text style={styles.title}>{monthLabel} income statement</Text>
          <Text style={styles.subtitle}>Prepared for {landlordName}</Text>
        </View>

        <Text style={styles.sectionLabel}>Summary</Text>
        <Text style={styles.narrative}>{narrative}</Text>

        <Text style={styles.sectionLabel}>Payments</Text>
        <View style={styles.table}>
          <View style={styles.rowHeader}>
            <Text style={[styles.th, styles.cellUnit]}>Unit</Text>
            <Text style={[styles.th, styles.cellTenant]}>Tenant</Text>
            <Text style={[styles.th, styles.cellCategory]}>Category</Text>
            <Text style={[styles.th, styles.cellAmount]}>Amount</Text>
          </View>
          {rows.length === 0 ? (
            <View style={styles.row}>
              <Text style={{ width: '100%', color: '#64748B' }}>No successful payments recorded this month.</Text>
            </View>
          ) : rows.map((r, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.cellUnit}>{r.unitNumber} · {r.propertyName}</Text>
              <Text style={styles.cellTenant}>{r.tenantName ?? '—'}</Text>
              <Text style={styles.cellCategory}>{prettifyCategory(r.category)}</Text>
              <Text style={styles.cellAmount}>{formatUsd(r.amount)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total collected</Text>
            <Text style={styles.totalAmount}>{formatUsd(totalCollected)}</Text>
          </View>
        </View>

        {categoryEntries.length > 1 && (
          <>
            <Text style={styles.sectionLabel}>By category</Text>
            <View style={styles.table}>
              {categoryEntries.map(([cat, amt]) => (
                <View key={cat} style={styles.row}>
                  <Text style={{ width: '75%' }}>{prettifyCategory(cat)}</Text>
                  <Text style={{ width: '25%', textAlign: 'right' }}>{formatUsd(amt)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.footer}>
          Generated by Rentidge. Does not constitute tax advice — consult your accountant.
        </Text>
      </Page>
    </Document>
  )
}

export async function renderMonthlyStatementPdf(props: MonthlyStatementProps): Promise<Buffer> {
  return renderToBuffer(<MonthlyStatement {...props} />)
}
