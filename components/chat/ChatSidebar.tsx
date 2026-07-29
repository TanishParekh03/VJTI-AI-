'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react'
import { MOCK_CONVERSATIONS, type Conversation } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

interface Props {
  conversations: Conversation[]
  currentConvId: string | null
  onSelectConv: (id: string) => void
  onNewChat: () => void
}

function groupConversations(convs: Conversation[]) {
  const now = Date.now()
  const DAY = 1000 * 60 * 60 * 24

  const today: Conversation[] = []
  const week: Conversation[] = []
  const older: Conversation[] = []

  convs.forEach((c) => {
    const diff = now - c.timestamp.getTime()
    if (diff < DAY) today.push(c)
    else if (diff < DAY * 7) week.push(c)
    else older.push(c)
  })

  return { today, week, older }
}

function ConvGroup({
  label,
  items,
  currentId,
  onSelect,
}: {
  label: string
  items: Conversation[]
  currentId: string | null
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(true)
  if (items.length === 0) return null

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 w-full px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {label}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {items.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-lg mb-0.5 group transition-colors',
                  currentId === c.id
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted text-foreground'
                )}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare className={cn('w-3.5 h-3.5 mt-0.5 shrink-0', currentId === c.id ? 'text-primary' : 'text-muted-foreground')} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{c.preview}</p>
                  </div>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ChatSidebar({ conversations, currentConvId, onSelectConv, onNewChat }: Props) {
  const [search, setSearch] = useState('')

  const filtered = conversations.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.preview.toLowerCase().includes(search.toLowerCase())
  )

  const { today, week, older } = groupConversations(filtered)

  return (
    <div className="h-full flex flex-col bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" />
          New chat
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 h-8 px-2.5 rounded-lg bg-muted border border-border">
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No conversations found</p>
          </div>
        ) : (
          <>
            <ConvGroup label="Today" items={today} currentId={currentConvId} onSelect={onSelectConv} />
            <ConvGroup label="Previous 7 days" items={week} currentId={currentConvId} onSelect={onSelectConv} />
            <ConvGroup label="Older" items={older} currentId={currentConvId} onSelect={onSelectConv} />
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
            PS
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">Dr. Priya Sharma</p>
            <p className="text-xs text-muted-foreground truncate">Admin</p>
          </div>
        </div>
      </div>
    </div>
  )
}
