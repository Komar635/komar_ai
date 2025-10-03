'use client'

import { useEffect, useCallback } from 'react'

export interface HotKey {
  key: string
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  metaKey?: boolean
  action: () => void
  description?: string
  preventDefault?: boolean
}

export function useHotKeys(hotKeys: HotKey[], enabled: boolean = true) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    const matchingHotKey = hotKeys.find(hotKey => {
      return (
        hotKey.key.toLowerCase() === event.key.toLowerCase() &&
        !!hotKey.ctrlKey === event.ctrlKey &&
        !!hotKey.altKey === event.altKey &&
        !!hotKey.shiftKey === event.shiftKey &&
        !!hotKey.metaKey === event.metaKey
      )
    })

    if (matchingHotKey) {
      if (matchingHotKey.preventDefault !== false) {
        event.preventDefault()
      }
      matchingHotKey.action()
    }
  }, [hotKeys, enabled])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// Предустановленные комбинации для чата
export function useChatHotKeys(actions: {
  newChat?: () => void
  focusInput?: () => void
  toggleTheme?: () => void
  escape?: () => void
}) {
  const hotKeys: HotKey[] = [
    // Ctrl+N - новый чат
    ...(actions.newChat ? [{
      key: 'n',
      ctrlKey: true,
      action: actions.newChat,
      description: 'Создать новый чат'
    }] : []),
    
    // Ctrl+K - фокус на поле ввода
    ...(actions.focusInput ? [{
      key: 'k',
      ctrlKey: true,
      action: actions.focusInput,
      description: 'Перейти к полю ввода'
    }] : []),
    
    // Ctrl+Shift+L - переключение темы
    ...(actions.toggleTheme ? [{
      key: 'l',
      ctrlKey: true,
      shiftKey: true,
      action: actions.toggleTheme,
      description: 'Переключить тему'
    }] : []),
    
    // Escape - отмена/закрытие
    ...(actions.escape ? [{
      key: 'Escape',
      action: actions.escape,
      description: 'Отмена',
      preventDefault: false
    }] : [])
  ]

  useHotKeys(hotKeys)
  
  return hotKeys
}