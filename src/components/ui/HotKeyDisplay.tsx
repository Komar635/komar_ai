'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'

interface HotKeyDisplayProps {
  className?: string
}

export function HotKeyDisplay({ className }: HotKeyDisplayProps) {
  const [isVisible, setIsVisible] = useState(false)

  const hotKeys = [
    { keys: ['Ctrl', 'N'], description: 'Создать новый чат' },
    { keys: ['Ctrl', 'K'], description: 'Перейти к полю ввода' },
    { keys: ['Ctrl', 'Shift', 'L'], description: 'Переключить тему' },
    { keys: ['Enter'], description: 'Отправить сообщение' },
    { keys: ['Shift', 'Enter'], description: 'Новая строка' },
    { keys: ['Esc'], description: 'Отмена' },
    { keys: ['?'], description: 'Показать горячие клавиши' }
  ]

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className={cn(
          "fixed bottom-4 left-4 z-50 p-2 bg-background border rounded-full shadow-lg",
          "hover:bg-accent text-muted-foreground hover:text-foreground",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "hidden lg:block",
          className
        )}
        title="Горячие клавиши (нажмите ? для показа)"
        aria-label="Показать горячие клавиши"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsVisible(false)}>
      <div 
        className="bg-background border rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="hotkeys-title"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="hotkeys-title" className="text-lg font-semibold">Горячие клавиши</h2>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Закрыть"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-3">
          {hotKeys.map((hotKey, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{hotKey.description}</span>
              <div className="flex items-center space-x-1">
                {hotKey.keys.map((key, keyIndex) => (
                  <React.Fragment key={keyIndex}>
                    {keyIndex > 0 && <span className="text-xs text-muted-foreground">+</span>}
                    <kbd className="px-2 py-1 text-xs font-mono bg-muted text-muted-foreground rounded border">
                      {key}
                    </kbd>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
          Нажмите <kbd className="px-1 py-0.5 bg-muted rounded">?</kbd> чтобы показать/скрыть это окно
        </div>
      </div>
    </div>
  )
}

// Hook для управления отображением горячих клавиш
export function useHotKeyDisplay() {
  const [isVisible, setIsVisible] = useState(false)

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === '?' && !event.ctrlKey && !event.altKey && !event.metaKey) {
        // Проверяем, что фокус не в поле ввода
        const activeElement = document.activeElement
        if (activeElement && (
          activeElement.tagName === 'INPUT' || 
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.getAttribute('contenteditable') === 'true'
        )) {
          return
        }
        
        event.preventDefault()
        setIsVisible(prev => !prev)
      } else if (event.key === 'Escape' && isVisible) {
        setIsVisible(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isVisible])

  return { isVisible, setIsVisible }
}