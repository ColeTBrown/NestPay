import 'server-only'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase'

// Server-only auth helpers used by route handlers. The `import 'server-only'`
// directive at the top makes Next.js error at build time if any client
// component imports this file by mistake.
//
// Return-type shape: each helper returns either { response: NextResponse }
// (the failure short-circuit you re-return from the route) or the success
// payload. Use `if ('response' in auth) return auth.response` at the call
// site — this is a TypeScript type guard that narrows correctly even with
// strict mode off (which our tsconfig has).

export function createSupabaseRouteClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Belt-and-braces guard for read-only cookie stores.
          }
        },
      },
    },
  )
}

export type AuthFail = { response: NextResponse }
export type UserOk = { userId: string; email: string | undefined }

// Verifies the request has a valid Supabase session by round-tripping the JWT
// to Supabase's auth server (getUser, not getSession). Returns 401 if not.
export async function requireUser(): Promise<UserOk | AuthFail> {
  const supabase = createSupabaseRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { userId: user.id, email: user.email }
}

export type LandlordOk = { landlordId: string }

// Same as requireUser plus a profiles.role === 'landlord' check.
export async function requireLandlord(): Promise<LandlordOk | AuthFail> {
  const u = await requireUser()
  if ('response' in u) return u

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', u.userId)
    .single()

  if (error || !profile || profile.role !== 'landlord') {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { landlordId: u.userId }
}

export type TenantOk = { tenantId: string; userId: string }

// Same as requireUser plus resolution of the caller's tenant row. Rejects
// if zero rows (user is not a tenant) or >1 rows (data integrity bug —
// every user should have at most one tenant record).
export async function requireTenant(): Promise<TenantOk | AuthFail> {
  const u = await requireUser()
  if ('response' in u) return u

  const { data: tenants, error } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('user_id', u.userId)

  if (error) {
    console.error('[requireTenant] supabase error for user', u.userId, error)
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  if (!tenants || tenants.length === 0) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  if (tenants.length > 1) {
    // Data integrity issue. Reject and log loudly so we can investigate —
    // every user should map to at most one tenant row.
    console.error(
      `[requireTenant] DATA INTEGRITY: user ${u.userId} has ${tenants.length} tenant rows`,
    )
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { tenantId: tenants[0].id, userId: u.userId }
}
