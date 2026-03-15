'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/use-api'
import { formatDateTime, cn } from '@/lib/utils'
import type { ApiResponse } from '@crm/shared'
import {
  MessageSquare,
  Send,
  Search,
  Phone,
  User,
  ArrowLeft,
  MoreVertical,
  CheckCheck,
  Clock,
  Smile,
  Paperclip,
} from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConversationSummary {
  id: string
  whatsappPhone: string
  lastMessageAt: string
  unreadCount?: number
  lastMessageContent?: string
  lead?: { id: string; name: string } | null
}

interface Message {
  id: string
  direction: 'INBOUND' | 'OUTBOUND'
  content?: string | null
  status?: 'sent' | 'delivered' | 'read'
  createdAt: string
}

interface ConversationDetail {
  id: string
  whatsappPhone: string
  lastMessageAt: string
  lead?: { id: string; name: string } | null
  messages: Message[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted/60', className)} />
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function formatTime(date: string) {
  const d = new Date(date)
  const now = new Date()
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()

  if (isToday) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  return formatDateTime(date)
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, phone, size = 'md' }: { name?: string | null; phone: string; size?: 'sm' | 'md' | 'lg' }) {
  const display = name || phone
  const initials = getInitials(display)
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12 text-base' }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary',
        sizes[size],
      )}
    >
      {initials}
    </div>
  )
}

// ─── Conversation List Item ───────────────────────────────────────────────────

interface ListItemProps {
  conversation: ConversationSummary
  isActive: boolean
  onClick: () => void
}

