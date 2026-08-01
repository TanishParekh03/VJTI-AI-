'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  FileText, Download, Sparkles, ArrowLeft, Loader2,
  BookOpen, Calendar, Building2, Tag, Search, CheckCircle2,
  AlertCircle, ChevronDown, Plus, Trash2, FileDown, BarChart2,
  Layers, ShieldCheck, Printer
} from 'lucide-react'

interface Props {
  onNavigate: (screen: any) => void
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('hte_access_token')
}

type ReportType = 'policy_summary' | 'compliance_checklist' | 'gr_comparison' | 'department_overview'

const REPORT_TYPES: { id: ReportType; label: string; desc: string; icon: any; color: string }[] = [
  {
    id: 'policy_summary',
    label: 'Policy Summary Report',
    desc: 'Generate a comprehensive summary of policies on a given topic from multiple GRs.',
    icon: BookOpen,
    color: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  {
    id: 'compliance_checklist',
    label: 'Compliance Checklist',
    desc: 'Extract actionable deadlines, required forms, and eligibility criteria from GRs.',
    icon: CheckCircle2,
    color: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  {
    id: 'gr_comparison',
    label: 'GR Comparison Report',
    desc: 'Compare two or more GRs side-by-side to identify conflicts, amendments, and supersessions.',
    icon: BarChart2,
    color: 'border-violet-200 bg-violet-50 text-violet-700',
  },
  {
    id: 'department_overview',
    label: 'Department Policy Overview',
    desc: 'Summarise all recent GRs for a specific department within a date range.',
    icon: Building2,
    color: 'border-amber-200 bg-amber-50 text-amber-700',
  },
]

const DEPARTMENTS = [
  'Higher & Technical Education', 'Pharmacy', 'Engineering', 'Architecture',
  'Management', 'Polytechnic', 'Art & Design', 'Medical', 'Agriculture', 'Law',
]

export default function ReportsPage({ onNavigate }: Props) {
  const [selectedType, setSelectedType] = useState<ReportType>('policy_summary')
  const [topic, setTopic] = useState('')
  const [department, setDepartment] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [grNumbers, setGrNumbers] = useState<string[]>([''])
  const [language, setLanguage] = useState<'en' | 'mr'>('en')
  const [generating, setGenerating] = useState(false)
  const [reportContent, setReportContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const reportRef = useRef<HTMLDivElement>(null)

  const addGrNumber = () => setGrNumbers((prev) => [...prev, ''])
  const removeGrNumber = (i: number) => setGrNumbers((prev) => prev.filter((_, idx) => idx !== i))
  const updateGrNumber = (i: number, val: string) =>
    setGrNumbers((prev) => prev.map((v, idx) => (idx === i ? val : v)))

  const buildPrompt = (): string => {
    const langNote = language === 'mr' ? 'Respond in Marathi.' : 'Respond in English.'
    const deptNote = department ? `Department focus: ${department}.` : ''
    const dateNote = fromDate && toDate ? `Date range: ${fromDate} to ${toDate}.` : ''

    switch (selectedType) {
      case 'policy_summary':
        return `You are a policy analyst for the Maharashtra Government Higher & Technical Education Department.
Generate a detailed, structured Policy Summary Report on the following topic: "${topic}".
${deptNote} ${dateNote}
Format the report with these sections:
1. ## Executive Summary
2. ## Key Policy Provisions
3. ## Eligibility & Applicability (include a Markdown table if relevant)
4. ## Important Dates & Deadlines
5. ## Impact Assessment
6. ## References & Circular Numbers

CRITICAL: YOU MUST USE PROPER MARKDOWN TABLES WITH | COLUMNS |. NEVER USE UNBROKEN STRINGS. Ensure the tone is highly official, authoritative, and strictly adheres to government reporting standards.
Use proper Markdown formatting with headers, bold key terms, and tables where applicable.
${langNote}
Start with a formal header: # Policy Summary Report — ${topic || 'HTE Policy'}
Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`

      case 'compliance_checklist':
        return `You are a compliance auditor for the Maharashtra Government HTE Department.
Generate a comprehensive Compliance Checklist Report on: "${topic}".
${deptNote} ${dateNote}
Format as:
# Compliance Checklist — ${topic || 'HTE Compliance'}
Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}

## 📅 Critical Deadlines
## 📝 Required Documents & Forms
## ✅ Eligibility Criteria
## ⚙️ Step-by-Step Action Items
## ⚠️ Common Pitfalls & Cautions
## 📞 Contacts & Escalation

CRITICAL: YOU MUST USE PROPER MARKDOWN TABLES WITH | COLUMNS |. NEVER USE UNBROKEN STRINGS. Ensure the tone is highly official, authoritative, and strictly adheres to government reporting standards.
Use checklists (- [ ] items), tables, and callout blockquotes.
${langNote}`

      case 'gr_comparison':
        const grList = grNumbers.filter(Boolean).join(', ')
        return `You are a government policy analyst.
Perform a detailed comparative analysis of the following GR numbers / topics: ${grList || topic}.
${deptNote}
Generate a structured GR Comparison Report with:
# GR Comparison Report
GRs Compared: ${grList || topic}
Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}

## Summary of Each GR
## Key Differences (Markdown Table: | Aspect | GR A | GR B |)
## Supersession & Amendment Analysis
## ⚠️ Conflict Flags
## Recommendation — Which GR Takes Precedence

CRITICAL: YOU MUST USE PROPER MARKDOWN TABLES WITH | COLUMNS |. NEVER USE UNBROKEN STRINGS. Ensure the tone is highly official, authoritative, and strictly adheres to government reporting standards.
${langNote}`

      case 'department_overview':
        return `You are a Maharashtra Government HTE policy analyst.
Generate a Department Policy Overview for: ${department || topic}.
${dateNote}
Format as:
# Department Policy Overview — ${department || topic}
${dateNote}
Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}

## Recent GRs & Circulars
## Policy Trends
## Key Changes This Period
## Action Items for Institutions
## Upcoming Deadlines
${langNote}`
    }
  }

  const handleGenerate = async () => {
    if (!topic && selectedType !== 'gr_comparison' && !department) {
      setError('Please fill in the topic or department field.')
      return
    }
    setError(null)
    setGenerating(true)
    setReportContent(null)

    try {
      const prompt = buildPrompt()
      let query_text = topic
      const actualDepartment = department && department !== 'All Departments' ? department : ''
      if (selectedType === 'gr_comparison') {
         query_text = grNumbers.filter(Boolean).join(', ') || topic || 'GR comparison'
      } else if (!topic && actualDepartment) {
         query_text = actualDepartment
      } else if (topic && actualDepartment) {
         query_text = `${topic} ${actualDepartment}`
      }

      const token = getAuthToken()

      const res = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: query_text,
          report_prompt: prompt,
          mode: 'grounded',
          language,
        }),
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let currentEvent = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim()
          } else if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.slice(5).trim())
              if (currentEvent === 'token') {
                if (data.content) {
                  fullText += data.content
                  setReportContent(fullText)
                }
              } else if (currentEvent === 'not_found') {
                fullText = data.message ?? '⚠️ No matching documents found for this report topic.'
                setReportContent(fullText)
              } else if (currentEvent === 'error') {
                fullText = `⚠️ ${data.message ?? 'An error occurred during report generation.'}`
                setReportContent(fullText)
              }
            } catch {}
          }
        }
      }
    } catch (e: any) {
      setError(`Failed to generate report: ${e.message}`)
    } finally {
      setGenerating(false)
    }
  }

  const handleDownloadTxt = () => {
    if (!reportContent) return
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const dt = new Date()
    a.href = url
    a.download = `HTE_Report_${selectedType}_${dt.getFullYear()}${String(dt.getMonth()+1).padStart(2,'0')}${String(dt.getDate()).padStart(2,'0')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadHtml = () => {
    if (!reportContent) return
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>HTE Report</title>
<style>
  body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.7; }
  h1 { color: #1a73e8; border-bottom: 2px solid #1a73e8; padding-bottom: 12px; }
  h2 { color: #202124; margin-top: 28px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th { background: #f1f3f4; padding: 10px; text-align: left; border: 1px solid #dadce0; }
  td { padding: 8px 10px; border: 1px solid #dadce0; }
  blockquote { border-left: 4px solid #1a73e8; padding-left: 16px; color: #5f6368; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #dadce0; font-size: 12px; color: #9aa0a6; }
</style>
</head>
<body>
<pre style="white-space:pre-wrap;font-family:Georgia,serif">${reportContent}</pre>
<div class="footer">Generated by HTE KnowledgeBase AI · Maharashtra Government · ${new Date().toLocaleDateString('en-IN')}</div>
</body>
</html>`
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const dt = new Date()
    a.href = url
    a.download = `HTE_Report_${dt.getFullYear()}${String(dt.getMonth()+1).padStart(2,'0')}${String(dt.getDate()).padStart(2,'0')}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="h-full flex overflow-hidden bg-[#f8f9fc] print:bg-white print:h-auto print:overflow-visible">
      {/* Left config panel */}
      <div className="w-full sm:w-[400px] shrink-0 flex flex-col border-r border-gray-200 bg-white overflow-y-auto print:hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 shrink-0">
          <button
            onClick={() => onNavigate('chat')}
            className="flex items-center gap-1.5 text-gray-400 hover:text-gray-700 text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-lg leading-tight">Report Generator</h1>
              <p className="text-gray-400 text-xs">AI-generated government policy reports</p>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 space-y-5">
          {/* Report Type */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5">Report Type</label>
            <div className="space-y-2">
              {REPORT_TYPES.map((rt) => (
                <button
                  key={rt.id}
                  onClick={() => setSelectedType(rt.id)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-300 group ${
                    selectedType === rt.id
                      ? 'border-indigo-400 bg-indigo-50/50 shadow-md shadow-indigo-100/50 ring-1 ring-indigo-400/20'
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/80 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-transform duration-300 ${
                      selectedType === rt.id ? 'scale-110 ' + rt.color : 'border-gray-200 bg-white text-gray-400 group-hover:text-gray-600 group-hover:border-gray-300'
                    }`}>
                      <rt.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className={`text-[13px] font-bold tracking-tight ${selectedType === rt.id ? 'text-indigo-900' : 'text-gray-700 group-hover:text-gray-900'}`}>{rt.label}</p>
                      <p className={`text-[11px] leading-relaxed mt-0.5 ${selectedType === rt.id ? 'text-indigo-700/80' : 'text-gray-400'}`}>{rt.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Topic / query */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              {selectedType === 'gr_comparison' ? 'Comparison Topic' : 'Topic / Keyword'}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={
                  selectedType === 'compliance_checklist' ? 'e.g. Scholarship Application 2024' :
                  selectedType === 'gr_comparison' ? 'e.g. Fee Regulation policy' :
                  'e.g. State Merit Scholarship eligibility'
                }
                className="w-full pl-9 pr-4 h-10 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* GR Numbers (for comparison type) */}
          {selectedType === 'gr_comparison' && (
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">GR Numbers to Compare</label>
              <div className="space-y-2">
                {grNumbers.map((gr, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={gr}
                      onChange={(e) => updateGrNumber(i, e.target.value)}
                      placeholder={`GR No. ${i + 1}`}
                      className="flex-1 h-9 px-3 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                    />
                    {grNumbers.length > 1 && (
                      <button
                        onClick={() => removeGrNumber(i)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {grNumbers.length < 5 && (
                  <button
                    onClick={addGrNumber}
                    className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add another GR
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Department */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              <Building2 className="w-3 h-3 inline mr-1" />Department (optional)
            </label>
            <div className="relative">
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full h-10 pl-3 pr-8 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent appearance-none"
              >
                <option value="">All Departments</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                <Calendar className="w-3 h-3 inline mr-1" />From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Output Language</label>
            <div className="flex gap-2">
              {[{ id: 'en', label: 'English' }, { id: 'mr', label: 'Marathi (मराठी)' }].map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLanguage(l.id as 'en' | 'mr')}
                  className={`flex-1 h-9 rounded-xl text-sm font-medium transition-all border ${
                    language === l.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:border-indigo-300'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="relative w-full h-14 rounded-2xl bg-[#0A0F2C] text-white font-bold text-sm flex items-center justify-center gap-2.5 hover:bg-indigo-700 transition-all duration-300 disabled:opacity-70 disabled:hover:bg-[#0A0F2C] overflow-hidden shadow-xl shadow-indigo-900/20 group"
          >
            {generating && (
              <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 animate-pulse" />
            )}
            
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                <span className="relative z-10 tracking-wide">Generating Report...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 relative z-10 group-hover:scale-110 transition-transform" />
                <span className="relative z-10 tracking-wide">Generate AI Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right output panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gradient-to-br from-[#f8f9fc] to-[#f1f3f9] relative print:overflow-visible print:bg-white print:bg-none">
        {/* Subtle mesh in background of output area */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 print:hidden">
          <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-indigo-200/50 blur-[100px]" />
          <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-200/50 blur-[100px]" />
        </div>
        {/* Output toolbar */}
        <div className="flex items-center justify-between px-6 h-14 border-b border-gray-200 bg-white shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span className="font-semibold text-gray-900 text-sm">
              {reportContent ? REPORT_TYPES.find(r => r.id === selectedType)?.label : 'Report Output'}
            </span>
            {reportContent && !generating && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                READY
              </span>
            )}
            {generating && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 animate-pulse">
                GENERATING
              </span>
            )}
          </div>
          {reportContent && !generating && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadTxt}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 text-xs font-medium transition-colors"
              >
                <FileDown className="w-3.5 h-3.5" />
                .txt
              </button>
              <button
                onClick={handleDownloadHtml}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                .html
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 shadow-sm text-xs font-semibold transition-colors ml-1"
              >
                <Printer className="w-3.5 h-3.5" />
                Print PDF
              </button>
            </div>
          )}
        </div>

        {/* Report content */}
        <div className="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0" ref={reportRef}>
          <AnimatePresence mode="wait">
            {!reportContent && !generating && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full flex flex-col items-center justify-center text-center relative z-10"
              >
                <div className="w-24 h-24 rounded-[2rem] bg-white border border-gray-100 shadow-2xl shadow-indigo-100/50 flex items-center justify-center mb-6 relative group">
                  <div className="absolute inset-0 rounded-[2rem] bg-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <FileText className="w-10 h-10 text-indigo-300 relative z-10 transition-transform duration-500 group-hover:scale-110" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">No Report Generated Yet</h3>
                <p className="text-gray-500 text-sm max-w-sm leading-relaxed">
                  Configure the report parameters in the left panel, then click <strong>Generate AI Report</strong> to begin.
                </p>
                <div className="mt-10 grid grid-cols-2 gap-3 max-w-lg w-full px-6">
                  {REPORT_TYPES.map((rt, i) => (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      key={rt.id}
                      onClick={() => { setSelectedType(rt.id) }}
                      className={`p-4 rounded-2xl bg-white border border-gray-100/50 text-left transition-all hover:shadow-lg hover:-translate-y-1 hover:border-indigo-100 ${rt.color.replace('bg-', 'hover:bg-')}`}
                    >
                      <rt.icon className="w-5 h-5 mb-2.5 opacity-80" />
                      <p className="text-[12px] font-bold text-gray-800">{rt.label}</p>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {(reportContent || generating) && (
              <motion.div
                key="report"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto relative z-10 pb-10 print:pb-0"
              >
                <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-2xl shadow-indigo-900/5 overflow-hidden print:shadow-none print:border-none print:rounded-none">
                  {/* Watermark header */}
                  <div className="flex items-center justify-between p-8 border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-white/50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-inner">
                        <span className="text-white font-black text-sm tracking-wider">HTE</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-indigo-600/80 uppercase tracking-widest mb-0.5">Government of Maharashtra</p>
                        <p className="text-base font-bold text-gray-900">KnowledgeBase AI Official Report</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100 mb-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Verified Context
                      </span>
                      <p className="text-xs text-gray-400 font-medium">
                        {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  <div className="p-10 ai-prose text-gray-800 text-[15px] leading-relaxed">
                    {generating && !reportContent ? (
                      <div className="space-y-8 py-4">
                        <div className="h-7 bg-indigo-50/80 rounded-md w-1/2 animate-pulse"></div>
                        <div className="space-y-3">
                          <div className="h-4 bg-gray-100/80 rounded w-full animate-pulse"></div>
                          <div className="h-4 bg-gray-100/80 rounded w-full animate-pulse"></div>
                          <div className="h-4 bg-gray-100/80 rounded w-5/6 animate-pulse"></div>
                        </div>
                        <div className="space-y-3 pt-6">
                          <div className="h-5 bg-indigo-50/60 rounded-md w-1/3 animate-pulse"></div>
                          <div className="h-4 bg-gray-100/80 rounded w-full animate-pulse"></div>
                          <div className="h-4 bg-gray-100/80 rounded w-4/6 animate-pulse"></div>
                        </div>
                      </div>
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {reportContent || ''}
                      </ReactMarkdown>
                    )}
                    {generating && reportContent && (
                      <span className="inline-block w-0.5 h-4 bg-indigo-500 ml-0.5 animate-pulse print:hidden" />
                    )}
                  </div>

                  {!generating && reportContent && (
                    <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-between print:hidden">
                      <p className="text-[11px] text-gray-400">
                        Generated by HTE KnowledgeBase AI · Answers grounded in official Maharashtra GRs
                      </p>
                      <div className="flex gap-2">
                        <button onClick={handleDownloadTxt} className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 transition-colors">
                          <FileDown className="w-3 h-3" /> .txt
                        </button>
                        <button onClick={handleDownloadHtml} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">
                          <Download className="w-3 h-3" /> .html
                        </button>
                        <button onClick={handlePrint} className="flex items-center gap-1 text-xs text-gray-700 hover:text-indigo-800 font-semibold transition-colors ml-2">
                          <Printer className="w-3 h-3" /> Print PDF
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
