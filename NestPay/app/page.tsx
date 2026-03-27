'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      supabase.auth.getSession().then(({ data, error }) => {
        if (error) { setError(error.message); return }
        if (!data.session) {
          router.replace('/auth')
        } else {
          supabase
            .from('profiles')
            .select('role')
            .eq('id', data.session.user.id)
            .maybeSingle()
            .then(({ data: profile }) => {
              router.replace(profile?.role === 'tenant' ? '/portal' : '/dashboard')
            })
        }
      })
    } catch (e: any) {
      setError(e.message)
    }
  }, [router])

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ color: '#fc6b6b', fontSize: 14 }}>Error: {error}</div>
      <a href="/auth" style={{ color: '#635bff', fontSize: 14 }}>Go to login</a>
    </div>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ color: '#8892a4', fontSize: 14 }}>Loading NestPay...</div>
    </div>
  )
}
