import { z } from 'zod'

// ─── Auth ────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  workspaceName: z.string().min(2, 'Workspace name must be at least 2 characters'),
})

// ─── Workspace ───────────────────────────────────────────────

export const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  niche: z.string().optional(),
  whatsappApiUrl: z.string().url().optional().or(z.literal('')),
  whatsappApiKey: z.string().optional(),
})

export const updateWorkspaceSchema = createWorkspaceSchema.partial()

// ─── Pipeline ────────────────────────────────────────────────

export const createPipelineSchema = z.object({
  name: z.string().min(1).max(100),
  isDefault: z.boolean().optional(),
})

export const createStageSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  isWonStage: z.boolean().optional(),
  isLostStage: z.boolean().optional(),
})

export const reorderStagesSchema = z.object({
  stages: z.array(
    z.object({
      id: z.string(),
      position: z.number().int().min(0),
    }),
  ),
})

// ─── Lead ────────────────────────────────────────────────────

export const leadSourceEnum = z.enum([
  'MANUAL',
  'WHATSAPP',
  'WEBSITE',
  'REFERRAL',
  'INSTAGRAM',
  'FACEBOOK',
  'GOOGLE',
  'OTHER',
])

export const createLeadSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  source: leadSourceEnum.optional(),
  stageId: z.string(),
  value: z.number().positive().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmTerm: z.string().optional(),
  utmContent: z.string().optional(),
  campaignId: z.string().optional(),
})

export const updateLeadSchema = createLeadSchema.partial()

export const moveLeadSchema = z.object({
  stageId: z.string(),
  position: z.number().int().min(0),
})

// ─── Notes ───────────────────────────────────────────────────

export const createNoteSchema = z.object({
  content: z.string().min(1),
})

// ─── Appointments ────────────────────────────────────────────

export const appointmentStatusEnum = z.enum([
  'SCHEDULED',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
])

export const createAppointmentSchema = z.object({
  leadId: z.string().optional(),
  title: z.string().min(1).max(200),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  notes: z.string().optional(),
})

export const updateAppointmentSchema = createAppointmentSchema.partial().extend({
  status: appointmentStatusEnum.optional(),
})

// ─── Messages ────────────────────────────────────────────────

export const sendMessageSchema = z.object({
  content: z.string().min(1),
  mediaUrl: z.string().url().optional(),
})

// ─── Transactions ────────────────────────────────────────────

export const transactionTypeEnum = z.enum(['INCOME', 'EXPENSE'])
export const paymentMethodEnum = z.enum([
  'PIX',
  'CREDIT_CARD',
  'DEBIT_CARD',
  'CASH',
  'BANK_TRANSFER',
  'OTHER',
])

export const createTransactionSchema = z.object({
  leadId: z.string().optional(),
  type: transactionTypeEnum,
  description: z.string().min(1),
  amount: z.number().positive(),
  method: paymentMethodEnum.optional(),
  isPaid: z.boolean().optional(),
  dueDate: z.string().datetime().optional(),
})

export const updateTransactionSchema = createTransactionSchema.partial()

// ─── Campaigns ───────────────────────────────────────────────

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmTerm: z.string().optional(),
  utmContent: z.string().optional(),
  budget: z.number().positive().optional(),
  isActive: z.boolean().optional(),
})

export const updateCampaignSchema = createCampaignSchema.partial()

// ─── Automations ─────────────────────────────────────────────

export const createAutomationSchema = z.object({
  name: z.string().min(1).max(200),
  triggerStageId: z.string().optional(),
  triggerSource: leadSourceEnum.optional(),
  isActive: z.boolean().optional(),
})

export const createAutomationStepSchema = z.object({
  position: z.number().int().min(0),
  delayMinutes: z.number().int().min(0),
  messageTemplate: z.string().min(1),
})

// ─── Tags ────────────────────────────────────────────────────

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

// ─── Custom Fields ───────────────────────────────────────────

export const fieldTypeEnum = z.enum(['TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTISELECT', 'BOOLEAN'])

export const createCustomFieldSchema = z.object({
  name: z.string().min(1).max(100),
  fieldType: fieldTypeEnum,
  options: z.array(z.string()).optional(),
  isRequired: z.boolean().optional(),
})

// ─── Type exports ────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>
export type CreatePipelineInput = z.infer<typeof createPipelineSchema>
export type CreateStageInput = z.infer<typeof createStageSchema>
export type CreateLeadInput = z.infer<typeof createLeadSchema>
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>
export type MoveLeadInput = z.infer<typeof moveLeadSchema>
export type CreateNoteInput = z.infer<typeof createNoteSchema>
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>
export type SendMessageInput = z.infer<typeof sendMessageSchema>
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
export type CreateAutomationInput = z.infer<typeof createAutomationSchema>
export type CreateAutomationStepInput = z.infer<typeof createAutomationStepSchema>
export type CreateTagInput = z.infer<typeof createTagSchema>
export type CreateCustomFieldInput = z.infer<typeof createCustomFieldSchema>
