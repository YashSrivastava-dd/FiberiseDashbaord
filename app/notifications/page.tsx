'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { NotificationPush } from '@/components/notifications/NotificationPush'

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <TopBar />
      <main className="ml-0 lg:ml-64 p-4 lg:p-6">
        <div className="max-w-4xl mx-auto mt-20">
          <NotificationPush />
        </div>
      </main>
    </div>
  )
}
