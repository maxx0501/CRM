export const DEFAULT_PIPELINE_STAGES = [
  { name: 'New Lead', color: '#6366f1', position: 0 },
  { name: 'Contacted', color: '#f59e0b', position: 1 },
  { name: 'Qualified', color: '#3b82f6', position: 2 },
  { name: 'Proposal', color: '#8b5cf6', position: 3 },
  { name: 'Won', color: '#22c55e', position: 4, isWonStage: true },
  { name: 'Lost', color: '#ef4444', position: 5, isLostStage: true },
] as const

export const NICHE_OPTIONS = [
  { value: 'physiotherapy', label: 'Fisioterapia' },
  { value: 'psychology', label: 'Psicologia' },
  { value: 'personal_trainer', label: 'Personal Trainer' },
  { value: 'nutrition', label: 'Nutrição' },
  { value: 'dentistry', label: 'Odontologia' },
  { value: 'aesthetics', label: 'Estética' },
  { value: 'coaching', label: 'Coaching' },
  { value: 'other', label: 'Outro' },
] as const

export const MEMBER_ROLES = {
  OWNER: 'OWNER',
  MEMBER: 'MEMBER',
} as const

export const LEAD_SOURCES = [
  'MANUAL',
  'WHATSAPP',
  'WEBSITE',
  'REFERRAL',
  'INSTAGRAM',
  'FACEBOOK',
  'GOOGLE',
  'OTHER',
] as const

export const APPOINTMENT_STATUSES = [
  'SCHEDULED',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
] as const

export const PAYMENT_METHODS = [
  'PIX',
  'CREDIT_CARD',
  'DEBIT_CARD',
  'CASH',
  'BANK_TRANSFER',
  'OTHER',
] as const
