'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const LANDLORD_INVITE_CODE = 'NESTPAY-LANDLORD' // Change this to whatever you want

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
      // Check invite code if signing up as landlord
      if (role === 'landlord' && inviteCode !== LANDLORD_INVITE_CODE) {
        setError('Invalid invite code for landlord signup.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role }
        }
      })
      if (error) {
        setError(error.message)
      } else if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          role
        })
        setDone(true)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="logo" style={{ fontSize: 28, marginBottom: 8 }}>
            Nest<span>Pay</span>
          </div>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>Property management & rent payments</p>
        </div>

        <div className="card">
          {done ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📬</div>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>Check your email</div>
              <p style={{ color: 'var(--text2)', fontSize: 14 }}>We sent a confirmation link to <strong>{email}</strong></p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 4, marginBottom: 24 }}>
                {(['login', 'signup'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className="btn"
                    style={{
                      flex: 1, justifyContent: 'center',
                      background: mode === m ? 'var(--bg3)' : 'transparent',
                      color: mode === m ? 'var(--text)' : 'var(--text2)',
                      border: 'none', padding: '8px'
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
                            className="btn"
                            style={{
                              flex: 1, justifyContent: 'center',
                              background: role === r ? 'var(--bg3)' : 'transparent',
                              color: role === r ? 'var(--text)' : 'var(--text2)',
                              border: role === r ? '1px solid var(--accent)' : '1px solid var(--border)'
                            }}
                          >
                            {r === 'tenant' ? '🏠 Tenant' : '🏢 Landlord'}
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
                        <p style={{ color: 'var(--text2)', fontSize: 12, marginTop: 4 }}>
                          Contact NestPay to get an invite code.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 14 }}>{error}</p>}
                <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
                  {loading ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
                </button>
              </form>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', marginTop: 16 }}>
          Payments secured by Stripe · Data by Supabase
        </p>
      </div>
    </div>
  )
}
