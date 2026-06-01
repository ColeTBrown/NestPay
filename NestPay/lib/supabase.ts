import { createClient } from '@supabase/supabase-js'

// Browser-safe Supabase client (anon key only). This file is imported by
// client components (auth / dashboard / portal pages), so it MUST NOT export
// the service-role client — that lives in lib/supabase-admin.ts behind an
// `import 'server-only'` guard (H4).
//
// L1: previously fell back to a 'placeholder' URL/key when env vars were
// missing, which turned misconfiguration into silent runtime 401s. Now we
// throw loudly — there is no legitimate scenario where these are absent, and
// the NEXT_PUBLIC_ vars are present at build time in every environment.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[supabase] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