function ConversationListItem({ conversation: c, isActive, onClick }: ListItemProps) {
  const name = c.lead?.name || c.whatsappPhone
  const preview = c.lastMessageContent || 'Nenhuma mensagem ainda'
  const hasUnread = (c.unreadCount ?? 0) > 0

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all',
        isActive
          ? 'bg-primary/10 border border-primary/20'
          : 'hover:bg-accent border border-transparent',
      )}
    >
      <Avatar name={c.lead?.name} phone={c.whatsappPhone} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <p className={cn('truncate text-sm', hasUnread ? 'font-semibold' : 'font-medium')}>
            {name}
          </p>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {formatTime(c.lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <p className={cn('truncate text-xs', hasUnread ? 'text-foreground' : 'text-muted-foreground')}>
            {preview}
          </p>
          {hasUnread && (
            <span className="flex h-4.5 min-w-[18px] shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {c.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message: msg }: { message: Message }) {
  const isOutbound = msg.direction === 'OUTBOUND'

  return (
    <div className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm',
          isOutbound
            ? 'rounded-br-sm bg-primary text-primary-foreground'
            : 'rounded-bl-sm bg-muted text-foreground',
        )}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
        <div
          className={cn(
            'mt-1 flex items-center gap-1',
            isOutbound ? 'justify-end' : 'justify-start',
          )}
        >
          <span
            className={cn(
              'text-[10px]',
              isOutbound ? 'text-primary-foreground/70' : 'text-muted-foreground',
            )}
          >
            {formatTime(msg.createdAt)}
          </span>
          {isOutbound && (
            <CheckCheck
              className={cn(
                'h-3 w-3',
                msg.status === 'read'
                  ? 'text-blue-300'
                  : 'text-primary-foreground/60',
              )}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Date Divider ─────────────────────────────────────────────────────────────

function DateDivider({ date }: { date: string }) {
  const d = new Date(date)
  const now = new Date()
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()

  const label = isToday
    ? 'Hoje'
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 border-t" />
      <span className="rounded-full bg-muted px-3 py-0.5 text-[11px] text-muted-foreground font-medium whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 border-t" />
    </div>
  )
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────

interface ChatPanelProps {
  conversationId: string | null
  onBack: () => void
}

function ChatPanel({ conversationId, onBack }: ChatPanelProps) {
  const { api } = useApi()
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { data: selected, isLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => api<ApiResponse<ConversationDetail>>(`/conversations/${conversationId}/messages`),
    enabled: !!conversationId,
    refetchInterval: 10_000, // poll every 10s
  })

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      api(`/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      setMessage('')
    },
  })

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selected?.data?.messages])

  // Group messages by date
  const groupedMessages = useCallback(() => {
    const msgs = selected?.data?.messages ?? []
    const groups: { date: string; messages: Message[] }[] = []
    let currentDate = ''

    for (const msg of msgs) {
      const d = new Date(msg.createdAt)
      const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (dateKey !== currentDate) {
        currentDate = dateKey
        groups.push({ date: msg.createdAt, messages: [msg] })
      } else {
        groups[groups.length - 1].messages.push(msg)
      }
    }
    return groups
  }, [selected?.data?.messages])

  function handleSend() {
    if (message.trim() && !sendMutation.isPending) {
      sendMutation.mutate(message.trim())
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Empty state
  if (!conversationId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center p-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
          <MessageSquare className="h-10 w-10 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-base font-semibold">Selecione uma conversa</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha uma conversa na lista para visualizar as mensagens
          </p>
        </div>
      </div>
    )
  }

  const conv = selected?.data
  const name = conv?.lead?.name || conv?.whatsappPhone || ''
  const groups = groupedMessages()

  return (
    <>
      {/* Chat header */}
      <div className="flex items-center gap-3 border-b px-4 py-3 bg-card/95 backdrop-blur-sm">
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors lg:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        {isLoading ? (
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ) : (
          <>
            <Avatar name={conv?.lead?.name} phone={conv?.whatsappPhone ?? ''} size="md" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {conv?.whatsappPhone}
              </p>
            </div>
            {conv?.lead && (
              <button className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors" title="Ver lead">
                <User className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            <button className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors">
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {isLoading ? (
          <div className="space-y-4">
            {[70, 50, 80, 60].map((w, i) => (
              <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
                <div className="h-12 animate-pulse rounded-2xl bg-muted/60" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center py-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <MessageSquare className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Nenhuma mensagem ainda</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Inicie a conversa enviando uma mensagem.</p>
            </div>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.date} className="space-y-1">
              <DateDivider date={group.date} />
              {group.messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="border-t bg-card/95 backdrop-blur-sm px-4 py-3">
        <div className="flex items-end gap-2">
          <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-accent transition-colors mb-0.5">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex-1 rounded-xl border border-input bg-background focus-within:ring-2 focus-within:ring-ring transition-shadow">
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value)
                // Auto-resize
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={handleKeyDown}
              placeholder="Digite uma mensagem... (Enter para enviar)"
              rows={1}
              className="w-full resize-none rounded-xl bg-transparent px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none"
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
          </div>
          <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-accent transition-colors mb-0.5">
            <Smile className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={handleSend}
            disabled={!message.trim() || sendMutation.isPending}
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all mb-0.5',
              message.trim() && !sendMutation.isPending
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
            )}
          >
            {sendMutation.isPending ? (
              <Clock className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground/60">
          Shift+Enter para quebrar linha
        </p>
      </div>
    </>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ConversationsPage() {
  const { api } = useApi()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showChat, setShowChat] = useState(false)

  const { data: convos, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api<ApiResponse<ConversationSummary[]>>('/conversations'),
    refetchInterval: 15_000,
  })

  const conversations = convos?.data ?? []

  const filtered = conversations.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.lead?.name.toLowerCase().includes(q) ||
      c.whatsappPhone.includes(q)
    )
  })

  const isEmpty = !isLoading && conversations.length === 0

  function selectConversation(id: string) {
    setSelectedId(id)
    setShowChat(true)
  }

  function handleBack() {
    setShowChat(false)
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-0 overflow-hidden rounded-xl border">
      {/* ── Left panel: conversation list ── */}
      <div
        className={cn(
          'flex w-full flex-col border-r lg:w-[320px] xl:w-[360px]',
          // On mobile: hide list when chat is open
          showChat ? 'hidden lg:flex' : 'flex',
        )}
      >
        {/* Panel header */}
        <div className="border-b bg-card/95 backdrop-blur-sm px-4 py-3">
          <h2 className="text-base font-semibold">Conversas</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {conversations.length} conversa{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Search */}
        <div className="px-3 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversas..."
              className="flex h-9 w-full rounded-lg border border-input bg-muted/40 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {isEmpty && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <MessageSquare className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="mt-3 text-sm font-medium">Nenhuma conversa ainda</p>
              <p className="mt-1 text-xs text-muted-foreground">
                As conversas aparecerão aqui quando leads enviarem mensagens via WhatsApp.
              </p>
            </div>
          )}

          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-10" />
                  </div>
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}

          {!isLoading && filtered.length === 0 && conversations.length > 0 && (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">Nenhuma conversa encontrada.</p>
            </div>
          )}

          {filtered.map((c) => (
            <ConversationListItem
              key={c.id}
              conversation={c}
              isActive={selectedId === c.id}
              onClick={() => selectConversation(c.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Right panel: chat ── */}
      <div
        className={cn(
          'flex flex-1 flex-col bg-background/50',
          // On mobile: show only when a chat is selected
          !showChat && selectedId ? 'hidden lg:flex' : 'flex',
          !selectedId && !showChat ? 'hidden lg:flex' : '',
        )}
      >
        <ChatPanel
          conversationId={selectedId}
          onBack={handleBack}
        />
      </div>
    </div>
  )
}
