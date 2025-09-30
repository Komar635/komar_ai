export interface Message {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  timestamp: Date
  mode?: 'fast' | 'deep'
  thinking?: string // Для режима глубокого анализа
  isLoading?: boolean
}

export interface Chat {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
  tags: string[]
  mode: 'fast' | 'deep'
}

export interface ChatStore {
  chats: Chat[]
  currentChatId: string | null
  searchQuery: string
  theme: 'light' | 'dark' | 'system'
  isLoading: boolean
  error: string | null
  
  // Actions
  addMessage: (chatId: string, message: Omit<Message, 'id' | 'timestamp'>) => void
  createChat: (title?: string, mode?: 'fast' | 'deep') => string
  deleteChat: (chatId: string) => void
  setCurrentChat: (chatId: string | null) => void
  updateChatTitle: (chatId: string, title: string) => void
  addChatTag: (chatId: string, tag: string) => void
  removeChatTag: (chatId: string, tag: string) => void
  setSearchQuery: (query: string) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearHistory: () => void
  exportChat: (chatId: string) => string
  getFilteredChats: () => Chat[]
  loadChatsFromStorage: () => void
  saveChatsToStorage: () => void
}

export interface AIResponse {
  content: string
  thinking?: string
  mode: 'fast' | 'deep'
  processingTime?: number
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system'
  language: 'ru' | 'en'
  defaultMode: 'fast' | 'deep'
  ageVerified: boolean
  showThinking: boolean
}