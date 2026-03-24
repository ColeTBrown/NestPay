'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/auth')
      } else {
        supabase
          .from('tenants')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            router.replace(data ? '/portal' : '/dashboard')
          })
      }
    })
  }, [router])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ color: 'var(--text2)', fontSize: 14 }}>Loading NestPay...</div>
    </div>
  )
}