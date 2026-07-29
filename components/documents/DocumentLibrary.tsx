'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  FileText, File, Search, LayoutGrid, LayoutList,
  Upload, Filter, X, CheckCircle, Clock, AlertTriangle,
  ChevronRight, Tag, Calendar, Layers, MoreHorizontal,
  BookOpen, GitCompare, Loader2, Sparkles, CheckSquare, Square
} from 'lucide-react'
import { MOCK_DOCUMENTS, DOC_CATEGORIES, type Document, type DocStatus } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('hte_access_token') : null
}

const statusCfg: Record<DocStatus, { label: string; icon: React.ReactNode; className: string }> = {
  Indexed: {
    label: 'Indexed',
    icon: <CheckCircle className="w-3 h-3" />,
    className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900/40',
  },
  Processing: {
    label: 'Processing',
    icon: <Clock className="w-3 h-3 animate-spin" style={{ animationDuration: '2s' }} />,
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40',
  },
  Failed: {
    label: 'Failed',
    icon: <AlertTriangle className="w-3 h-3" />,
    className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/40',
  },
}

const fileTypeIcon: Record<string, React.ReactNode> = {
  PDF: <FileText className="w-4 h-4 text-red-500" />,
  DOCX: <File className="w-4 h-4 text-blue-500" />,
  XLSX: <Layers className="w-4 h-4 text-green-500" />,
}

// ── Compare Modal ─────────────────────────────────────────────────────────────

interface CompareResult {
  comparison: string
  doc_a_title: string
  doc_b_title: string
}

