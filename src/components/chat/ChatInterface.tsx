'use client'

import React, { useEffect, useRef } from 'react'
import { useChatStore, useCurrentChat } from '@/lib/store'
import { AIService } from '@/lib/ai-service'
import { ChatMessage } from './ChatMessage'
import { MessageInput } from './MessageInput'
import { ChatList } from './ChatList'
import { cn } from '@/lib/utils'

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
    loadChatsFromStorage
  } = useChatStore()
  
  const currentChat = useCurrentChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Загружаем чаты при монтировании компонента
  useEffect(() => {
    loadChatsFromStorage()
  }, [loadChatsFromStorage])

  // Автоскролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentChat?.messages])

  const handleSendMessage = async (content: string, mode: 'fast' | 'deep') => {
    let chatId = currentChatId
    
    // Создаем новый чат если нет активного
    if (!chatId) {
      chatId = createChat(`Чат ${new Date().toLocaleTimeString()}`, mode)
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
      
    } catch (error) {
      console.error('Ошибка при получении ответа:', error)
      
      // Добавляем сообщение об ошибке
      const errorMessage = error instanceof Error 
        ? `Ошибка: ${error.message}`
        : 'Извините, произошла ошибка при обработке вашего запроса.'
        
      addMessage(chatId, {
        content: errorMessage,
        role: 'assistant',
        mode
      })
      
      // Устанавливаем ошибку в store
      setError(error instanceof Error ? error.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  const handleChatSelect = (chatId: string) => {
    // Логика выбора чата уже обрабатывается в ChatList
  }

  return (
    <div className={cn("flex h-screen bg-background", className)}>
      {/* Боковая панель со списком чатов */}
      <div className="w-80 border-r">
        <ChatList onChatSelect={handleChatSelect} />
      </div>

      {/* Основная область чата */}
      <div className="flex-1 flex flex-col">
        {currentChat ? (
          <>
            {/* Заголовок чата */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="font-semibold text-lg">{currentChat.title}</h1>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <span>{currentChat.messages.length} сообщений</span>
                      <span>•</span>
                      <span className={cn(
                        "flex items-center space-x-1",
                        currentChat.mode === 'fast' && "text-green-600",
                        currentChat.mode === 'deep' && "text-blue-600"
                      )}>
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          currentChat.mode === 'fast' && "bg-green-500",
                          currentChat.mode === 'deep' && "bg-blue-500"
                        )} />
                        <span>
                          {currentChat.mode === 'fast' ? 'Быстрый режим' : 'Глубокий анализ'}
                        </span>
                      </span>
                    </div>
                  </div>
                  
                  {/* Дополнительные действия */}
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Область сообщений */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="container mx-auto px-4 py-6 space-y-6">
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
                    .map((message) => (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        showThinking={currentChat.mode === 'deep'}
                      />
                    ))
                )}
                
                {/* Индикатор печати */}
                {isLoading && (
                  <div className="chat-message assistant">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
                        AI
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
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
            </div>

            {/* Поле ввода */}
            <MessageInput 
              onSendMessage={handleSendMessage}
              disabled={isLoading}
            />
          </>
        ) : (
          // Экран приветствия
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="mb-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">Добро пожаловать в Komair</h2>
                <p className="text-muted-foreground mb-6">
                  Умный ИИ-ассистент с возможностями быстрых диалогов и глубокого анализа
                </p>
              </div>
              
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>Быстрый режим для мгновенных ответов</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>Глубокий анализ для сложных задач</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  <span>История и поиск по всем чатам</span>
                </div>
              </div>
              
              <button
                onClick={() => createChat()}
                className="mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Начать новый чат
              </button>
            </div>
          </div>
        )}
      </div>
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