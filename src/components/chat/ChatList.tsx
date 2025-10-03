'use client'

import React, { useState, useEffect } from 'react'
import { useChatStore, useChatStats } from '@/lib/store'
import { ConnectionStatus } from '@/components/ui/StatusIndicator'
import { useFeedback } from '@/hooks/useFeedback'
import { cn, formatDate } from '@/lib/utils'
import { Chat } from '@/lib/types'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

interface ChatListProps {
  onChatSelect?: (chatId: string) => void
  className?: string
}

export function ChatList({ onChatSelect, className }: ChatListProps) {
  const {
    chats,
    currentChatId,
    searchQuery,
    setCurrentChat,
    setSearchQuery,
    deleteChat,
    createChat,
    getFilteredChats,
    loadChatsFromStorage
  } = useChatStore()
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const filteredChats = getFilteredChats()
  const stats = useChatStats()
  const { showSuccess, showError, handleAction } = useFeedback()

  // Обеспечиваем корректную гидратацию
  useEffect(() => {
    setIsHydrated(true)
    loadChatsFromStorage()
  }, [])

  const handleChatClick = (chatId: string) => {
    setCurrentChat(chatId)
    onChatSelect?.(chatId)
  }

  const handleNewChat = () => {
    handleAction(
      async () => {
        const chatId = createChat()
        onChatSelect?.(chatId)
        return chatId
      },
      {
        successMessage: 'Новый чат создан',
        errorMessage: 'Не удалось создать новый чат'
      }
    )
  }

  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (showDeleteConfirm === chatId) {
      handleAction(
        async () => {
          const chat = chats.find(c => c.id === chatId)
          deleteChat(chatId)
          setShowDeleteConfirm(null)
          return chat?.title || 'Чат'
        },
        {
          successMessage: 'Чат успешно удалён',
          errorMessage: 'Не удалось удалить чат'
        }
      )
    } else {
      setShowDeleteConfirm(chatId)
    }
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteConfirm(null)
  }

  return (
    <div className={cn("flex flex-col h-full bg-muted/50", className)} role="navigation" aria-label="Навигация по чатам">
      {/* Заголовок и статистика */}
      <header className="p-3 sm:p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Komair</h2>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <ThemeToggle />
            <button
              onClick={handleNewChat}
              className="p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              title="Новый чат"
              aria-label="Создать новый чат"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground space-y-1 hidden sm:block" aria-label="Статистика">
          {isHydrated ? (
            <>
              <div>Чатов: {stats.totalChats}</div>
              <div>Сообщений: {stats.totalMessages}</div>
            </>
          ) : (
            <div>Загрузка...</div>
          )}
          <ConnectionStatus className="mt-1" />
        </div>
      </header>

      {/* Поиск */}
      <div className="p-3 sm:p-4 border-b">
        <div className="relative">
          <label htmlFor="chat-search" className="sr-only">Поиск по чатам</label>
          <svg 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="chat-search"
            type="text"
            placeholder="Поиск чатов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-describedby="search-description"
          />
          <div id="search-description" className="sr-only">
            Введите текст для поиска по названиям чатов и сообщениям
          </div>
        </div>
      </div>

      {/* Список чатов */}
      <div className="flex-1 overflow-y-auto custom-scrollbar" role="list" aria-label="Список чатов">
        {!isHydrated ? (
          <div className="p-3 sm:p-4 text-center text-muted-foreground" role="status">
            Загрузка чатов...
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="p-3 sm:p-4 text-center text-muted-foreground" role="status">
            {searchQuery ? 'Чаты не найдены' : 'Нет чатов'}
          </div>
        ) : (
          <div className="space-y-1 p-1 sm:p-2">
            {filteredChats.map((chat) => (
              <ChatItem
                key={chat.id}
                chat={chat}
                isActive={chat.id === currentChatId}
                showDeleteConfirm={showDeleteConfirm === chat.id}
                onClick={() => handleChatClick(chat.id)}
                onDelete={(e) => handleDeleteChat(chat.id, e)}
                onCancelDelete={handleCancelDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface ChatItemProps {
  chat: Chat
  isActive: boolean
  showDeleteConfirm: boolean
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
  onCancelDelete: (e: React.MouseEvent) => void
}

function ChatItem({ 
  chat, 
  isActive, 
  showDeleteConfirm, 
  onClick, 
  onDelete, 
  onCancelDelete 
}: ChatItemProps) {
  const lastMessage = chat.messages[chat.messages.length - 1]
  
  return (
    <div
      className={cn(
        "group relative p-2 sm:p-3 rounded-md cursor-pointer transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-within:bg-accent focus-within:text-accent-foreground",
        isActive && "bg-accent text-accent-foreground"
      )}
      role="listitem"
    >
      <button
        onClick={onClick}
        className={cn(
          "w-full text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md",
          "focus:ring-offset-background"
        )}
        aria-label={`Открыть чат: ${chat.title}`}
        aria-current={isActive ? "page" : undefined}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-2">
            {/* Заголовок чата */}
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-medium text-sm truncate flex-1">{chat.title}</h3>
              <span 
                className={cn(
                  "flex-shrink-0 w-2 h-2 rounded-full",
                  chat.mode === 'fast' && "bg-green-500",
                  chat.mode === 'deep' && "bg-blue-500"
                )}
                aria-label={`Режим: ${chat.mode === 'fast' ? 'быстрый' : 'глубокий'}`}
              />
            </div>
            
            {/* Последнее сообщение */}
            {lastMessage && (
              <p className="text-xs text-muted-foreground truncate">
                <span className="hidden sm:inline">{lastMessage.role === 'user' ? 'Вы: ' : 'AI: '}</span>
                {lastMessage.content}
              </p>
            )}
            
            {/* Теги */}
            {chat.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {chat.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded"
                  >
                    {tag}
                  </span>
                ))}
                {chat.tags.length > 2 && (
                  <span className="text-xs text-muted-foreground">
                    +{chat.tags.length - 2}
                  </span>
                )}
              </div>
            )}
            
            {/* Время */}
            <div className="text-xs text-muted-foreground mt-1">
              <time dateTime={new Date(chat.updatedAt).toISOString()}>
                {formatDate(new Date(chat.updatedAt))}
              </time>
            </div>
          </div>
        </div>
      </button>

      {/* Кнопка удаления */}
      <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
        {showDeleteConfirm ? (
          <div className="flex space-x-1 flex-shrink-0">
            <button
              onClick={onDelete}
              className="p-1 text-xs bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Подтвердить удаление чата"
            >
              ✓
            </button>
            <button
              onClick={onCancelDelete}
              className="p-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label="Отменить удаление"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 sm:opacity-0 p-1 text-muted-foreground hover:text-destructive transition-opacity flex-shrink-0 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
            aria-label={`Удалить чат: ${chat.title}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}