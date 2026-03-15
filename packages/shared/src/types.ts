export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    total: number
    page: number
    perPage: number
    totalPages: number
  }
}

export interface DashboardMetrics {
  totalLeads: number
  newLeadsThisMonth: number
  conversionRate: number
  averageDealValue: number
  revenueThisMonth: number
  upcomingAppointments: number
  unreadMessages: number
}

export interface FunnelData {
  stageId: string
  stageName: string
  count: number
  value: number
}

export interface JwtPayload {
  sub: string
  email: string
  iat: number
  exp: number
}

export interface AuthenticatedRequest {
  userId: string
  workspaceId: string
}
