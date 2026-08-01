'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Paperclip, Sparkles, GraduationCap, Zap,
  RefreshCw, CheckSquare, Map as MapIcon, Users, ChevronRight, PanelRight,
  Mic, MicOff, FileText, Search
} from 'lucide-react'
import { SUGGESTED_PROMPTS, type Message, type Conversation } from '@/lib/mock-data'
import ChatSidebar from './ChatSidebar'
import ChatMessage from './ChatMessage'
import SourceCard from './SourceCard'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

const ICON_MAP: Record<string, React.ElementType> = {
  GraduationCap, Zap, RefreshCw, CheckSquare, Map: MapIcon, Users,
}

// Backend API base URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('hte_access_token')
}

function ThinkingIndicator() {
  const { t } = useTranslation()
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mt-1">
        <Sparkles className="w-4 h-4 text-primary animate-pulse" />
      </div>
      <div className="flex-1 bg-card border border-border rounded-2xl rounded-tl-sm px-4 pt-3.5 pb-4 shadow-sm max-w-[85%]">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <span className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
          {t('chat.searching') || "Searching for information..."}
        </div>
        
        {/* Skeleton lines for the answer block */}
        <div className="space-y-2.5 animate-pulse mt-2">
          <div className="h-[14px] bg-muted/60 rounded-full w-[100%]"></div>
          <div className="h-[14px] bg-muted/60 rounded-full w-[85%]"></div>
          <div className="h-[14px] bg-muted/60 rounded-full w-[60%]"></div>
        </div>
      </div>
    </div>
  )
}

