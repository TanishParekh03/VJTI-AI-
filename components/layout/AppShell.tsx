'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare, FileText, BarChart2, Users, LogOut,
  Sparkles, Search, Bell, ChevronRight, Menu, X, HelpCircle,
  Info, ClipboardList
} from 'lucide-react'

import type { AppScreen } from '@/app/page'
import ChatScreen from '@/components/chat/ChatScreen'
import DocumentLibrary from '@/components/documents/DocumentLibrary'
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard'
import AdminPanel from '@/components/admin/AdminPanel'
import AboutPage from '@/components/about/AboutPage'
import ReportsPage from '@/components/reports/ReportsPage'
import CommandPalette from '@/components/layout/CommandPalette'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher'
import ProductTour from '@/components/layout/ProductTour'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface Props {
  currentScreen: AppScreen
  onNavigate: (screen: AppScreen) => void
  onLogout: () => void
}

const NAV_ITEMS = [
  { id: 'chat' as AppScreen, labelKey: 'nav.assistant', icon: MessageSquare },
  { id: 'documents' as AppScreen, labelKey: 'nav.documents', icon: FileText },
  { id: 'analytics' as AppScreen, labelKey: 'nav.analytics', icon: BarChart2 },
  { id: 'admin' as AppScreen, labelKey: 'nav.admin', icon: Users },
]

// The four visible top-nav links
const TOP_NAV = [
  { label: 'Home', screen: 'chat' as AppScreen },
  { label: 'Documents', screen: 'documents' as AppScreen },
  { label: 'Reports', screen: 'reports' as AppScreen },
  { label: 'About', screen: 'about' as AppScreen },
]

function Topbar({
  currentScreen,
  onNavigate,
  onLogout,
  onCommandPalette,
  onMobileMenu,
  onStartTour,
}: {
  currentScreen: AppScreen
  onNavigate: (s: AppScreen) => void
  onLogout: () => void
  onCommandPalette: () => void
  onMobileMenu: () => void
  onStartTour: () => void
}) {
  const current = NAV_ITEMS.find((n) => n.id === currentScreen)
  const { t } = useTranslation()

  return (
    <header className="relative flex items-center justify-between px-6 h-16 border-b border-[#dadce0] bg-white shrink-0 z-10">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#1a73e8]" />
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <button
          onClick={onMobileMenu}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-md text-[#5f6368] hover:text-[#202124] hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo */}
        <button onClick={() => onNavigate('chat')} className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#1a73e8] flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm tracking-wide">HTE</span>
          </div>
          <div className="hidden sm:block">
            <p className="text-[15px] font-semibold text-[#202124] leading-tight">HTE KnowledgeBase</p>
          </div>
        </button>

        {/* Breadcrumb */}
        {current && (
          <div className="hidden sm:flex items-center gap-1 text-muted-foreground">
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-sm font-medium text-foreground">{t(current.labelKey)}</span>
          </div>
        )}
      </div>

      {/* Desktop nav */}
      <nav id="tour-nav" className="hidden lg:flex items-center gap-1">
        {TOP_NAV.map((item, idx) => (
          <button
            key={item.label}
            onClick={() => onNavigate(item.screen)}
            className={cn(
              'px-4 py-1.5 rounded-full text-[14px] font-medium transition-all',
              currentScreen === item.screen
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-[#5f6368] hover:text-[#202124] hover:bg-gray-100'
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-1.5">
        <button
          id="tour-search"
          onClick={onCommandPalette}
          className="hidden sm:flex items-center gap-2 h-8 px-3 rounded-lg border border-border bg-background text-xs text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span>{t('nav.search')}</span>
          <kbd className="ml-1 px-1 rounded border border-border bg-muted text-[10px]">⌘K</kbd>
        </button>

        <LanguageSwitcher />

        <button
          onClick={onStartTour}
          title={t('tour.start_tour') || 'Start Tour'}
          className="relative w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <div id="tour-logout" className="flex items-center gap-1.5">
          <button className="relative w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
          </button>

          <div className="w-px h-5 bg-border mx-1" />

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted text-xs transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:block">{t('nav.logout')}</span>
          </button>
        </div>
      </div>
    </header>
  )
}

function MobileSidebar({
  open,
  currentScreen,
  onNavigate,
  onClose,
  onLogout,
}: {
  open: boolean
  currentScreen: AppScreen
  onNavigate: (s: AppScreen) => void
  onClose: () => void
  onLogout: () => void
}) {
  const { t } = useTranslation()

  const ALL_ITEMS = [
    ...NAV_ITEMS,
    { id: 'reports' as AppScreen, labelKey: 'Reports', icon: ClipboardList },
    { id: 'about' as AppScreen, labelKey: 'About', icon: Info },
  ]

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border z-40 flex flex-col lg:hidden"
          >
            <div className="flex items-center justify-between px-4 h-14 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-foreground">HTE AI</span>
              </div>
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="flex-1 p-3 space-y-1">
              {ALL_ITEMS.map(({ id, labelKey, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => { onNavigate(id); onClose() }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    currentScreen === id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {typeof labelKey === 'string' && labelKey.startsWith('nav.') ? t(labelKey) : labelKey}
                </button>
              ))}
            </nav>

            <div className="p-3 border-t border-border">
              <button
                onClick={() => { onLogout(); onClose() }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {t('nav.logout')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Screen component registry — About and Reports receive onNavigate as prop
function ScreenRenderer({
  screen,
  onNavigate,
}: {
  screen: AppScreen
  onNavigate: (s: AppScreen) => void
}) {
  switch (screen) {
    case 'chat': return <ChatScreen />
    case 'documents': return <DocumentLibrary />
    case 'analytics': return <AnalyticsDashboard />
    case 'admin': return <AdminPanel />
    case 'about': return <AboutPage onNavigate={onNavigate} />
    case 'reports': return <ReportsPage onNavigate={onNavigate} />
    default: return <ChatScreen />
  }
}

export default function AppShell({ currentScreen, onNavigate, onLogout }: Props) {
  const [commandOpen, setCommandOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [tourOpen, setTourOpen] = useState(false)

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Topbar
        currentScreen={currentScreen}
        onNavigate={onNavigate}
        onLogout={onLogout}
        onCommandPalette={() => setCommandOpen(true)}
        onMobileMenu={() => setMobileMenuOpen(true)}
        onStartTour={() => setTourOpen(true)}
      />

      <MobileSidebar
        open={mobileMenuOpen}
        currentScreen={currentScreen}
        onNavigate={onNavigate}
        onClose={() => setMobileMenuOpen(false)}
        onLogout={onLogout}
      />

      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="h-full"
          >
            <ScreenRenderer screen={currentScreen} onNavigate={onNavigate} />
          </motion.div>
        </AnimatePresence>
      </main>

      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
      <ProductTour runTour={tourOpen} onClose={() => setTourOpen(false)} />
    </div>
  )
}
