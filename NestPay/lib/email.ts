import { Resend } from 'resend'

const FROM_ADDRESS = process.env.RESEND_FROM || 'Rentidge <reminders@rentidge.com>'

let client: Resend | null = null

function getClient(): Resend {
  if (client) return client
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY not set')
  }
  client = new Resend(apiKey)
  return client
}

export type SendEmailArgs = {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
}

export async function sendEmail({ to, subject, html, text, from }: SendEmailArgs) {
  const resend = getClient()
  const { data, error } = await resend.emails.send({
    from: from || FROM_ADDRESS,
    to,
    subject,
    html,
    text,
  })
  if (error) {
    throw new Error(`Resend error: ${error.message || 'unknown'}`)
  }
  return data
}