function StreamingMessage({ content }: { content: string }) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mt-1">
        <Sparkles className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 bg-card border border-border rounded-2xl rounded-tl-sm px-4 pt-3.5 pb-3 shadow-sm">
        <div className="ai-prose text-foreground text-sm whitespace-pre-wrap">
          {content}
          <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onPrompt }: { onPrompt: (text: string) => void }) {
  const CATEGORIES = [
    { label: 'Admissions', color: 'bg-blue-50 text-blue-500 border-blue-200' },
    { label: 'Scholarships', color: 'bg-amber-50 text-amber-500 border-amber-200' },
    { label: 'Institutions', color: 'bg-teal-50 text-teal-500 border-teal-200' },
    { label: 'Policies', color: 'bg-violet-50 text-violet-500 border-violet-200' },
    { label: 'Placements', color: 'bg-green-50 text-green-500 border-green-200' },
    { label: 'Exams', color: 'bg-rose-50 text-rose-500 border-rose-200' },
  ]

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-16 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center w-full max-w-3xl mb-8"
      >
        <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4 tracking-[-0.03em] leading-tight text-balance">
          Ask anything about HTE policies, circulars & guidelines
        </h1>
        <p className="text-muted-foreground text-[17px] mb-8">
          Answers grounded in official documents.
        </p>
        <div className="w-full h-px bg-border max-w-xl mx-auto mb-8" />
        
        {/* Suggestion Chips */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {SUGGESTED_PROMPTS.slice(0, 3).map((prompt, i) => (
            <button
              key={prompt.label}
              onClick={() => onPrompt(prompt.label)}
              className="flex items-center gap-2.5 px-4 py-2 rounded-full border border-border bg-card hover:border-primary/30 hover:bg-muted transition-all text-sm font-medium text-foreground whitespace-nowrap"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#1a73e8]" />
              {prompt.label}
            </button>
          ))}
        </div>

        {/* How it works strip */}
        <div className="flex items-center justify-center gap-2 sm:gap-6 mb-16 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1a73e8] flex items-center justify-center border border-blue-100">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-muted-foreground font-medium hidden sm:inline">Ask</span>
          </div>
          <div className="w-8 sm:w-16 border-t-2 border-dashed border-border" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <RefreshCw className="w-4 h-4" />
            </div>
            <span className="text-muted-foreground font-medium hidden sm:inline">Search</span>
          </div>
          <div className="w-8 sm:w-16 border-t-2 border-dashed border-border" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <CheckSquare className="w-4 h-4" />
            </div>
            <span className="text-muted-foreground font-medium hidden sm:inline">Verify</span>
          </div>
        </div>

        {/* Section transition */}
        <div className="flex items-center gap-4 mb-10 w-full max-w-2xl mx-auto">
          <div className="flex-1 h-px bg-border" />
          <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">Browse</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full max-w-2xl mx-auto">
          {CATEGORIES.map((cat, i) => (
            <button
              key={cat.label}
              className="group flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${cat.color}`}>
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-[15px] font-medium text-foreground">{cat.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/0 group-hover:text-primary group-hover:text-muted-foreground/100 transition-all -translate-x-2 group-hover:translate-x-0" />
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

export default function ChatScreen() {
  const { t, i18n } = useTranslation()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConvId, setCurrentConvId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [streamingText, setStreamingText] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [chatMode, setChatMode] = useState<'grounded' | 'general'>('grounded')
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // Track whether we are currently streaming — prevents fetchHistory from firing mid-stream
  const isStreamingRef = useRef(false)

  const currentConv = conversations.find((c) => c.id === currentConvId) ?? null
  const messages = currentConv?.messages ?? []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking, streamingText])

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript
        }
        setInput(prev => {
          const newText = prev + (prev.endsWith(' ') || prev.length === 0 ? '' : ' ') + currentTranscript
          return newText
        })
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error)
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }
  }, [])

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    } else {
      recognitionRef.current?.start()
      setIsListening(true)
    }
  }

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2500)
  }, [])

  // ── Fetch sessions list (sidebar only, never overwrites active messages) ────
  const fetchSessions = useCallback(async () => {
    try {
      const token = getAuthToken()
      const res = await fetch(`${API_BASE}/chat/sessions`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          const mapped: Conversation[] = data.map((s: any) => ({
            id: s.id,
            title: s.title,
            preview: s.preview || s.title,
            timestamp: new Date(s.updated_at || Date.now()),
            messageCount: s.message_count || 0,
            messages: [],
          }))
          // Merge: keep any in-memory messages, just add new sessions to sidebar
          setConversations((prev) => {
            const prevById = new Map(prev.map((c) => [c.id, c]))
            const freshById = new Map(mapped.map((c) => [c.id, c]))
            // Preserve all local conversations with messages; add new backend ones
            const merged: Conversation[] = []
            for (const fresh of mapped) {
              const local = prevById.get(fresh.id)
              merged.push(local && local.messages.length > 0 ? { ...fresh, messages: local.messages } : fresh)
            }
            // Keep any local-only (temp c-) conversations not yet on backend
            for (const local of prev) {
              if (!freshById.has(local.id)) merged.push(local)
            }
            return merged
          })
        }
      }
    } catch {
      // Backend offline — ignore
    }
  }, [])

  // ── Fetch message history for a conversation ───────────────────────────────
  const fetchHistory = useCallback(async (convId: string) => {
    if (!convId || convId.startsWith('c-') || isStreamingRef.current) return
    try {
      const token = getAuthToken()
      const res = await fetch(`${API_BASE}/chat/history/${convId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        if (data && Array.isArray(data.messages)) {
          const loadedMsgs: Message[] = data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            confidence: m.confidence || (m.confidence_score ? 'high' : undefined),
            confidenceScore: m.confidence_score,
            sources: m.sources
              ? m.sources.map((src: any) => ({
                  id: src.id,
                  title: src.title,
                  type: src.type || 'PDF',
                  page: src.page ? parseInt(src.page) : undefined,
                  section: src.section,
                  snippet: src.snippet || '',
                  document_id: src.document_id,
                }))
              : [],
            timestamp: new Date(m.created_at || Date.now()),
          }))

          setConversations((prev) =>
            prev.map((c) => {
              if (c.id === convId && loadedMsgs.length > 0) {
                // Only update if we got more messages than we have locally
                if (loadedMsgs.length >= c.messages.length) {
                  return { ...c, messages: loadedMsgs }
                }
              }
              return c
            })
          )
        }
      }
    } catch {
      // Ignore
    }
  }, [])

  // Load sessions on mount
  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  // Load history when user explicitly selects a past conversation
  const handleSelectConv = useCallback((convId: string) => {
    setCurrentConvId(convId)
    fetchHistory(convId)
  }, [fetchHistory])

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isThinking) return

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    }

    // Optimistically add user message
    let convId = currentConvId
    if (!convId) {
      convId = `c-${Date.now()}`
      const newConv: Conversation = {
        id: convId,
        title: text.trim().slice(0, 40) + (text.length > 40 ? '…' : ''),
        preview: text.trim(),
        timestamp: new Date(),
        messageCount: 1,
        messages: [userMsg],
      }
      setConversations((prev) => [newConv, ...prev])
      setCurrentConvId(convId)
    } else {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? { ...c, messages: [...c.messages, userMsg], messageCount: c.messageCount + 1 }
            : c
        )
      )
    }

    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setIsThinking(true)
    isStreamingRef.current = true

    const token = getAuthToken()
    // Only send a real UUID to backend; temp c- IDs are frontend-only
    const payloadConvId = convId && !convId.startsWith('c-') ? convId : null

    try {
      const response = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text.trim(),
          conversation_id: payloadConvId,
          language: i18n.language,
          mode: chatMode,
        }),
      })

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      let finalSources: Message['sources'] = []
      let finalConfidence: Message['confidence'] = 'medium'
      // backendConvId starts as the same convId (or temp); updated when 'done' event arrives
      let backendConvId = convId
      let hasReceivedData = false

      while (true) {
        const { done, value } = await reader.read()
        
        if (!hasReceivedData && !done) {
          setIsThinking(false)
          hasReceivedData = true
        }

        if (done) break

        const raw = decoder.decode(value, { stream: true })
        const lines = raw.split('\n')

        let currentEvent = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (currentEvent === 'token') {
                accumulated += data.content ?? ''
                setStreamingText(accumulated)
              } else if (currentEvent === 'sources') {
                finalSources = (data.sources ?? []).map((s: any, i: number) => ({
                  id: s.id ?? `src-${i}`,
                  title: s.title,
                  type: s.type ?? 'PDF',
                  page: s.page ?? '',
                  section: s.section ?? '',
                  snippet: s.snippet ?? '',
                  document_id: s.document_id,
                }))
                const score: number = data.confidence ?? 0
                finalConfidence = score >= 0.70 ? 'high' : score >= 0.40 ? 'medium' : 'none'
              } else if (currentEvent === 'not_found') {
                accumulated = data.message ?? 'No supporting information found in official HTE documents.'
                setStreamingText(accumulated)
              } else if (currentEvent === 'error') {
                accumulated = `⚠️ ${data.message ?? 'An error occurred. Please try again.'}`
                setStreamingText(accumulated)
              } else if (currentEvent === 'done') {
                if (data.conversation_id) backendConvId = data.conversation_id
              }
            } catch { /* non-JSON line, skip */ }
          }
        }
      }

      setStreamingText(null)
      isStreamingRef.current = false

      const aiMsg: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: accumulated,
        timestamp: new Date(),
        confidence: finalConfidence,
        sources: finalSources,
        followUps: [],
      }

      // Atomically: rename temp c- ID → real backend UUID AND append AI message.
      // Do this in ONE setConversations call to avoid any flicker.
      const finalConvId = backendConvId || convId
      setConversations((prev) => {
        const updated = prev.map((c) => {
          if (c.id === convId || c.id === finalConvId) {
            return {
              ...c,
              id: finalConvId,
              title: c.title,
              messages: [...c.messages, aiMsg],
              messageCount: c.messages.length + 1,
            }
          }
          return c
        })
        return updated
      })

      // Only update currentConvId if the backend gave us a real UUID different from temp
      if (finalConvId !== convId) {
        // Use functional update trick: set to same value after conversations updated
        setCurrentConvId(finalConvId)
      }

    } catch (err) {
      console.error('Chat SSE error:', err)
      setIsThinking(false)
      setStreamingText(null)
      isStreamingRef.current = false
      showToast('Connection error. Is the backend server running?')
    }
  }, [currentConvId, isThinking, showToast])

  const handleInputKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }

  const handleNewChat = () => {
    setCurrentConvId(null)
  }

  const currentSources = messages.flatMap((m) => m.sources ?? [])

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 overflow-hidden"
          >
            <ChatSidebar
              conversations={conversations}
              currentConvId={currentConvId}
              onSelectConv={handleSelectConv}
              onNewChat={handleNewChat}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 border-x border-border">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <svg width="14" height="12" viewBox="0 0 14 12" fill="none">
                <rect y="0" width="14" height="1.5" rx="0.75" fill="currentColor" />
                <rect y="5.25" width="10" height="1.5" rx="0.75" fill="currentColor" />
                <rect y="10.5" width="14" height="1.5" rx="0.75" fill="currentColor" />
              </svg>
            </button>
            <span className="text-sm font-medium text-foreground truncate">
              {currentConv?.title ?? t('chat.new_conversation')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex bg-muted p-0.5 rounded-lg border border-border">
              <button
                onClick={() => setChatMode('grounded')}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-all",
                  chatMode === 'grounded' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Grounded
              </button>
              <button
                onClick={() => setChatMode('general')}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-all",
                  chatMode === 'general' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                General
              </button>
            </div>
            <button
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className={cn(
                'w-7 h-7 flex items-center justify-center rounded-md transition-colors',
                rightPanelOpen ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <PanelRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !isThinking && !streamingText ? (
            <EmptyState onPrompt={(text) => sendMessage(text)} />
          ) : (
            <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onFollowUp={sendMessage}
                  onBookmark={() => showToast(t('chat.bookmarked'))}
                  onCopy={() => showToast(t('chat.copied'))}
                  onRegenerate={() => {}}
                />
              ))}
              {isThinking && <ThinkingIndicator />}
              {streamingText && <StreamingMessage content={streamingText} />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="px-4 pb-4 pt-3 border-t border-border bg-background shrink-0">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-end gap-2 px-3 py-2 rounded-2xl border border-input bg-card shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-ring" style={{ transition: 'all 0.18s ease' }}>
              <div className="shrink-0 mb-3 ml-1 text-muted-foreground">
                <Search className="w-5 h-5 text-muted-foreground/70" />
              </div>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleInputKey}
                placeholder={t('chat.ask_question')}
                rows={1}
                className="flex-1 bg-transparent resize-none text-[15px] text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[52px] max-h-40 leading-[52px] py-0"
              />
              <button
                onClick={toggleListening}
                className={cn(
                  'shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mb-1.5',
                  isListening ? 'text-red-500 bg-red-500/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
                style={{ transition: 'all 0.18s ease' }}
                title={isListening ? "Stop listening" : "Start dictating"}
              >
                {isListening ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isThinking}
                className={cn(
                  'shrink-0 w-10 h-10 rounded-xl flex items-center justify-center mb-1.5',
                  input.trim() && !isThinking
                    ? 'bg-primary text-primary-foreground hover:opacity-90'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
                style={{ transition: 'all 0.18s ease' }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-center text-[11px] text-muted-foreground/60 mt-2">
              Answers are grounded in official documents only. Always verify with the department for legal matters.
            </p>
          </div>
        </div>
      </div>

      {/* Right sources panel */}
      <AnimatePresence initial={false}>
        {rightPanelOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 overflow-hidden border-l border-border bg-sidebar"
          >
            <div className="h-full flex flex-col p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Sources in this session</h3>
              {currentSources.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-2">
                    <Sparkles className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground">No sources yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Sources will appear here as you ask questions</p>
                </div>
              ) : (
                <div className="overflow-y-auto space-y-2">
                  {currentSources.map((source, i) => (
                    <SourceCard key={source.id + i} source={source} index={i} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background text-sm px-4 py-2 rounded-full shadow-lg"
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
