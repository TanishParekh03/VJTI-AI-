'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, MessageSquare, FileText, BarChart2,
  Users, LogOut, X, ArrowRight, Hash, Sparkles
} from 'lucide-react'
import { MOCK_CONVERSATIONS, MOCK_DOCUMENTS } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import type { AppScreen } from '@/app/page'
import { useTranslation } from 'react-i18next'

interface Props {
  open: boolean
  onClose: () => void
  onNavigate: (screen: AppScreen) => void
  onLogout: () => void
}

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  action: () => void
  category: string
}

export default function CommandPalette({ open, onClose, onNavigate, onLogout }: Props) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const navItems: CommandItem[] = [
    { id: 'nav-chat', label: t('command.go_to_chat'), description: t('command.ai_assistant'), icon: <MessageSquare className="w-4 h-4" />, action: () => { onNavigate('chat'); onClose() }, category: t('command.navigation') },
    { id: 'nav-docs', label: t('command.go_to_documents'), description: t('command.document_library'), icon: <FileText className="w-4 h-4" />, action: () => { onNavigate('documents'); onClose() }, category: t('command.navigation') },
    { id: 'nav-analytics', label: t('command.go_to_analytics'), description: t('command.usage_statistics'), icon: <BarChart2 className="w-4 h-4" />, action: () => { onNavigate('analytics'); onClose() }, category: t('command.navigation') },
    { id: 'nav-admin', label: t('command.go_to_admin'), description: t('command.user_management'), icon: <Users className="w-4 h-4" />, action: () => { onNavigate('admin'); onClose() }, category: t('command.navigation') },
    { id: 'logout', label: t('command.log_out'), icon: <LogOut className="w-4 h-4" />, action: () => { onLogout(); onClose() }, category: t('command.account') },
  ]

  const convItems: CommandItem[] = MOCK_CONVERSATIONS.slice(0, 4).map((c) => ({
    id: `conv-${c.id}`,
    label: c.title,
    description: c.preview,
    icon: <Hash className="w-4 h-4" />,
    action: () => { onNavigate('chat'); onClose() },
    category: t('command.recent_conversations'),
  }))

  const [apiDocs, setApiDocs] = useState<any[]>([])

  useEffect(() => {
    if (!open) return
    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
    const token = typeof window !== 'undefined' ? localStorage.getItem('hte_access_token') : null
    fetch(`${API_BASE}/documents`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setApiDocs(data)
        }
      })
      .catch(() => {})
  }, [open])

  const docSources = apiDocs.length > 0 ? apiDocs : MOCK_DOCUMENTS

  const docItems: CommandItem[] = docSources.slice(0, 6).map((d: any) => ({
    id: `doc-${d.id}`,
    label: d.title,
    description: d.category || 'General',
    icon: <FileText className="w-4 h-4" />,
    action: () => { onNavigate('documents'); onClose() },
    category: t('command.documents'),
  }))

  const allItems = [...navItems, ...convItems, ...docItems]
  const filtered = query
    ? allItems.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.description?.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase())
      )
    : allItems

  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  const flatFiltered = Object.values(grouped).flat()

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((prev) => Math.min(prev + 1, flatFiltered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      flatFiltered[active]?.action()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  let itemIndex = 0

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 z-50 w-full max-w-lg"
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setActive(0) }}
                  onKeyDown={handleKey}
                  placeholder={t('command.search_placeholder')}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
                <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-muted text-xs text-muted-foreground">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div ref={listRef} className="max-h-80 overflow-y-auto py-1.5">
                {flatFiltered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Sparkles className="w-6 h-6 text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">{t('command.no_results')} &ldquo;{query}&rdquo;</p>
                  </div>
                ) : (
                  Object.entries(grouped).map(([category, items]) => (
                    <div key={category}>
                      <p className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {category}
                      </p>
                      {items.map((item) => {
                        const idx = itemIndex++
                        return (
                          <button
                            key={item.id}
                            onMouseEnter={() => setActive(idx)}
                            onClick={item.action}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                              active === idx ? 'bg-primary/10' : 'hover:bg-muted'
                            )}
                          >
                            <span className={cn('shrink-0 transition-colors', active === idx ? 'text-primary' : 'text-muted-foreground')}>
                              {item.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className={cn('text-sm font-medium', active === idx ? 'text-primary' : 'text-foreground')}>
                                {item.label}
                              </p>
                              {item.description && (
                                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                              )}
                            </div>
                            {active === idx && <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer hint */}
              <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border bg-muted/40">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <kbd className="px-1.5 py-0.5 rounded border border-border bg-background text-[10px]">↑↓</kbd>
                  {t('command.navigate')}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <kbd className="px-1.5 py-0.5 rounded border border-border bg-background text-[10px]">↵</kbd>
                  {t('command.select')}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
