import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Chat, ChatStore, Message } from './types'
import { generateId } from './utils'

const STORAGE_KEY = 'komair-chats'

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      chats: [],
      currentChatId: null,
      searchQuery: '',
      theme: 'system',
      isLoading: false,
      error: null,

      addMessage: (chatId: string, messageData: Omit<Message, 'id' | 'timestamp'>) => {
        const message: Message = {
          ...messageData,
          id: generateId(),
          timestamp: new Date()
        }

        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: [...chat.messages, message],
                  updatedAt: new Date()
                }
              : chat
          )
        }))
        
        get().saveChatsToStorage()
      },

      createChat: (title?: string, mode: 'fast' | 'deep' = 'fast') => {
        const chatId = generateId()
        const now = new Date()
        
        const newChat: Chat = {
          id: chatId,
          title: title || `Новый чат ${get().chats.length + 1}`,
          messages: [],
          createdAt: now,
          updatedAt: now,
          tags: [],
          mode
        }

        set((state) => ({
          chats: [newChat, ...state.chats],
          currentChatId: chatId
        }))
        
        get().saveChatsToStorage()
        return chatId
      },

      deleteChat: (chatId: string) => {
        set((state) => ({
          chats: state.chats.filter((chat) => chat.id !== chatId),
          currentChatId: state.currentChatId === chatId ? null : state.currentChatId
        }))
        
        get().saveChatsToStorage()
      },

      setCurrentChat: (chatId: string | null) => {
        set({ currentChatId: chatId })
      },

      updateChatTitle: (chatId: string, title: string) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? { ...chat, title, updatedAt: new Date() }
              : chat
          )
        }))
        
        get().saveChatsToStorage()
      },

      addChatTag: (chatId: string, tag: string) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId && !chat.tags.includes(tag)
              ? { ...chat, tags: [...chat.tags, tag], updatedAt: new Date() }
              : chat
          )
        }))
        
        get().saveChatsToStorage()
      },

      removeChatTag: (chatId: string, tag: string) => {
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId
              ? { ...chat, tags: chat.tags.filter(t => t !== tag), updatedAt: new Date() }
              : chat
          )
        }))
        
        get().saveChatsToStorage()
      },

      setSearchQuery: (query: string) => {
        set({ searchQuery: query })
      },

      setTheme: (theme: 'light' | 'dark' | 'system') => {
        set({ theme })
        
        // Применяем тему к документу
        if (typeof window !== 'undefined') {
          const root = window.document.documentElement
          root.classList.remove('light', 'dark')
          
          if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
            root.classList.add(systemTheme)
          } else {
            root.classList.add(theme)
          }
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      setError: (error: string | null) => {
        set({ error })
      },

      clearHistory: () => {
        set({
          chats: [],
          currentChatId: null,
          searchQuery: ''
        })
        
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY)
        }
      },

      exportChat: (chatId: string) => {
        const chat = get().chats.find(c => c.id === chatId)
        if (!chat) return ''
        
        const exportData = {
          title: chat.title,
          createdAt: chat.createdAt,
          messages: chat.messages.map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
            mode: m.mode,
            thinking: m.thinking
          }))
        }
        
        return JSON.stringify(exportData, null, 2)
      },

      getFilteredChats: () => {
        const { chats, searchQuery } = get()
        
        if (!searchQuery.trim()) return chats
        
        const query = searchQuery.toLowerCase()
        return chats.filter(chat => 
          chat.title.toLowerCase().includes(query) ||
          chat.tags.some(tag => tag.toLowerCase().includes(query)) ||
          chat.messages.some(message => 
            message.content.toLowerCase().includes(query)
          )
        )
      },

      loadChatsFromStorage: () => {
        if (typeof window === 'undefined') return
        
        try {
          const stored = localStorage.getItem(STORAGE_KEY)
          if (stored) {
            const parsed = JSON.parse(stored)
            
            // Конвертируем строки дат обратно в Date объекты
            const chats = parsed.chats?.map((chat: any) => ({
              ...chat,
              createdAt: new Date(chat.createdAt),
              updatedAt: new Date(chat.updatedAt),
              messages: chat.messages?.map((message: any) => ({
                ...message,
                timestamp: new Date(message.timestamp)
              })) || []
            })) || []
            
            set({ 
              chats,
              currentChatId: parsed.currentChatId || null,
              theme: parsed.theme || 'system'
            })
          }
        } catch (error) {
          console.error('Ошибка загрузки чатов из localStorage:', error)
          set({ error: 'Ошибка загрузки истории чатов' })
        }
      },

      saveChatsToStorage: () => {
        if (typeof window === 'undefined') return
        
        try {
          const { chats, currentChatId, theme } = get()
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            chats,
            currentChatId,
            theme
          }))
        } catch (error) {
          console.error('Ошибка сохранения чатов в localStorage:', error)
          set({ error: 'Ошибка сохранения истории чатов' })
        }
      }
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        chats: state.chats,
        currentChatId: state.currentChatId,
        theme: state.theme
      })
    }
  )
)

// Хук для получения текущего чата
export const useCurrentChat = () => {
  const { chats, currentChatId } = useChatStore()
  return chats.find(chat => chat.id === currentChatId) || null
}

// Хук для получения статистики
export const useChatStats = () => {
  const chats = useChatStore(state => state.chats)
  
  return {
    totalChats: chats.length,
    totalMessages: chats.reduce((acc, chat) => acc + chat.messages.length, 0),
    recentChats: chats.slice(0, 5),
    mostUsedTags: chats
      .flatMap(chat => chat.tags)
      .reduce((acc: Record<string, number>, tag) => {
        acc[tag] = (acc[tag] || 0) + 1
        return acc
      }, {})
  }
}