'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Shield, FileCheck, ChevronRight, Eye, EyeOff, Sparkles, Layers, Search, ArrowRight } from 'lucide-react'

interface Props {
  onLogin: () => void
}

export default function LandingPage({ onLogin }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter your credentials.')
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
    <div className="min-h-screen bg-background flex flex-col lg:flex-row overflow-hidden">
      {/* Left hero panel */}
      <div className="relative flex-1 flex flex-col justify-between p-8 lg:p-14 bg-primary overflow-hidden min-h-[280px] lg:min-h-screen">
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(oklch(1 0 0 / 15%) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 15%) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
        {/* Glowing orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-white/5 blur-3xl" />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white/60 text-xs font-medium uppercase tracking-widest">Maharashtra</p>
            <p className="text-white font-semibold text-sm leading-tight">Higher & Technical Education</p>
          </div>
        </motion.div>

        {/* Main hero text */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative max-w-lg"
        >
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-3 py-1 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white/80 text-xs font-medium">AI-Powered Policy Intelligence</span>
          </div>

          <h1 className="text-white text-4xl lg:text-5xl font-bold leading-tight tracking-tight text-balance mb-5">
            HTE AI
            <span className="block text-white/60">Assistant</span>
          </h1>

          <p className="text-white/75 text-lg leading-relaxed mb-8">
            Ask anything about HTE policies, circulars &amp; guidelines — instantly, with sources.
          </p>

          {/* Feature chips */}
          <div className="flex flex-wrap gap-2">
            {['Scholarship Rules', 'AICTE Circulars', 'Exam Policies', 'Fee Regulations'].map((tag) => (
              <span key={tag} className="text-white/65 text-xs bg-white/10 border border-white/15 rounded-full px-3 py-1">
                {tag}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Trust strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="relative flex flex-col sm:flex-row gap-4 sm:gap-8"
        >
          {[
            { icon: BookOpen, label: 'Grounded in official documents' },
            { icon: FileCheck, label: 'Source-cited answers' },
            { icon: Shield, label: 'Role-based access' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-white/50 shrink-0" />
              <span className="text-white/60 text-sm">{label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Right login panel */}
      <div className="w-full lg:w-[480px] flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-sm"
        >
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-foreground text-2xl font-bold mb-1.5">Welcome back</h2>
            <p className="text-muted-foreground text-sm">Sign in to your HTE AI Assistant account</p>
          </div>

          {/* SSO button */}
          <button
            onClick={handleSSO}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 h-11 rounded-lg border border-border bg-card text-foreground text-sm font-medium hover:bg-muted transition-colors mb-5 disabled:opacity-60"
          >
            <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center">
              <Layers className="w-3 h-3 text-primary" />
            </div>
            Continue with Gov. SSO (Maha-SSO)
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-muted-foreground text-xs">or sign in with email</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Email/password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@hte.gov.in"
                className="w-full h-11 px-3.5 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-foreground">Password</label>
                <button type="button" className="text-xs text-primary hover:underline">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 px-3.5 pr-11 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-destructive text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                <>Sign in <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-6 p-3.5 rounded-lg bg-brand-muted border border-primary/15">
            <div className="flex items-start gap-2.5">
              <Search className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-primary/80 leading-relaxed">
                <strong className="font-semibold text-primary">Demo mode:</strong> Enter any credentials or use the SSO button to explore the full platform.
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Protected by the IT Act 2000. For support, contact{' '}
            <a href="#" className="text-primary hover:underline">helpdesk@hte.gov.in</a>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
