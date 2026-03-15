'use client'

import { useSession } from 'next-auth/react'
import { useCallback } from 'react'
import { apiClient } from '@/lib/api-client'
import { useWorkspace } from './use-workspace'

export function useApi() {
  const { data: session } = useSession()
  const { getWorkspaceId } = useWorkspace()

  const api = useCallback(
    <T>(endpoint: string, options: RequestInit = {}) => {
      return apiClient<T>(endpoint, {
        ...options,
        token: session?.accessToken || undefined,
        workspaceId: getWorkspaceId() || undefined,
      })
    },
    [session?.accessToken, getWorkspaceId],
  )

  return { api }
}
