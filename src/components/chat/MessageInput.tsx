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
      <div className="px-4 py-4 sm:px-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Переключатель режимов */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground hidden sm:inline" id="mode-label">Режим:</span>
            <button
              type="button"
              onClick={handleModeToggle}
              disabled={isDisabled}
              className={cn(
                "flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                "border border-border hover:bg-accent hover:text-accent-foreground",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                mode === 'fast' && "bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700",
                mode === 'deep' && "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700"
              )}
              aria-describedby="mode-label mode-description"
              aria-label={`Текущий режим: ${mode === 'fast' ? 'быстрый ответ' : 'глубокий анализ'}. Нажмите для смены`}
            >
              <span 
                className={cn(
                  "w-2 h-2 rounded-full",
                  mode === 'fast' && "bg-green-500",
                  mode === 'deep' && "bg-blue-500"
                )}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">
                {mode === 'fast' ? 'Быстрый ответ' : 'Глубокий анализ'}
              </span>
              <span className="sm:hidden">
                {mode === 'fast' ? 'Быстрый' : 'Глубокий'}
              </span>
            </button>
            <div id="mode-description" className="sr-only">
              {mode === 'fast' 
                ? 'Быстрый режим для мгновенных ответов'
                : 'Режим глубокого анализа для сложных задач'
              }
            </div>
          </div>

          {/* Поле ввода */}
          <div className={cn(
            "relative border rounded-lg overflow-hidden transition-colors",
            isFocused && "ring-2 ring-ring ring-offset-2",
            isDisabled && "opacity-50"
          )}>
            <label htmlFor="message-input" className="sr-only">
              Напишите ваше сообщение
            </label>
            <textarea
              id="message-input"
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
              aria-label="Поле ввода сообщения"
              aria-describedby="input-description character-count"
              maxLength={2000}
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
                aria-label={isLoading ? 'Отправка сообщения...' : 'Отправить сообщение'}
              >
                {isLoading ? (
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                ) : (
                  <svg 
                    className="w-4 h-4" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    aria-hidden="true"
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground space-y-2 sm:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0">
              <div id="input-description">
                <span className="hidden sm:inline">Enter для отправки, Shift+Enter для новой строки</span>
                <span className="sm:hidden">Enter - отправить, Shift+Enter - новая строка</span>
              </div>
              {mode === 'deep' && (
                <div className="text-blue-600 dark:text-blue-400" role="status">
                  🧠 Режим глубокого анализа включен
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-between sm:justify-end space-x-2">
              <div id="character-count" aria-live="polite">
                <span aria-label={`Количество символов: ${message.length} из 2000`}>
                  {message.length}/2000
                </span>
              </div>
              {message.length > 1800 && (
                <div className="text-yellow-600 dark:text-yellow-400" role="alert">
                  ⚠️ Близко к лимиту
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}