'use client'

import { useState, useEffect } from 'react'
import '@/lib/i18n'
import LandingPage from '@/components/landing/LandingPage'
import AppShell from '@/components/layout/AppShell'

export type AppScreen = 'landing' | 'chat' | 'documents' | 'analytics' | 'admin' | 'about' | 'reports'


export default function Home() {
  const [screen, setScreen] = useState<AppScreen>('landing')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    const storedAuth = localStorage.getItem('hte_auth')
    const storedScreen = localStorage.getItem('hte_screen')
    if (storedAuth === 'true') {
      setIsLoggedIn(true)
      if (storedScreen) {
        setScreen(storedScreen as AppScreen)
      } else {
        setScreen('chat')
      }
    }
  }, [])

  const handleLogin = () => {
    setIsLoggedIn(true)
    setScreen('chat')
    localStorage.setItem('hte_auth', 'true')
    localStorage.setItem('hte_screen', 'chat')
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setScreen('landing')
    localStorage.removeItem('hte_auth')
    localStorage.removeItem('hte_screen')
  }

  const handleNavigate = (s: AppScreen) => {
    setScreen(s)
    localStorage.setItem('hte_screen', s)
  }

  if (!isMounted) return null

  if (!isLoggedIn) {
    return <LandingPage onLogin={handleLogin} />
  }

  return (
    <AppShell
      currentScreen={screen}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
    />
  )
}
