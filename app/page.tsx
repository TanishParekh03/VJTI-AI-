'use client'

import { useState } from 'react'
import LandingPage from '@/components/landing/LandingPage'
import AppShell from '@/components/layout/AppShell'

export type AppScreen = 'landing' | 'chat' | 'documents' | 'analytics' | 'admin'

export default function Home() {
  const [screen, setScreen] = useState<AppScreen>('landing')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const handleLogin = () => {
    setIsLoggedIn(true)
    setScreen('chat')
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setScreen('landing')
  }

  if (!isLoggedIn) {
    return <LandingPage onLogin={handleLogin} />
  }

  return (
    <AppShell
      currentScreen={screen}
      onNavigate={setScreen}
      onLogout={handleLogout}
    />
  )
}