function CompareModal({
  docA,
  docB,
  onClose,
}: {
  docA: Document
  docB: Document
  onClose: () => void
}) {
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
            <h2 className="text-sm font-bold text-foreground">Document Comparison</h2>
            <p className="text-xs text-muted-foreground truncate">
              AI-powered policy analysis
            </p>
          </div>
          <button
            onClick={onClose}
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
                Document {i === 0 ? 'A' : 'B'}
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
                <p className="text-sm font-semibold text-foreground">Analysing Documents…</p>
                <p className="text-xs text-muted-foreground mt-1">AI is generating a structured comparison</p>
              </div>
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-sm font-medium text-foreground">Comparison Failed</p>
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
            Generated by HTE AI · Based on official document summaries
          </p>
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Document Detail Drawer ────────────────────────────────────────────────────

function DocumentDetailDrawer({ doc, onClose, onSelectForCompare, selectedForCompare }: {
  doc: Document
  onClose: () => void
  onSelectForCompare: (d: Document) => void
  selectedForCompare: Document[]
}) {
  const isSelected = selectedForCompare.some((d) => d.id === doc.id)
  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-card border-l border-border shadow-2xl z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          {fileTypeIcon[doc.fileType]}
          <h2 className="text-sm font-semibold text-foreground truncate max-w-xs">{doc.title}</h2>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Status + metadata */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Status', value: <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', statusCfg[doc.status].className)}>{statusCfg[doc.status].icon}{doc.status}</span> },
            { label: 'File Type', value: doc.fileType },
            { label: 'File Size', value: doc.fileSize },
            { label: 'Pages', value: `${doc.pages} pages` },
            { label: 'Upload Date', value: new Date(doc.uploadDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
            { label: 'Versions', value: `v${doc.versions}` },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <div className="text-sm font-medium text-foreground">{value}</div>
            </div>
          ))}
        </div>

        {/* AI Summary */}
        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">AI-Generated Summary</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{doc.summary}</p>
        </div>

        {/* Tags */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tags</h3>
          <div className="flex flex-wrap gap-1.5">
            {doc.tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Related (static) */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Related Documents</h3>
          <div className="space-y-1.5">
            {MOCK_DOCUMENTS.filter((d) => d.category === doc.category && d.id !== doc.id).slice(0, 3).map((d) => (
              <button key={d.id} className="w-full flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-colors text-left">
                {fileTypeIcon[d.fileType]}
                <span className="text-sm text-foreground truncate flex-1">{d.title}</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
              </button>
            ))}
          </div>
        </div>

        {/* Version history */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Version History</h3>
          <div className="space-y-1.5">
            {Array.from({ length: doc.versions }).reverse().map((_, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Version {doc.versions - i}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(new Date(doc.uploadDate).getTime() - i * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                {i === 0 && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Current</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-border flex gap-2">
        <button className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition">
          Open Document
        </button>
        <button
          onClick={() => onSelectForCompare(doc)}
          className={cn(
            'h-9 px-3 rounded-lg border text-sm font-medium transition flex items-center gap-1.5',
            isSelected
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-foreground hover:bg-muted'
          )}
        >
          <GitCompare className="w-3.5 h-3.5" />
          {isSelected ? 'Selected' : 'Compare'}
        </button>
        <button className="h-9 px-4 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition">
          Download
        </button>
      </div>
    </motion.div>
  )
}

// ── Document Cards ────────────────────────────────────────────────────────────

function DocCard({ doc, onOpen, onToggleCompare, isCompareSelected }: {
  doc: Document
  onOpen: (d: Document) => void
  onToggleCompare: (d: Document) => void
  isCompareSelected: boolean
}) {
  const status = statusCfg[doc.status]
  return (
    <div
      className={cn(
        'relative bg-card border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all group cursor-pointer',
        isCompareSelected ? 'border-primary ring-1 ring-primary/30' : 'border-border'
      )}
      onClick={() => onOpen(doc)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
          {fileTypeIcon[doc.fileType]}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleCompare(doc) }}
          title={isCompareSelected ? 'Remove from comparison' : 'Add to comparison'}
          className={cn(
            'w-7 h-7 rounded-md flex items-center justify-center transition-all',
            isCompareSelected
              ? 'text-primary bg-primary/10 opacity-100'
              : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary hover:bg-primary/10'
          )}
        >
          {isCompareSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
        </button>
      </div>

      <h3 className="text-sm font-semibold text-foreground leading-snug mb-1.5 line-clamp-2">{doc.title}</h3>

      <div className="flex items-center gap-1.5 mb-2">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
          <Tag className="w-2.5 h-2.5" />
          {doc.category}
        </span>
      </div>

      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{doc.summary}</p>

      <div className="flex items-center justify-between">
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', status.className)}>
          {status.icon}
          {status.label}
        </span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" />
          {new Date(doc.uploadDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </div>
      </div>
    </div>
  )
}

function DocRow({ doc, onOpen, onToggleCompare, isCompareSelected }: {
  doc: Document
  onOpen: (d: Document) => void
  onToggleCompare: (d: Document) => void
  isCompareSelected: boolean
}) {
  const status = statusCfg[doc.status]
  return (
    <div
      className={cn(
        'flex items-center gap-4 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors group border-b border-border last:border-0',
        isCompareSelected && 'bg-primary/5'
      )}
      onClick={() => onOpen(doc)}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggleCompare(doc) }}
        className={cn(
          'w-5 h-5 shrink-0 transition-colors',
          isCompareSelected ? 'text-primary' : 'text-muted-foreground/40 group-hover:text-muted-foreground'
        )}
      >
        {isCompareSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
      </button>
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        {fileTypeIcon[doc.fileType]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
        <p className="text-xs text-muted-foreground truncate">{doc.summary}</p>
      </div>
      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium shrink-0">
        {doc.category}
      </span>
      <span className={cn('hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border shrink-0', status.className)}>
        {status.icon} {status.label}
      </span>
      <span className="hidden lg:block text-xs text-muted-foreground shrink-0">
        {new Date(doc.uploadDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </span>
      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary shrink-0 transition-colors" />
    </div>
  )
}

// ── Floating Compare Bar ──────────────────────────────────────────────────────

function CompareBar({
  selected,
  onClear,
  onCompare,
}: {
  selected: Document[]
  onClear: () => void
  onCompare: () => void
}) {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-card border border-border shadow-2xl rounded-2xl px-5 py-3"
    >
      <div className="flex items-center gap-2">
        <GitCompare className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">
          {selected.length === 1
            ? 'Select 1 more document to compare'
            : `Comparing ${selected.length} documents`}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {selected.map((doc) => (
          <span key={doc.id} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium max-w-[140px] truncate">
            {fileTypeIcon[doc.fileType]}
            <span className="truncate">{doc.title}</span>
          </span>
        ))}
      </div>
      <button
        onClick={onCompare}
        disabled={selected.length !== 2}
        className="h-8 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Compare
      </button>
      <button
        onClick={onClear}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  )
}

// ── Main DocumentLibrary ──────────────────────────────────────────────────────

export default function DocumentLibrary() {
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState<DocStatus | 'All'>('All')
  const [docs, setDocs] = useState<Document[]>([])
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Compare state
  const [compareSelection, setCompareSelection] = useState<Document[]>([])
  const [showCompareModal, setShowCompareModal] = useState(false)

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2500)
  }, [])

  const fetchBackendDocs = useCallback(async () => {
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE}/documents`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          const apiDocs: Document[] = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            category: d.category || 'General',
            department: d.department || 'HTE',
            fileType: (d.file_type || 'PDF') as any,
            fileSize: d.file_size || '1.2 MB',
            pages: d.pages || 1,
            uploadDate: d.upload_date ? d.upload_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
            status: d.status === 'indexed' ? 'Indexed' : d.status === 'failed' ? 'Failed' : 'Processing',
            summary: d.summary || 'Official Higher & Technical Education department document registered in system.',
            tags: Array.isArray(d.tags) ? d.tags : (typeof d.tags === 'string' ? JSON.parse(d.tags || '[]') : ['HTE', 'Official']),
            versions: [
              { version: 'v1.0', date: d.upload_date ? d.upload_date.slice(0, 10) : 'Current', author: 'System Admin' }
            ]
          }))
          setDocs(apiDocs)
        }
      }
    } catch {
      // Backend error fallback
    }
  }, [])

  useEffect(() => {
    fetchBackendDocs()
    const interval = setInterval(fetchBackendDocs, 5000)
    return () => clearInterval(interval)
  }, [fetchBackendDocs])

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return
    for (const file of files) {
      showToast(`Uploading ${file.name}…`)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', selectedCategory !== 'All' ? selectedCategory : 'General')
      formData.append('visibility', 'public')
      try {
        const token = getToken()
        const res = await fetch(`${API_BASE}/documents/upload`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        })
        if (res.ok) {
          const data = await res.json()
          showToast(`Uploaded! ID: ${data.document_id.slice(0, 8)}`)
          fetchBackendDocs()
        } else {
          showToast(`Upload failed (HTTP ${res.status})`)
        }
      } catch {
        showToast('Upload error — check backend server.')
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    uploadFiles(Array.from(e.dataTransfer.files))
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) uploadFiles(Array.from(e.target.files))
  }

  const toggleCompareSelection = (doc: Document) => {
    setCompareSelection((prev) => {
      const isIn = prev.some((d) => d.id === doc.id)
      if (isIn) return prev.filter((d) => d.id !== doc.id)
      if (prev.length >= 2) {
        showToast('You can only compare 2 documents at a time. Remove one first.')
        return prev
      }
      return [...prev, doc]
    })
  }

  const filtered = docs.filter((d) => {
    const matchSearch =
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.category.toLowerCase().includes(search.toLowerCase()) ||
      d.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
    const matchCat = selectedCategory === 'All' || d.category === selectedCategory
    const matchStatus = selectedStatus === 'All' || d.status === selectedStatus
    return matchSearch && matchCat && matchStatus
  })

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Hidden file input */}
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple accept=".pdf,.docx,.xlsx" className="hidden" />

      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex-1">
          <h1 className="text-lg font-bold text-foreground">Document Library</h1>
          <p className="text-sm text-muted-foreground">{docs.length} documents · {docs.filter((d) => d.status === 'Indexed').length} indexed</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-input bg-background">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents…"
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none w-48"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn('h-9 px-3 rounded-lg border text-sm flex items-center gap-1.5 transition-colors', showFilters ? 'border-primary bg-primary/10 text-primary' : 'border-input bg-background text-muted-foreground hover:text-foreground')}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
          </button>
          <div className="flex items-center rounded-lg border border-input overflow-hidden">
            <button
              onClick={() => setView('grid')}
              className={cn('h-9 w-9 flex items-center justify-center transition-colors', view === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground')}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setView('list')}
              className={cn('h-9 w-9 flex items-center justify-center transition-colors', view === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground')}
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5 hover:opacity-90 transition"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border bg-muted/40 px-6 py-3"
          >
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Category:</span>
                <div className="flex flex-wrap gap-1">
                  {DOC_CATEGORIES.slice(0, 8).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={cn('px-2.5 py-1 rounded-full text-xs font-medium transition-colors', selectedCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-background border border-border text-muted-foreground hover:text-foreground')}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Status:</span>
                {(['All', 'Indexed', 'Processing', 'Failed'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedStatus(s)}
                    className={cn('px-2.5 py-1 rounded-full text-xs font-medium transition-colors', selectedStatus === s ? 'bg-primary text-primary-foreground' : 'bg-background border border-border text-muted-foreground hover:text-foreground')}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn('border-2 border-dashed rounded-xl p-5 mb-6 flex items-center justify-center gap-3 transition-all', isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/50')}
        >
          <Upload className={cn('w-5 h-5', isDragging ? 'text-primary' : 'text-muted-foreground')} />
          <div>
            <p className={cn('text-sm font-medium', isDragging ? 'text-primary' : 'text-muted-foreground')}>
              Drop files here to upload
            </p>
            <p className="text-xs text-muted-foreground/60">PDF, DOCX, XLSX — up to 50 MB per file</p>
          </div>
        </div>

        {/* Compare hint */}
        {docs.length >= 2 && compareSelection.length === 0 && (
          <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 border border-border rounded-lg px-3 py-2">
            <GitCompare className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Tip: Click the <strong>checkbox</strong> on any document card to select it for AI comparison</span>
          </div>
        )}

        {/* Document grid / list */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <FileText className="w-6 h-6 text-muted-foreground/40" />
            </div>
            <p className="text-foreground font-medium mb-1">No documents found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
            <button onClick={() => { setSearch(''); setSelectedCategory('All'); setSelectedStatus('All') }} className="mt-3 text-sm text-primary hover:underline">
              Clear filters
            </button>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((doc) => (
              <motion.div key={doc.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <DocCard
                  doc={doc}
                  onOpen={setSelectedDoc}
                  onToggleCompare={toggleCompareSelection}
                  isCompareSelected={compareSelection.some((d) => d.id === doc.id)}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {filtered.map((doc) => (
              <DocRow
                key={doc.id}
                doc={doc}
                onOpen={setSelectedDoc}
                onToggleCompare={toggleCompareSelection}
                isCompareSelected={compareSelection.some((d) => d.id === doc.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      <AnimatePresence>
        {selectedDoc && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
              onClick={() => setSelectedDoc(null)}
            />
            <DocumentDetailDrawer
              doc={selectedDoc}
              onClose={() => setSelectedDoc(null)}
              onSelectForCompare={(doc) => { toggleCompareSelection(doc); setSelectedDoc(null) }}
              selectedForCompare={compareSelection}
            />
          </>
        )}
      </AnimatePresence>

      {/* Floating compare bar */}
      <AnimatePresence>
        {compareSelection.length > 0 && !showCompareModal && (
          <CompareBar
            selected={compareSelection}
            onClear={() => setCompareSelection([])}
            onCompare={() => setShowCompareModal(true)}
          />
        )}
      </AnimatePresence>

      {/* Compare modal */}
      <AnimatePresence>
        {showCompareModal && compareSelection.length === 2 && (
          <CompareModal
            docA={compareSelection[0]}
            docB={compareSelection[1]}
            onClose={() => { setShowCompareModal(false); setCompareSelection([]) }}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background text-sm px-4 py-2 rounded-full shadow-lg"
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
