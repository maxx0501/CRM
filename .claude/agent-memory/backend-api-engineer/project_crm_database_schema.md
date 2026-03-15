---
name: CRM Prisma schema summary
description: Key models, enums, and relationships in the CRM Prisma schema
type: project
---

Schema at `packages/database/prisma/schema.prisma`. PostgreSQL.

Key models and noteworthy fields:
- **User** — `passwordHash`, memberships via WorkspaceMember
- **Workspace** — `whatsappApiUrl`, `whatsappApiKey` (unofficial WA API config), `slug` (unique), `timezone`
- **WorkspaceMember** — composite unique `[userId, workspaceId]`, role: OWNER | MEMBER
- **Pipeline** — `isDefault` (one per workspace ideally), has many PipelineStages
- **PipelineStage** — `position` (Int), `isWonStage`, `isLostStage`, `color`
- **Lead** — `stageId`, `position`, `source` (LeadSource enum), UTM fields, `wonAt`, `lostAt`, `campaignId`
- **Note** — belongs to Lead
- **Tag** — unique `[workspaceId, name]`; LeadTag is the join table with composite PK `[leadId, tagId]`
- **Activity** — `type` (ActivityType enum), `metadata` (Json), always linked to a Lead
- **Conversation** — unique `[workspaceId, whatsappPhone]`; linked to optional Lead
- **Message** — `direction` (INBOUND|OUTBOUND), `status` (PENDING→SENT→DELIVERED→READ|FAILED), `externalId` (for idempotency)
- **Transaction** — `type` (INCOME|EXPENSE), `isPaid`, `paidAt`, `method` (PaymentMethod enum)
- **Campaign** — UTM fields, `budget`, `isActive`
- **Automation** — `triggerStageId`, `triggerSource`, `isActive`
- **AutomationStep** — `position`, `delayMinutes`, `messageTemplate`
- **AutomationEnrollment** — unique `[automationId, leadId]`, `currentStep` (Int), `nextRunAt`, `isCompleted`; indexed on `[isCompleted, nextRunAt]` for job queries

ActivityType enum: NOTE_ADDED, STAGE_CHANGED, TAG_ADDED, TAG_REMOVED, APPOINTMENT_CREATED, APPOINTMENT_COMPLETED, MESSAGE_SENT, MESSAGE_RECEIVED, PAYMENT_RECEIVED, LEAD_CREATED, SCORE_CHANGED, FIELD_UPDATED
