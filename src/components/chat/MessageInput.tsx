'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useChatStore } from '@/lib/store'
import { cn } from '@/lib/utils'

interface MessageInputProps {
  onSendMessage?: (content: string, mode: 'fast' | 'deep') => void
  disabled?: boolean
  placeholder?: string
}

export function MessageInput({ 
  onSendMessage,
  disabled = false,
  placeholder = "Напишите сообщение..."
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState<'fast' | 'deep'>('fast')
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { isLoading } = useChatStore()

  // Автоматическое изменение высоты текстового поля
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
    }
  }, [message])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!message.trim() || disabled || isLoading) return
    
    onSendMessage?.(message.trim(), mode)
    setMessage('')
    
    // Сброс высоты после отправки
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleModeToggle = () => {
    setMode(mode === 'fast' ? 'deep' : 'fast')
  }

  const isDisabled = disabled || isLoading

  return (
    <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Переключатель режимов */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Режим:</span>
            <button
              type="button"
              onClick={handleModeToggle}
              disabled={isDisabled}
              className={cn(
                "flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                "border border-border hover:bg-accent hover:text-accent-foreground",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                mode === 'fast' && "bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700",
                mode === 'deep' && "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700"
              )}
            >
              <span className={cn(
                "w-2 h-2 rounded-full",
                mode === 'fast' && "bg-green-500",
                mode === 'deep' && "bg-blue-500"
              )} />
              <span>
                {mode === 'fast' ? 'Быстрый ответ' : 'Глубокий анализ'}
              </span>
            </button>
          </div>

          {/* Поле ввода */}
          <div className={cn(
            "relative border rounded-lg overflow-hidden transition-colors",
            isFocused && "ring-2 ring-ring ring-offset-2",
            isDisabled && "opacity-50"
          )}>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={isDisabled}
              placeholder={placeholder}
              rows={1}
              className={cn(
                "w-full resize-none border-0 bg-transparent px-4 py-3",
                "placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-0",
                "disabled:cursor-not-allowed"
              )}
              style={{ minHeight: '52px', maxHeight: '200px' }}
            />

            {/* Кнопка отправки */}
            <div className="absolute right-2 bottom-2">
              <button
                type="submit"
                disabled={!message.trim() || isDisabled}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  "bg-primary text-primary-foreground",
                  "hover:bg-primary/90",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                )}
              >
                {isLoading ? (
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <svg 
                    className="w-4 h-4" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" 
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Подсказка */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-4">
              <span>Enter для отправки, Shift+Enter для новой строки</span>
              {mode === 'deep' && (
                <span className="text-blue-600 dark:text-blue-400">
                  🧠 Режим глубокого анализа включен
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <span>{message.length}/2000</span>
              {message.length > 1800 && (
                <span className="text-yellow-600 dark:text-yellow-400">
                  ⚠️ Близко к лимиту
                </span>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}