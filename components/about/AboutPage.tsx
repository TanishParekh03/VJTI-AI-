'use client'

import { motion } from 'framer-motion'
import {
  Brain, Database, Shield, Globe, BarChart2, FileCheck,
  CheckCircle, Users, Lock, Sparkles, ArrowLeft, Cpu,
  Server, Code2, BookOpen, Layers
} from 'lucide-react'

interface Props {
  onNavigate: (screen: any) => void
}

const TECH_STACK = [
  { category: 'RAG Pipeline', items: ['HyDE (Hypothetical Document Embeddings)', 'Query Decomposition', 'Hybrid Dense + Sparse Search', 'Reciprocal Rank Fusion (RRF)', 'Metadata Pre-filtering'], icon: Brain, color: 'text-violet-600 bg-violet-50 border-violet-200' },
  { category: 'LLM & AI', items: ['Google Gemini Flash / Pro', 'Grounded Retrieval Mode', 'Bilingual EN + Marathi', 'Supersession Detection', 'Confidence Badge Scoring'], icon: Sparkles, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { category: 'Vector Database', items: ['Qdrant — fully on-premise', 'Dense vectors (text-embedding-3)', 'Sparse vectors (BM25)', 'Payload filters for departments', 'Collection-based tenancy'], icon: Database, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { category: 'Ingestion', items: ['Tesseract OCR (EN + MR)', 'pypdf for digital PDFs', 'Marathi → English translation', 'Automatic AI summarisation', 'Applicability tagging'], icon: Layers, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { category: 'Backend', items: ['FastAPI (Python)', 'PostgreSQL + Alembic', 'SQLAlchemy async ORM', 'JWT Authentication', 'Audit Log (Explainability)'], icon: Server, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  { category: 'Frontend', items: ['Next.js 14 App Router', 'Framer Motion animations', 'TailwindCSS v4', 'React i18n (EN/MR/HI)', 'SSE streaming chat'], icon: Code2, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
]

const DATA_SOURCES = [
  { name: 'gr.maharashtra.gov.in', desc: 'Official GR portal — primary source for all Government Resolutions', icon: BookOpen },
  { name: 'dte.maharashtra.gov.in', desc: 'DTE portal — circulars, orders, and letters for technical education', icon: FileCheck },
  { name: 'orgpedia/mahGRs (GitHub)', desc: 'Open-source historical GR dataset by orgpedia for bulk ingestion', icon: Database },
]

const TEAM = [
  { name: 'VJTI AI Research Team', role: 'Core Architecture, RAG Pipeline & Backend Engineering', initials: 'VJ' },
  { name: 'HTE Dept. Collaboration', role: 'Domain Expertise, Policy Validation & Dataset Curation', initials: 'HT' },
  { name: 'orgpedia / mahGRs', role: 'Open-Source Historical GR Dataset (MIT License)', initials: 'OP' },
]

const FEATURES = [
  { icon: Brain, title: 'HyDE Retrieval', desc: 'Generates a hypothetical answer and embeds it for far better semantic search recall.' },
  { icon: Cpu, title: 'Query Decomposition', desc: 'Multi-part questions are split into sub-queries, each retrieved separately then synthesised.' },
  { icon: Shield, title: 'Role-Based Access', desc: 'Students, faculty, officers and admins each see a scoped view of the document corpus.' },
  { icon: Globe, title: 'Bilingual Support', desc: 'Ask in English or Marathi. Answers respect the language with official terminology preserved.' },
  { icon: BarChart2, title: 'Audit & Explainability', desc: 'Every query is logged with retrieved chunks, scores, prompt, and response for full accountability.' },
  { icon: Lock, title: 'On-Premise Privacy', desc: 'Qdrant runs locally. No document data or query content leaves your infrastructure.' },
]

export default function AboutPage({ onNavigate }: Props) {
  return (
    <div className="h-full overflow-y-auto bg-[#f8f9fc]">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#1a73e8] via-indigo-700 to-violet-700 px-6 sm:px-12 pt-12 pb-20 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/5 blur-2xl" />

        <button
          onClick={() => onNavigate('chat')}
          className="relative flex items-center gap-2 text-white/70 hover:text-white text-sm mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Assistant
        </button>

        <div className="relative max-w-3xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center">
              <span className="text-white font-black text-xl tracking-wide">HTE</span>
            </div>
            <div>
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Maharashtra Government</p>
              <h1 className="text-white font-black text-3xl sm:text-4xl leading-tight">HTE KnowledgeBase AI</h1>
            </div>
          </div>
          <p className="text-white/80 text-lg leading-relaxed max-w-xl">
            An AI-powered policy intelligence platform for the Higher & Technical Education Department — instant, grounded answers from official Government Resolutions.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 sm:px-10 -mt-8 pb-16 space-y-10">

        {/* Mission card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-3">Our Mission</h2>
          <p className="text-gray-600 leading-relaxed">
            Maharashtra's Higher & Technical Education department administers thousands of Government Resolutions, circulars, and policy orders. Officers, faculty, institutions, and students waste countless hours manually searching through stacks of PDFs to find a single eligibility criterion or deadline.
          </p>
          <p className="text-gray-600 leading-relaxed mt-3">
            <strong className="text-gray-800">HTE KnowledgeBase</strong> changes that entirely. Using a state-of-the-art Retrieval-Augmented Generation pipeline, anyone can ask natural-language questions — in English or Marathi — and receive precise, source-cited answers grounded exclusively in official government documents, in seconds.
          </p>
        </motion.div>

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4">Key Capabilities</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{f.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Tech stack */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4">Technology Stack</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TECH_STACK.map((block, i) => (
              <motion.div
                key={block.category}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
              >
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold mb-3 ${block.color}`}>
                  <block.icon className="w-3.5 h-3.5" />
                  {block.category}
                </div>
                <ul className="space-y-1.5">
                  {block.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-gray-600">
                      <CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Data Sources */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-5">Data Sources</h2>
          <div className="space-y-3 mb-5">
            {DATA_SOURCES.map((s) => (
              <div key={s.name} className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                  <s.icon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-start gap-3">
            <Lock className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
            <p className="text-indigo-700 text-sm leading-relaxed">
              <strong>Privacy First:</strong> All data is indexed and stored locally in Qdrant on-premise. No document content or user query data is ever sent to external services. The only external call is to Google Gemini for LLM generation.
            </p>
          </div>
        </motion.div>

        {/* Team */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-5">Team & Credits</h2>
          <div className="space-y-3">
            {TEAM.map((m) => (
              <div key={m.name} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-sm">{m.initials}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{m.name}</p>
                  <p className="text-gray-500 text-sm">{m.role}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="flex flex-col sm:flex-row gap-3 pb-4"
        >
          <button
            onClick={() => onNavigate('chat')}
            className="flex-1 h-12 rounded-2xl bg-[#1a73e8] text-white font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Open AI Assistant
          </button>
          <button
            onClick={() => onNavigate('reports')}
            className="flex-1 h-12 rounded-2xl border border-gray-200 text-gray-700 font-semibold hover:border-indigo-300 hover:text-indigo-700 transition-colors"
          >
            Generate a Report
          </button>
        </motion.div>
      </div>
    </div>
  )
}
