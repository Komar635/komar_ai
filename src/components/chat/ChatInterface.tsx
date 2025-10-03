'use client'

import React, { useEffect, useRef } from 'react'
import { useChatStore, useCurrentChat } from '@/lib/store'
import { AIService } from '@/lib/ai-service'
import { ChatMessage } from './ChatMessage'
import { MessageInput } from './MessageInput'
import { ChatList } from './ChatList'
import { ConnectionStatus, APIStatus } from '@/components/ui/StatusIndicator'
import { HotKeyDisplay } from '@/components/ui/HotKeyDisplay'
import { useFeedback } from '@/hooks/useFeedback'
import { useChatHotKeys } from '@/hooks/useHotKeys'
import { cn } from '@/lib/utils'
import { safeLogger } from '@/lib/logger'

interface ChatInterfaceProps {
  className?: string
}

export function ChatInterface({ className }: ChatInterfaceProps) {
  const {
    currentChatId,
    chats,
    createChat,
    addMessage,
    updateChatTitle,
    setLoading,
    setError,
    isLoading,
    error,
    loadChatsFromStorage
  } = useChatStore()
  
  const currentChat = useCurrentChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null)
  const { showError, showSuccess } = useFeedback()
  
  const handleNewChat = () => {
    try {
      const chatId = createChat()
      showSuccess('Новый чат создан')
      return chatId
    } catch (error) {
      safeLogger.error('Ошибка создания чата:', error)
      showError('Не удалось создать новый чат')
    }
  }
  
  // Настройка горячих клавиш
  useChatHotKeys({
    newChat: () => handleNewChat(),
    focusInput: () => messageInputRef.current?.focus(),
    escape: () => {
      // Снятие фокуса с элементов или закрытие модалов
      document.activeElement instanceof HTMLElement && document.activeElement.blur()
    }
  })

  // Загружаем чаты при монтировании компонента (только на клиенте)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadChatsFromStorage()
    }
  }, [])

  // Автоскролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentChat?.messages])

  const handleSendMessage = async (content: string, mode: 'fast' | 'deep') => {
    // Дополнительная защита от повторных вызовов
    if (isLoading) {
      return
    }

    try {
      let chatId = currentChatId
      
      // Создаем новый чат если нет активного
      if (!chatId) {
        chatId = createChat('Новый чат', mode)
      }

      // Подготавливаем сообщение
      const preparedMessage = AIService.prepareMessage(content)
      
      // Добавляем сообщение пользователя
      addMessage(chatId, {
        content: preparedMessage,
        role: 'user',
        mode
      })

      // Получаем историю чата
      const chat = currentChat || chats.find(c => c.id === chatId)
      const chatHistory = chat ? AIService.formatChatHistory(chat.messages) : []

      setLoading(true)
      
      try {
        // Отправляем запрос к ИИ API
        const response = await AIService.sendMessage(
          preparedMessage,
          mode,
          chatHistory
        )
        
        // Добавляем ответ ИИ
        addMessage(chatId, {
          content: response.content,
          role: 'assistant',
          mode: response.mode,
          thinking: response.thinking
        })
        
        // Обновляем заголовок чата для новых чатов
        if (chat && chat.messages.length <= 2) {
          const shortTitle = preparedMessage.length > 50 
            ? preparedMessage.substring(0, 50) + '...'
            : preparedMessage
          updateChatTitle(chatId, shortTitle)
        }
        
        // Показываем успешное уведомление только при необходимости
        if (response.model?.includes('Mock')) {
          showSuccess('Тестовый ответ получен. Настройте реальный AI провайдер для лучшего опыта.')
        }
        
      } catch (innerError) {
        // Логируем ошибку безопасно
        try {
          safeLogger.warn('Ошибка при получении ответа от ИИ:', innerError)
        } catch {
          // Игнорируем ошибки логирования
        }
        
        // Добавляем сообщение об ошибке
        const errorMessage = innerError instanceof Error 
          ? `Ошибка: ${innerError.message}`
          : 'Извините, произошла ошибка при обработке вашего запроса.'
          
        addMessage(chatId, {
          content: errorMessage,
          role: 'assistant',
          mode
        })
        
        // Устанавливаем ошибку в store
        setError(innerError instanceof Error ? innerError.message : 'Неизвестная ошибка')
        
        // Показываем уведомление об ошибке
        showError(`Не удалось получить ответ: ${innerError instanceof Error ? innerError.message : 'Неизвестная ошибка'}`)
        
      } finally {
        setLoading(false)
      }
      
    } catch (outerError) {
      // Критическая ошибка - логируем безопасно
      try {
        safeLogger.warn('Критическая ошибка в handleSendMessage:', outerError)
      } catch {
        // Игнорируем ошибки логирования
      }
      setLoading(false)
      showError('Произошла критическая ошибка при отправке сообщения')
      
      // НЕ пробрасываем ошибку дальше
    }
  }

  const handleChatSelect = (chatId: string) => {
    // Логика выбора чата уже обрабатывается в ChatList
  }

  return (
    <div className={cn("flex h-screen bg-background", className)} role="main">
      {/* Боковая панель со списком чатов */}
      <aside 
        className="w-80 border-r hidden lg:block" 
        role="complementary"
        aria-label="Список чатов"
      >
        <ChatList onChatSelect={handleChatSelect} />
      </aside>

      {/* Основная область чата */}
      <div className="flex-1 flex flex-col min-w-0">
        {currentChat ? (
          <>
            {/* Заголовок чата */}
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="px-4 py-3 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h1 
                      className="font-semibold text-lg truncate" 
                      id="chat-title"
                      aria-label={`Чат: ${currentChat.title}`}
                    >
                      {currentChat.title}
                    </h1>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground flex-wrap">
                      <span className="hidden sm:inline" aria-label={`Количество сообщений: ${currentChat.messages.length}`}>
                        {currentChat.messages.length} сообщений
                      </span>
                      <span className="hidden sm:inline">•</span>
                      <div className={cn(
                        "flex items-center space-x-1",
                        currentChat.mode === 'fast' && "text-green-600",
                        currentChat.mode === 'deep' && "text-blue-600"
                      )}>
                        <span 
                          className={cn(
                            "w-2 h-2 rounded-full",
                            currentChat.mode === 'fast' && "bg-green-500",
                            currentChat.mode === 'deep' && "bg-blue-500"
                          )}
                          aria-hidden="true"
                        />
                        <span className="hidden sm:inline">
                          {currentChat.mode === 'fast' ? 'Быстрый режим' : 'Глубокий анализ'}
                        </span>
                        <span className="sm:hidden">
                          {currentChat.mode === 'fast' ? 'Быстрый' : 'Глубокий'}
                        </span>
                      </div>
                      <span className="hidden sm:inline">•</span>
                      <APIStatus isLoading={isLoading} hasError={!!error} />
                    </div>
                  </div>
                  
                  {/* Дополнительные действия */}
                  <div className="flex items-center space-x-2">
                    {/* Кнопка меню для мобильных устройств */}
                    <button 
                      className="lg:hidden p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      aria-label="Открыть меню навигации"
                      aria-expanded="false"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                    <button 
                      className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      aria-label="Дополнительные опции чата"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </header>

            {/* Область сообщений */}
            <main 
              className="flex-1 overflow-y-auto custom-scrollbar"
              role="log"
              aria-live="polite"
              aria-label="История сообщений чата"
              aria-describedby="chat-title"
            >
              <div className="px-4 py-6 space-y-6 sm:px-6 max-w-4xl mx-auto">
                {currentChat.messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <div className="mb-4">
                      <svg className="w-12 h-12 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium mb-2">Начните новый разговор</h3>
                    <p className="text-sm">Задайте вопрос или поделитесь своими мыслями</p>
                  </div>
                ) : (
                  currentChat.messages
                    .filter(message => !message.isLoading) // Фильтруем индикаторы загрузки
                    .map((message, index) => (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        showThinking={currentChat.mode === 'deep'}
                        aria-label={`${message.role === 'user' ? 'Ваше' : 'ИИ'} сообщение ${index + 1} из ${currentChat.messages.length}`}
                      />
                    ))
                )}
                
                {/* Индикатор печати */}
                {isLoading && (
                  <div className="chat-message assistant" role="status" aria-live="polite" aria-label="ИИ-ассистент печатает ответ">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                        AI
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1" aria-hidden="true">
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-muted-foreground">Komair думает...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </main>

            {/* Поле ввода */}
            <MessageInput 
              onSendMessage={handleSendMessage}
              disabled={isLoading}
            />
          </>
        ) : (
          // Экран приветствия
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center max-w-md w-full">
              <div className="mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold mb-2">Добро пожаловать в Komair</h2>
                <p className="text-muted-foreground mb-6 text-sm sm:text-base">
                  Умный ИИ-ассистент с возможностями быстрых диалогов и глубокого анализа
                </p>
              </div>
              
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-center sm:justify-start space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></span>
                  <span>Быстрый режим для мгновенных ответов</span>
                </div>
                <div className="flex items-center justify-center sm:justify-start space-x-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                  <span>Глубокий анализ для сложных задач</span>
                </div>
                <div className="flex items-center justify-center sm:justify-start space-x-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></span>
                  <span>История и поиск по всем чатам</span>
                </div>
              </div>
              
              <button
                onClick={handleNewChat}
                className="mt-6 w-full sm:w-auto px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Создать новый чат для начала разговора"
              >
                Начать новый чат
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Отображение горячих клавиш */}
      <HotKeyDisplay />
    </div>
  )
}

// Функция для генерации тестового ответа
function generateMockResponse(userMessage: string, mode: 'fast' | 'deep') {
  if (mode === 'fast') {
    return {
      content: `Понял ваш вопрос: "${userMessage}". Это быстрый ответ от Komair. В будущем здесь будет интеграция с реальной ИИ-моделью для обработки ваших запросов.`,
    }
  } else {
    return {
      content: `После глубокого анализа вашего вопроса "${userMessage}", могу предложить следующее подробное объяснение. Это режим глубокого мышления, где ИИ будет тщательно анализировать запрос с разных точек зрения и предоставлять максимально полный ответ.`,
      thinking: `Анализирую запрос пользователя: "${userMessage}"

Шаг 1: Определение контекста и темы
- Пользователь спрашивает о...
- Основная тема касается...

Шаг 2: Рассмотрение различных аспектов
- С технической точки зрения...
- С практической точки зрения...

Шаг 3: Формирование комплексного ответа
- Учитывая все аспекты...
- Оптимальное решение...`
    }
  }
}