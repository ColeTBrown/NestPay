import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Service-role Supabase client. RLS-bypassing — server use only. The
// `import 'server-only'` line above makes Next.js fail the BUILD if any
// client component imports this module, so the service-role key can never
// be pulled into a browser bundle (H4).
//
// All server-side callers (route handlers, lib/auth, lib/quickbooks) import
// supabaseAdmin from here. Previously this client was co-exported from
// lib/supabase.ts (reachable by client code) and several routes constructed
// their own inline createClient(...SERVICE_ROLE_KEY) — both consolidated here.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    '[supabase-admin] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required',
  )
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
