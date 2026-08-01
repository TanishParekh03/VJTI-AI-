'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Copy, Bookmark, BookmarkCheck, RotateCcw, Download,
  ChevronDown, ChevronUp, CheckCircle2, AlertCircle, HelpCircle,
  Sparkles, ThumbsUp, ThumbsDown, Volume2, VolumeX, FileText
} from 'lucide-react'
import type { Message } from '@/lib/mock-data'
import SourceCard from './SourceCard'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface Props {
  message: Message
  onFollowUp?: (q: string) => void
  onBookmark?: (id: string) => void
  onRegenerate?: (id: string) => void
  onCopy?: (content: string) => void
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('hte_access_token')
}

const ConfidenceBadge = ({ level }: { level: 'high' | 'medium' | 'none' }) => {
  const { t } = useTranslation()
  const cfg = {
    high: {
      icon: <CheckCircle2 className="w-3 h-3" />,
      label: t('chat.high_confidence'),
      className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900/40',
    },
    medium: {
      icon: <AlertCircle className="w-3 h-3" />,
      label: t('chat.medium_confidence'),
      className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40',
    },
    none: {
      icon: <HelpCircle className="w-3 h-3" />,
      label: t('chat.no_matching_document'),
      className: 'bg-muted text-muted-foreground border-border',
    },
  }[level]

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', cfg.className)}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

export default function ChatMessage({ message, onFollowUp, onBookmark, onRegenerate, onCopy }: Props) {
  const { t } = useTranslation()
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [bookmarked, setBookmarked] = useState(message.bookmarked ?? false)
  const [feedback, setFeedback] = useState<'helpful' | 'not_helpful' | null>(
    (message as any).feedback ?? null
  )
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const isUser = message.role === 'user'

  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    } else {
      const utterance = new SpeechSynthesisUtterance(message.content)
      utterance.onend = () => setIsSpeaking(false)
      setIsSpeaking(true)
      window.speechSynthesis.speak(utterance)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    onCopy?.(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleBookmark = () => {
    setBookmarked(!bookmarked)
    onBookmark?.(message.id)
  }

  const handleFeedback = async (value: 'helpful' | 'not_helpful') => {
    if (feedbackLoading) return
    // Toggle off if clicking the same one
    const newValue = feedback === value ? null : value
    setFeedback(newValue)
    setFeedbackLoading(true)
    try {
      const token = getAuthToken()
      await fetch(`${API_BASE}/chat/messages/${message.id}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ feedback: newValue }),
      })
    } catch {
      // Revert on error
      setFeedback(feedback)
    } finally {
      setFeedbackLoading(false)
    }
  }

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed">
          {message.content}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-4 mb-8"
    >
      {/* Avatar */}
      <div className="shrink-0 w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mt-1">
        <Sparkles className="w-4 h-4 text-[#1a73e8]" />
      </div>

      {/* Content bubble */}
      <div className="flex-1 min-w-0">
        <div className="bg-white border border-[#dadce0] rounded-2xl rounded-tl-sm px-5 pt-4 pb-4 shadow-sm">
          {/* Top Header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground/80 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#1a73e8]" />
              AI Answer
            </span>
            {message.confidence && (
              <ConfidenceBadge level={message.confidence} />
            )}
          </div>
          <div className="w-full h-px bg-border/60 mb-4" />

          {/* Markdown content */}
          <div className="ai-prose text-[#3c4043] text-[15px] font-serif leading-[1.9]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>

          {/* Sources */}
          {message.sources && message.sources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/60">
              <button
                onClick={() => setSourcesOpen(!sourcesOpen)}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:opacity-80 transition-opacity"
              >
                {sourcesOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {message.sources.length} {message.sources.length !== 1 ? t('chat.sources_pl') : t('chat.source')} {t('chat.cited')}
              </button>

              {sourcesOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2.5 grid gap-2 sm:grid-cols-2 overflow-hidden"
                >
                  {message.sources.map((source, i) => (
                    <SourceCard key={source.id} source={source} index={i} />
                  ))}
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Actions row */}
        <div className="flex items-center justify-end gap-2 mt-3 ml-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-transparent hover:bg-muted/50 hover:border-border text-[13px] font-medium text-muted-foreground transition-all duration-[180ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? 'Copied!' : 'Copy answer'}
          </button>
          
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-transparent hover:bg-muted/50 hover:border-border text-[13px] font-medium text-muted-foreground transition-all duration-[180ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]">
            <FileText className="w-3.5 h-3.5" />
            View full document
          </button>
        </div>

        {/* Follow-up suggestions */}
        {message.followUps && message.followUps.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.followUps.map((q) => (
              <button
                key={q}
                onClick={() => onFollowUp?.(q)}
                className="px-3 py-1.5 rounded-full border border-border bg-card text-xs text-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
