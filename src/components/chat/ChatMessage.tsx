'use client'

import React, { useState } from 'react'
import { Message } from '@/lib/types'
import { cn, formatDate } from '@/lib/utils'

interface ChatMessageProps {
  message: Message
  showTimestamp?: boolean
  showThinking?: boolean
}

export function ChatMessage({ 
  message, 
  showTimestamp = true,
  showThinking = false 
}: ChatMessageProps) {
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false)
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const isSystem = message.role === 'system'

  return (
    <div className={cn(
      "chat-message group relative",
      isUser && "user animate-slide-in-right",
      isAssistant && "assistant animate-slide-in-left",
      isSystem && "system animate-fade-in-up bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700"
    )}>
      {/* Аватар и роль */}
      <div className="flex items-start space-x-3">
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
          isUser && "bg-primary text-primary-foreground",
          isAssistant && "bg-muted text-muted-foreground",
          isSystem && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
        )}>
          {isUser && "Вы"}
          {isAssistant && "AI"}
          {isSystem && "⚙️"}
        </div>

        <div className="flex-1 min-w-0">
          {/* Заголовок сообщения */}
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-sm">
              {isUser && "Вы"}
              {isAssistant && "Komair"}
              {isSystem && "Система"}
            </span>
            
            {message.mode && (
              <span className={cn(
                "px-2 py-0.5 text-xs rounded-full",
                message.mode === 'fast' && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
                message.mode === 'deep' && "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
              )}>
                {message.mode === 'fast' ? 'Быстрый ответ' : 'Глубокий анализ'}
              </span>
            )}
            
            {showTimestamp && (
              <span className="text-xs text-muted-foreground">
                {formatDate(message.timestamp)}
              </span>
            )}
          </div>

          {/* Процесс мышления (для глубокого анализа) */}
          {message.thinking && showThinking && (
            <div className="mb-3">
              <button
                onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
                className="flex items-center space-x-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className={cn(
                  "transition-transform",
                  isThinkingExpanded && "rotate-90"
                )}>
                  ▶
                </span>
                <span>Процесс мышления</span>
              </button>
              
              {isThinkingExpanded && (
                <div className="mt-2 p-3 bg-muted/50 rounded-md border-l-2 border-blue-500">
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {message.thinking}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Основное содержимое */}
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {message.isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-muted-foreground">Печатает...</span>
              </div>
            ) : (
              <div className="whitespace-pre-wrap break-words">
                {message.content}
              </div>
            )}
          </div>

          {/* Действия с сообщением */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-2">
            <div className="flex items-center space-x-2">
              <button
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => navigator.clipboard?.writeText(message.content)}
              >
                Копировать
              </button>
              
              {isAssistant && (
                <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Повторить
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}