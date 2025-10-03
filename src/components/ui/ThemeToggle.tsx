'use client'

import React, { useEffect, useState } from 'react'
import { useChatStore } from '@/lib/store'
import { cn } from '@/lib/utils'

export function ThemeToggle() {
  const { theme, setTheme } = useChatStore()
  const [mounted, setMounted] = useState(false)

  // Избегаем гидратации на сервере
  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(newTheme)
  }

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )
      case 'dark':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )
      case 'system':
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )
    }
  }

  const getThemeLabel = () => {
    switch (theme) {
      case 'light': return 'Светлая'
      case 'dark': return 'Темная'
      case 'system': return 'Системная'
      default: return 'Системная'
    }
  }

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-md border border-input bg-background" />
    )
  }

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative w-9 h-9 rounded-md border border-input bg-background",
        "hover:bg-accent hover:text-accent-foreground",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "transition-all duration-200 ease-in-out",
        "flex items-center justify-center"
      )}
      title={`Сменить тему (текущая: ${getThemeLabel()})`}
    >
      <div className="transition-transform duration-200 ease-in-out hover:scale-110">
        {getThemeIcon()}
      </div>
      
      {/* Индикатор активной темы */}
      <div className={cn(
        "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background",
        "transition-colors duration-200",
        theme === 'light' && "bg-yellow-500",
        theme === 'dark' && "bg-blue-900",
        theme === 'system' && "bg-purple-500"
      )} />
    </button>
  )
}