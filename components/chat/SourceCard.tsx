'use client'

import { useState } from 'react'
import { FileText, File, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import type { Source } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface Props {
  source: Source
  index: number
}

const typeIcons: Record<string, React.ReactNode> = {
  PDF: <FileText className="w-3.5 h-3.5" />,
  DOCX: <File className="w-3.5 h-3.5" />,
  Circular: <FileText className="w-3.5 h-3.5" />,
}

const typeBg: Record<string, string> = {
  PDF: 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/40',
  DOCX: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/40',
  Circular: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40',
}

export default function SourceCard({ source, index }: Props) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden text-sm">
      <div
        className="flex items-start gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Index badge */}
        <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
          {index + 1}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-medium text-foreground truncate">{source.title}</p>
            <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border font-medium shrink-0', typeBg[source.type])}>
              {typeIcons[source.type]}
              {source.type}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('chat.page')} {source.page} · {source.section}
          </p>
        </div>

        {/* Expand toggle */}
        <div className="shrink-0 text-muted-foreground">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </div>

      {/* Expanded snippet */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-border/60">
          <p className="text-xs text-muted-foreground mt-2.5 leading-relaxed italic">
            &ldquo;{source.snippet}&rdquo;
          </p>
          {source.document_id ? (
            <button 
              onClick={() => {
                const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
                window.open(`${API_BASE}/documents/${source.document_id}/download`, '_blank')
              }}
              className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              {t('chat.view_full_document')}
            </button>
          ) : (
            <button className="mt-2 flex items-center gap-1 text-xs text-muted-foreground cursor-not-allowed" title="Document file unavailable">
              <ExternalLink className="w-3 h-3" />
              {t('chat.view_full_document')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
