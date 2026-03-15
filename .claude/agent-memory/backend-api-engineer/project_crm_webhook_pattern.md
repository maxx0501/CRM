---
name: CRM webhook pattern for inbound WhatsApp
description: How the /webhooks/whatsapp/:workspaceId endpoint works and its security model
type: project
---

Endpoint: `POST /webhooks/whatsapp/:workspaceId` (no JWT, public).

Security: validates `workspace.whatsappApiKey` against `Authorization: Bearer <key>` or `x-api-key` header. Returns 401 on mismatch; returns 200 (not 401) for missing workspace to avoid exposing valid IDs.

Pattern:
1. Validate API key from workspace record
2. Parse payload with lenient Zod schema (supports `body` or `message` field, `id` or `messageId`)
3. Idempotency check via `Message.externalId` — skip duplicates
4. **Reply 202 immediately** before processing
5. In a transaction: upsert Conversation by `[workspaceId, whatsappPhone]`, create Lead in default pipeline stage if new contact, create inbound Message, create Activity on lead

**Why:** Unofficial WA APIs have varying payload shapes; lenient schema prevents silent drops. 202 before processing prevents timeout retries.

Phone normalization: strip all non-digit characters from `from` field before storing.
