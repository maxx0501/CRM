---
name: project_api_patterns
description: API client patterns, TanStack Query conventions, and mutation patterns used across the CRM
type: project
---

API client at `apps/web/lib/api-client.ts`:
- `apiClient<T>(endpoint, options)` — adds Authorization Bearer + x-workspace-id headers automatically
- All responses: `{ success: boolean, data?: T, error?: string }` — import `ApiResponse` from `@crm/shared`

Hook at `apps/web/hooks/use-api.ts`:
- `const { api } = useApi()` — wraps apiClient with session token + workspaceId from session/localStorage

TanStack Query conventions:
- Query keys: `['transactions']`, `['campaigns']`, `['automations']`, `['conversations']`, `['conversation', id]`
- Invalidate related queries on mutation success
- `enabled: !!id` for detail queries
- `refetchInterval` for polling (conversations use 10s/15s intervals)

Mutation pattern:
```ts
const mutation = useMutation({
  mutationFn: (data) => api('/endpoint', { method: 'POST', body: JSON.stringify(data) }),
  onSuccess: () => { queryClient.invalidateQueries(...); closeModal() },
  onError: (err: Error) => setError(err.message || 'Fallback message'),
})
```

**How to apply:** Always use `useApi()` hook — never call `apiClient` directly from components. Type all query results as `ApiResponse<T>`. Cast mutation args as `Record<string, unknown>` when building from FormData.
