'use client'

import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिंदी' },
    { code: 'mr', label: 'मराठी' },
  ]

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          id="tour-lang"
          className="relative w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Languages className="w-4 h-4" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-[120px] bg-card rounded-md p-1 shadow-md border border-border z-50 text-sm"
          sideOffset={5}
          align="end"
        >
          {languages.map((lang) => (
            <DropdownMenu.Item
              key={lang.code}
              className={`px-3 py-1.5 rounded-sm outline-none cursor-pointer flex items-center hover:bg-primary/10 hover:text-primary transition-colors ${
                i18n.language === lang.code ? 'font-semibold text-primary bg-primary/5' : 'text-foreground'
              }`}
              onClick={() => i18n.changeLanguage(lang.code)}
            >
              {lang.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
