'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Download, Sparkles, ArrowLeft, Loader2,
  BookOpen, Calendar, Building2, Tag, Search, CheckCircle2,
  AlertCircle, ChevronDown, Plus, Trash2, FileDown, BarChart2
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
      const token = getAuthToken()

      const res = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: prompt,
          mode: 'grounded',
          language,
        }),
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const json = JSON.parse(line.slice(5).trim())
              if (json.content) {
                fullText += json.content
                setReportContent(fullText)
              }
            } catch {}
          } else if (line.startsWith('event:')) {
            const eventType = line.slice(6).trim()
            if (eventType === 'not_found') {
              fullText = '⚠️ No matching documents found in the database for this report topic. Please try a more specific query or ensure documents are indexed.'
              setReportContent(fullText)
            }
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

  return (
    <div className="h-full flex overflow-hidden bg-[#f8f9fc]">
      {/* Left config panel */}
      <div className="w-full sm:w-[400px] shrink-0 flex flex-col border-r border-gray-200 bg-white overflow-y-auto">
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
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedType === rt.id
                      ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${rt.color}`}>
                      <rt.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className={`text-[13px] font-semibold ${selectedType === rt.id ? 'text-indigo-700' : 'text-gray-800'}`}>{rt.label}</p>
                      <p className="text-[11px] text-gray-400 leading-tight">{rt.desc}</p>
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
            className="w-full h-12 rounded-xl bg-indigo-600 text-white font-semibold text-sm flex items-center justify-center gap-2.5 hover:bg-indigo-700 transition-colors disabled:opacity-60 shadow-sm"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating report…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right output panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Output toolbar */}
        <div className="flex items-center justify-between px-6 h-14 border-b border-gray-200 bg-white shrink-0">
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
            </div>
          )}
        </div>

        {/* Report content */}
        <div className="flex-1 overflow-y-auto p-6" ref={reportRef}>
          <AnimatePresence mode="wait">
            {!reportContent && !generating && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-center"
              >
                <div className="w-20 h-20 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-5">
                  <FileText className="w-10 h-10 text-indigo-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No Report Generated Yet</h3>
                <p className="text-gray-400 text-sm max-w-xs">
                  Configure the report type and topic in the left panel, then click <strong>Generate Report</strong>.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-2 max-w-sm">
                  {REPORT_TYPES.map((rt) => (
                    <button
                      key={rt.id}
                      onClick={() => { setSelectedType(rt.id) }}
                      className={`p-3 rounded-xl border text-left transition-all hover:shadow-sm ${rt.color}`}
                    >
                      <rt.icon className="w-4 h-4 mb-1.5" />
                      <p className="text-[11px] font-semibold">{rt.label}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {(reportContent || generating) && (
              <motion.div
                key="report"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-3xl mx-auto"
              >
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                  {/* Watermark header */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
                        <span className="text-white font-bold text-xs">HTE</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Maharashtra Government</p>
                        <p className="text-sm font-semibold text-gray-800">HTE KnowledgeBase AI — Generated Report</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <div className="ai-prose text-gray-800 text-sm leading-relaxed whitespace-pre-wrap font-mono">
                    {reportContent}
                    {generating && (
                      <span className="inline-block w-0.5 h-4 bg-indigo-500 ml-0.5 animate-pulse" />
                    )}
                  </div>

                  {!generating && reportContent && (
                    <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-between">
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
