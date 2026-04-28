'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const LANDLORD_INVITE_CODE = 'NB-LANDLORD-LAUNCH'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'landlord' | 'tenant'>('tenant')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (mode === 'signup') {
      if (role === 'landlord' && inviteCode !== LANDLORD_INVITE_CODE) {
        setError('Invalid invite code for landlord signup.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role } }
      })
      if (error) {
        setError(error.message)
      } else if (data.user) {
        await supabase.from('profiles').insert({ id: data.user.id, role })
        setDone(true)
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()
        if (profile?.role === 'landlord') {
          router.push('/dashboard')
        } else {
          router.push('/portal')
        }
      }
    }
    setLoading(false)
  }

  return (
    <>
      <style>{`
        html, body {
          background: #f7f6f3 !important;
        }
      `}</style>
      <div style={{
        minHeight: '100vh',
        background: '#f7f6f3',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.5px', marginBottom: 8, color: '#1a1a1a' }}>
              Rent<span style={{ color: '#38BDF8' }}>idge</span>
            </div>
            <p style={{ color: '#666', fontSize: 14 }}>Modern property management & rent payments</p>
          </div>

          <div style={{
            background: '#1E293B',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8,
            padding: 24
          }}>
            {done ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontWeight: 500, marginBottom: 8, fontSize: 16, color: '#E2E8F0' }}>Check your email</div>
                <p style={{ color: '#94A3B8', fontSize: 14 }}>We sent a confirmation link to <strong style={{ color: '#E2E8F0' }}>{email}</strong></p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 4, marginBottom: 24 }}>
                  {(['login', 'signup'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        background: mode === m ? '#0F172A' : 'transparent',
                        color: mode === m ? '#E2E8F0' : '#94A3B8',
                        border: 'none',
                        padding: '8px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 500
                      }}
                    >
                      {m === 'login' ? 'Log in' : 'Sign up'}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="field">
                    <label>Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
                  </div>
                  <div className="field">
                    <label>Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                  </div>

                  {mode === 'signup' && (
                    <>
                      <div className="field">
                        <label>I am a...</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {(['tenant', 'landlord'] as const).map(r => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setRole(r)}
                              style={{
                                flex: 1,
                                justifyContent: 'center',
                                background: role === r ? '#0F172A' : 'transparent',
                                color: role === r ? '#E2E8F0' : '#94A3B8',
                                border: role === r ? '1px solid #38BDF8' : '1px solid rgba(255,255,255,0.07)',
                                padding: '10px',
                                borderRadius: 8,
                                cursor: 'pointer',
                                fontSize: 14,
                                fontWeight: 500
                              }}
                            >
                              {r === 'tenant' ? 'Tenant' : 'Landlord'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {role === 'landlord' && (
                        <div className="field">
                          <label>Landlord Invite Code</label>
                          <input
                            type="text"
                            value={inviteCode}
                            onChange={e => setInviteCode(e.target.value)}
                            placeholder="Enter invite code"
                            required
                          />
                          <p style={{ color: '#94A3B8', fontSize: 12, marginTop: 4 }}>
                            Contact Rentidge to get an invite code.
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {error && <p style={{ color: '#fc6b6b', fontSize: 13, marginBottom: 14 }}>{error}</p>}
                  <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
                    {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
                  </button>
                </form>
              </>
            )}
          </div>

          <p style={{ textAlign: 'center', fontSize: 12, color: '#94A3B8', marginTop: 16 }}>
            Payments secured by Stripe · Data by Supabase
          </p>
        </div>
      </div>
    </>
  )
}
