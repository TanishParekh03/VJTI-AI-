'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Shield, FileCheck, ChevronRight, Eye, EyeOff,
  Sparkles, Layers, Search, ArrowRight, X, Users, Zap, Globe,
  Award, CheckCircle, Brain, Database, Lock, BarChart2, FileText
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface Props {
  onLogin: () => void
}

function AboutModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()

  const TECH_ITEMS = [
    [t('landing.tech_rag'), t('landing.tech_rag_desc')],
    [t('landing.tech_llm'), t('landing.tech_llm_desc')],
    [t('landing.tech_vector'), t('landing.tech_vector_desc')],
    [t('landing.tech_ingestion'), t('landing.tech_ingestion_desc')],
    [t('landing.tech_backend'), t('landing.tech_backend_desc')],
    [t('landing.tech_frontend'), t('landing.tech_frontend_desc')],
  ]

  const TEAM = [
    { name: t('landing.team_vjti'), role: t('landing.team_vjti_role') },
    { name: t('landing.team_hte'), role: t('landing.team_hte_role') },
    { name: t('landing.team_orgpedia'), role: t('landing.team_orgpedia_role') },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-gray-100"
      >
        {/* Header gradient */}
        <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 px-8 pt-8 pb-10">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full bg-white/5 blur-2xl" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="relative flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center">
              <span className="text-white font-bold text-xl">VA</span>
            </div>
            <div>
              <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">{t('landing.maharashtra_gov')}</p>
              <h2 className="text-white font-bold text-xl">Vachak Ai</h2>
            </div>
          </div>
          <p className="relative text-white/80 text-sm leading-relaxed max-w-lg">
            {t('landing.about_modal_subtitle')}
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-7">
          {/* Mission */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-3">{t('landing.our_mission')}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              {t('landing.mission_text')}
            </p>
          </div>

          {/* Tech */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-3">{t('landing.technology')}</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {TECH_ITEMS.map(([k, v]) => (
                <div key={k} className="flex items-start gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <CheckCircle className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[11px] font-bold text-gray-900">{k}</p>
                    <p className="text-[11px] text-gray-500">{v}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-3">{t('landing.team_credits')}</h3>
            <div className="space-y-2">
              {TEAM.map((m) => (
                <div key={m.name} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-gray-900">{m.name}</p>
                    <p className="text-[11px] text-gray-500">{m.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Data sources */}
          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
            <p className="text-xs font-bold text-indigo-800 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> {t('landing.data_privacy')}
            </p>
            <p className="text-xs text-indigo-700 leading-relaxed">
              {t('landing.data_privacy_text')}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full h-11 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            {t('landing.got_it')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function LandingPage({ onLogin }: Props) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'home' | 'about'>('home')
  const [aboutOpen, setAboutOpen] = useState(false)

  const FEATURES = [
    {
      icon: Brain,
      title: t('landing.feature_ai_title'),
      desc: t('landing.feature_ai_desc'),
      color: 'from-violet-500/20 to-indigo-500/20',
      border: 'border-violet-200',
      icon_bg: 'bg-violet-100 text-violet-600',
    },
    {
      icon: FileCheck,
      title: t('landing.feature_source_title'),
      desc: t('landing.feature_source_desc'),
      color: 'from-blue-500/20 to-cyan-500/20',
      border: 'border-blue-200',
      icon_bg: 'bg-blue-100 text-blue-600',
    },
    {
      icon: Database,
      title: t('landing.feature_db_title'),
      desc: t('landing.feature_db_desc'),
      color: 'from-emerald-500/20 to-teal-500/20',
      border: 'border-emerald-200',
      icon_bg: 'bg-emerald-100 text-emerald-600',
    },
    {
      icon: Shield,
      title: t('landing.feature_rbac_title'),
      desc: t('landing.feature_rbac_desc'),
      color: 'from-amber-500/20 to-orange-500/20',
      border: 'border-amber-200',
      icon_bg: 'bg-amber-100 text-amber-600',
    },
    {
      icon: Globe,
      title: t('landing.feature_bilingual_title'),
      desc: t('landing.feature_bilingual_desc'),
      color: 'from-pink-500/20 to-rose-500/20',
      border: 'border-pink-200',
      icon_bg: 'bg-pink-100 text-pink-600',
    },
    {
      icon: BarChart2,
      title: t('landing.feature_compliance_title'),
      desc: t('landing.feature_compliance_desc'),
      color: 'from-indigo-500/20 to-purple-500/20',
      border: 'border-indigo-200',
      icon_bg: 'bg-indigo-100 text-indigo-600',
    },
  ]

  const TRUST_ITEMS = [
    { icon: BookOpen, text: t('landing.trust_grounded') },
    { icon: FileCheck, text: t('landing.trust_cited') },
    { icon: Shield, text: t('landing.trust_rbac') },
    { icon: Award, text: t('landing.trust_bilingual') },
  ]

  const TAGS = [
    t('landing.tag_scholarship'),
    t('landing.tag_aicte'),
    t('landing.tag_exam'),
    t('landing.tag_fee'),
    t('landing.tag_university'),
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError(t('landing.enter_credentials'))
      return
    }
    setError('')
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      onLogin()
    }, 1200)
  }

  const handleSSO = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      onLogin()
    }, 800)
  }

  return (
    <>
      <div className="min-h-screen bg-[#f8f9fc] flex flex-col">
        {/* ── Nav bar ─────────────────────────────────────────────── */}
        <nav className="sticky top-0 z-20 flex items-center justify-between px-6 sm:px-10 h-16 bg-white/90 backdrop-blur border-b border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
              <span className="text-white font-bold text-sm">VA</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-[15px] leading-tight">Vachak Ai</p>
              <p className="text-xs text-gray-500 font-medium tracking-wide uppercase">{t('landing.maharashtra_gov')}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {(['home', 'about'] as const).map((tabVal) => (
              <button
                key={tabVal}
                onClick={() => { setTab(tabVal); if (tabVal === 'about') setAboutOpen(true) }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  tab === tabVal
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {tabVal === 'home' ? t('landing.home') : t('landing.about_us')}
              </button>
            ))}
          </div>
        </nav>

        {/* ── Hero ────────────────────────────────────────────────── */}
        <section className="relative flex flex-col lg:flex-row items-center gap-12 px-6 sm:px-10 py-16 max-w-7xl mx-auto w-full">
          {/* Left text */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="flex-1 max-w-xl"
          >
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-indigo-700 text-xs font-semibold">{t('landing.ai_policy_intelligence')}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-[1.1] tracking-tight mb-5">
              {t('landing.hero_title_1')}<br />
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                {t('landing.hero_title_2')}
              </span>
            </h1>

            <p className="text-gray-500 text-lg leading-relaxed mb-8">
              {t('landing.hero_desc')}
            </p>

            <div className="flex flex-wrap gap-2 mb-10">
              {TAGS.map((tag) => (
                <span key={tag} className="text-indigo-700 text-xs font-medium bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1">
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSSO}
                className="flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg"
              >
                <Layers className="w-4 h-4" />
                {t('landing.continue_sso')}
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setAboutOpen(true)}
                className="flex items-center justify-center gap-2 h-12 px-6 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:border-indigo-300 hover:text-indigo-700 transition-all"
              >
                {t('landing.learn_more')}
              </button>
            </div>
          </motion.div>

          {/* Right login card */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, delay: 0.15 }}
            className="w-full max-w-sm"
          >
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">{t('landing.welcome_back')}</h2>
                <p className="text-sm text-gray-500">{t('landing.sign_in_subtitle')}</p>
              </div>

              {/* SSO */}
              <button
                onClick={handleSSO}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 h-11 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 text-sm font-medium hover:border-indigo-300 hover:bg-indigo-50 transition-all mb-5 disabled:opacity-60"
              >
                <div className="w-5 h-5 rounded bg-indigo-100 flex items-center justify-center">
                  <Layers className="w-3 h-3 text-indigo-600" />
                </div>
                {t('landing.continue_sso_maha')}
                <ArrowRight className="w-3.5 h-3.5 text-gray-400 ml-auto" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-gray-400 text-xs">{t('landing.or_sign_in_email')}</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('landing.email_address')}</label>
                  <input
                    suppressHydrationWarning
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@hte.gov.in"
                    className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-700">{t('landing.password')}</label>
                    <button suppressHydrationWarning type="button" className="text-xs text-indigo-600 hover:underline">
                      {t('landing.forgot_password')}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      suppressHydrationWarning
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-11 px-3.5 pr-11 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    />
                    <button
                      suppressHydrationWarning
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-red-500 text-sm">{error}</p>
                )}

                <button
                  suppressHydrationWarning
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-indigo-600 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-indigo-700 transition disabled:opacity-60 shadow-sm"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('landing.signing_in')}
                    </span>
                  ) : (
                    <>{t('landing.sign_in')} <ChevronRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>

              <div className="mt-5 p-3.5 rounded-xl bg-indigo-50 border border-indigo-100">
                <div className="flex items-start gap-2.5">
                  <Search className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-indigo-700 leading-relaxed">
                    <strong className="font-semibold">{t('landing.demo_mode')}</strong> {t('landing.demo_desc')}
                  </p>
                </div>
              </div>

              <p className="text-center text-xs text-gray-400 mt-5">
                {t('landing.it_act_notice')}{' '}
                <a href="#" className="text-indigo-600 hover:underline">helpdesk@hte.gov.in</a>
              </p>
            </div>
          </motion.div>
        </section>

        {/* ── Features grid ──────────────────────────────────────── */}
        <section className="px-6 sm:px-10 pb-16 max-w-7xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="flex-1 h-px bg-gray-100" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('landing.platform_features')}</p>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.06 }}
                  className={`group p-5 rounded-2xl border ${f.border} bg-gradient-to-br ${f.color} hover:shadow-md transition-all`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.icon_bg} mb-4`}>
                    <f.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-[15px] mb-1.5">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Trust bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-12 flex flex-wrap justify-center gap-6"
          >
            {TRUST_ITEMS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-gray-500 text-sm">
                <Icon className="w-4 h-4 text-indigo-400" />
                <span>{text}</span>
              </div>
            ))}
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-100 py-5 px-6 text-center text-xs text-gray-400">
          {t('landing.footer_text')} ·{' '}
          <button onClick={() => setAboutOpen(true)} className="text-indigo-500 hover:underline">{t('landing.about_us')}</button>
        </footer>
      </div>

      {/* About modal */}
      <AnimatePresence>
        {aboutOpen && <AboutModal onClose={() => { setAboutOpen(false); setTab('home') }} />}
      </AnimatePresence>
    </>
  )
}
