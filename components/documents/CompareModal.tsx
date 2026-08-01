import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { GitCompare, X, Sparkles, AlertTriangle, FileText, File, Layers } from 'lucide-react'
import { type Document } from '@/lib/mock-data'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('hte_access_token') : null
}

const fileTypeIcon: Record<string, React.ReactNode> = {
  PDF: <FileText className="w-4 h-4 text-red-500" />,
  DOCX: <File className="w-4 h-4 text-blue-500" />,
  XLSX: <Layers className="w-4 h-4 text-green-500" />,
}

interface CompareResult {
  comparison: string
  doc_a_title: string
  doc_b_title: string
}

export default function CompareModal({
  docA,
  docB,
  onClose,
}: {
  docA: Document
  docB: Document
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [result, setResult] = useState<CompareResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function runCompare() {
      setLoading(true)
      setError(null)
      try {
        const token = getToken()
        const res = await fetch(`${API_BASE}/documents/compare`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ doc_id_a: docA.id, doc_id_b: docB.id }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.detail || `HTTP ${res.status}`)
        }
        const data: CompareResult = await res.json()
        if (!cancelled) setResult(data)
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Comparison failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    runCompare()
    return () => { cancelled = true }
  }, [docA.id, docB.id])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="w-full max-w-4xl max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <GitCompare className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-foreground">{t('docs.document_comparison')}</h2>
            <p className="text-xs text-muted-foreground truncate">
              {t('docs.ai_policy_analysis')}
            </p>
          </div>
          <button
            onClick={onClose}
            title={t('docs.close')}
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Document labels */}
        <div className="grid grid-cols-2 gap-px bg-border border-b border-border">
          {[docA, docB].map((doc, i) => (
            <div key={doc.id} className={cn('px-5 py-3 bg-card', i === 0 ? 'border-r border-border' : '')}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                {i === 0 ? t('docs.document_a') : t('docs.document_b')}
              </p>
              <div className="flex items-center gap-2">
                {fileTypeIcon[doc.fileType]}
                <p className="text-sm font-semibold text-foreground truncate">{doc.title}</p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{doc.category} · {new Date(doc.uploadDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">{t('docs.analysing_documents')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('docs.ai_generating_comparison')}</p>
              </div>
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-sm font-medium text-foreground">{t('docs.comparison_failed')}</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          )}
          {result && !loading && (
            <div className="ai-prose text-foreground text-sm leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {result.comparison}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-primary" />
            {t('docs.generated_by')}
          </p>
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition"
          >
            {t('docs.close')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
