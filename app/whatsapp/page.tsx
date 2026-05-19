'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * WhatsApp Hub Page — redirects to journeys sub-page.
 */
export default function WhatsAppPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/whatsapp/journeys')
  }, [router])

  return null
}
