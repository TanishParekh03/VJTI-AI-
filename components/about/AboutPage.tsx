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
    <div className="h-full overflow-y-auto bg-gray-50/50 selection:bg-indigo-500/30">
      {/* Hero */}
      <div className="relative bg-[#0A0F2C] px-6 sm:px-12 pt-16 pb-32 overflow-hidden">
        {/* Dynamic mesh gradient background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-indigo-600/20 blur-[120px] mix-blend-screen" />
          <div className="absolute top-[20%] -right-[20%] w-[60%] h-[80%] rounded-full bg-violet-600/20 blur-[130px] mix-blend-screen" />
          <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-blue-500/20 blur-[100px] mix-blend-screen" />
          
          {/* Subtle grid overlay */}
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03]" />
        </div>

        <button
          onClick={() => onNavigate('chat')}
          className="relative z-10 flex items-center gap-2 text-white/60 hover:text-white text-sm mb-10 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Assistant
        </button>

        <div className="relative z-10 max-w-4xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-5 mb-8"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-[0_0_40px_rgba(79,70,229,0.3)] backdrop-blur-xl flex items-center justify-center">
              <span className="text-white font-black text-2xl tracking-wide">HTE</span>
            </div>
            <div>
              <p className="text-indigo-400 text-xs font-bold uppercase tracking-[0.2em] mb-1.5">Government of Maharashtra</p>
              <h1 className="text-white font-black text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-tight">
                HTE KnowledgeBase <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">AI</span>
              </h1>
            </div>
          </motion.div>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/70 text-lg sm:text-xl leading-relaxed max-w-2xl font-light"
          >
            An AI-powered policy intelligence platform for the Higher & Technical Education Department — instant, grounded answers from official Government Resolutions.
          </motion.p>
        </div>
      </div>

      <div className="relative max-w-6xl mx-auto px-6 sm:px-10 -mt-20 pb-20 space-y-8 z-20">

        {/* Mission card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white/50 shadow-xl shadow-gray-200/40 p-8 sm:p-10"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Our Mission</h2>
          </div>
          <div className="prose prose-lg prose-indigo max-w-none text-gray-600">
            <p>
              Maharashtra's Higher & Technical Education department administers thousands of Government Resolutions, circulars, and policy orders. Officers, faculty, institutions, and students waste countless hours manually searching through stacks of PDFs to find a single eligibility criterion or deadline.
            </p>
            <p>
              <strong className="text-gray-900 font-semibold">HTE KnowledgeBase</strong> changes that entirely. Using a state-of-the-art Retrieval-Augmented Generation pipeline, anyone can ask natural-language questions — in English or Marathi — and receive precise, source-cited answers grounded exclusively in official government documents, in seconds.
            </p>
          </div>
        </motion.div>

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-xl font-bold text-gray-900 mb-6 tracking-tight">Key Capabilities</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="bg-white rounded-2xl border border-gray-100/80 shadow-lg shadow-gray-200/20 p-6 flex flex-col group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <f.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-[15px] mb-2">{f.title}</h3>
                <p className="text-gray-500 text-[13px] leading-relaxed flex-1">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Tech stack */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-xl font-bold text-gray-900 mb-6 tracking-tight">Enterprise Architecture</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {TECH_STACK.map((block, i) => (
              <motion.div
                key={block.category}
                whileHover={{ y: -2 }}
                className="bg-white rounded-2xl border border-gray-100/80 shadow-lg shadow-gray-200/20 p-6 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <block.icon className="w-24 h-24" />
                </div>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] uppercase tracking-wider font-bold mb-5 ${block.color}`}>
                  <block.icon className="w-3.5 h-3.5" />
                  {block.category}
                </div>
                <ul className="space-y-2.5 relative z-10">
                  {block.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[13px] text-gray-600 font-medium">
                      <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Data Sources */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/20 p-8 flex flex-col"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6 tracking-tight">Verified Data Sources</h2>
            <div className="space-y-4 mb-8 flex-1">
              {DATA_SOURCES.map((s) => (
                <div key={s.name} className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50/80 border border-gray-100 hover:bg-indigo-50/50 hover:border-indigo-100 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <s.icon className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm mb-1">{s.name}</p>
                    <p className="text-gray-500 text-xs leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100/50 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-indigo-900/80 text-sm leading-relaxed font-medium pt-1.5">
                All data is indexed and stored locally in Qdrant on-premise. No document content leaves your infrastructure.
              </p>
            </div>
          </motion.div>

          {/* Team */}
          <div className="space-y-8 flex flex-col">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/20 p-8 flex-1"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-6 tracking-tight">Project Collaboration</h2>
              <div className="space-y-4">
                {TEAM.map((m, i) => (
                  <div key={m.name} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${
                      i === 0 ? 'from-indigo-500 to-violet-600' : 
                      i === 1 ? 'from-emerald-400 to-teal-500' : 'from-orange-400 to-amber-500'
                    } flex items-center justify-center shrink-0 shadow-inner`}>
                      <span className="text-white font-bold text-[15px]">{m.initials}</span>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-[15px] mb-0.5">{m.name}</p>
                      <p className="text-gray-500 text-xs font-medium">{m.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex gap-4"
            >
              <button
                onClick={() => onNavigate('chat')}
                className="flex-1 h-14 rounded-2xl bg-[#0A0F2C] text-white font-semibold hover:bg-indigo-600 transition-colors shadow-xl shadow-indigo-600/20"
              >
                Open Assistant
              </button>
              <button
                onClick={() => onNavigate('reports')}
                className="flex-1 h-14 rounded-2xl border-2 border-gray-200 text-gray-700 font-semibold hover:border-[#0A0F2C] hover:text-[#0A0F2C] transition-colors"
              >
                Generate Report
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
