'use client'

import { useCallback } from 'react'

const WORKSPACE_KEY = 'crm-workspace-id'

export function useWorkspace() {
  const getWorkspaceId = useCallback((): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(WORKSPACE_KEY)
  }, [])

  const setWorkspaceId = useCallback((id: string) => {
    localStorage.setItem(WORKSPACE_KEY, id)
  }, [])

  const clearWorkspaceId = useCallback(() => {
    localStorage.removeItem(WORKSPACE_KEY)
  }, [])

  return { getWorkspaceId, setWorkspaceId, clearWorkspaceId }
}
