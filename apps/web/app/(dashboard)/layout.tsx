'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { useWorkspace } from '@/hooks/use-workspace'
import { apiClient } from '@/lib/api-client'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { getWorkspaceId, setWorkspaceId } = useWorkspace()
  const [workspaceReady, setWorkspaceReady] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, router])

  // Auto-fetch and set workspace ID if not already in localStorage
  useEffect(() => {
    if (status !== 'authenticated' || !session?.accessToken) return

    const existingId = getWorkspaceId()
    if (existingId) {
      setWorkspaceReady(true)
      return
    }

    // Fetch user's workspaces and auto-select the first one
    apiClient<{ success: boolean; data: { id: string }[] }>('/workspaces', {
      token: session.accessToken,
    })
      .then((res) => {
        if (res.success && res.data?.length > 0) {
          setWorkspaceId(res.data[0].id)
        }
      })
      .catch((err) => {
        console.error('Failed to fetch workspaces:', err)
      })
      .finally(() => {
        setWorkspaceReady(true)
      })
  }, [status, session?.accessToken, getWorkspaceId, setWorkspaceId])

  if (status === 'loading' || (status === 'authenticated' && !workspaceReady)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-64">
        <Header />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
