import { ChatRequest, ChatResponse } from '@/app/api/chat/route'
import { safeLogger } from './logger'

export class AIService {
  private static readonly API_ENDPOINT = '/api/chat'
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY = 1000

  /**
   * Отправляет сообщение в ИИ и получает ответ
   */
  static async sendMessage(
    message: string,
    mode: 'fast' | 'deep',
    chatHistory: Array<{ role: 'user' | 'assistant', content: string }> = []
  ): Promise<ChatResponse> {
    const request: ChatRequest = {
      message: message.trim(),
      mode,
      chatHistory: chatHistory.slice(-10) // Ограничиваем историю последними 10 сообщениями
    }

    return this.makeRequestWithRetry(request)
  }

  /**
   * Выполняет запрос с повторными попытками
   */
  private static async makeRequestWithRetry(
    request: ChatRequest,
    attempt: number = 1
  ): Promise<ChatResponse> {
    try {
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        )
      }

      const result: ChatResponse = await response.json()
      return result

    } catch (error) {
      safeLogger.error(`Попытка ${attempt} не удалась:`, error)

      // Если это последняя попытка или ошибка не сетевая, пробрасываем её
      if (attempt >= this.MAX_RETRIES || !this.isRetryableError(error)) {
        throw error
      }

      // Ждём перед повторной попыткой с экспоненциальной задержкой
      const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))

      return this.makeRequestWithRetry(request, attempt + 1)
    }
  }

  /**
   * Определяет, стоит ли повторять запрос при данной ошибке
   */
  private static isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      // Повторяем при сетевых ошибках или временных проблемах сервера
      return (
        error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.message.includes('timeout') ||
        error.message.includes('500') ||
        error.message.includes('502') ||
        error.message.includes('503') ||
        error.message.includes('504')
      )
    }
    return false
  }

  /**
   * Проверяет доступность ИИ сервиса
   */
  static async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Получает информацию о доступных моделях
   */
  static async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch('/api/models', {
        method: 'GET',
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.models || []
      }
    } catch (error) {
      safeLogger.error('Ошибка получения списка моделей:', error)
    }
    
    return ['Mock API'] // Fallback
  }

  /**
   * Форматирует историю чата для API
   */
  static formatChatHistory(messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
  }>): Array<{ role: 'user' | 'assistant', content: string }> {
    return messages
      .filter(msg => msg.role !== 'system') // Исключаем системные сообщения
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))
  }

  /**
   * Оценивает сложность запроса для выбора оптимального режима
   */
  static suggestMode(message: string): 'fast' | 'deep' {
    const messageLength = message.length
    const hasComplexKeywords = [
      'анализ', 'сравни', 'объясни подробно', 'почему', 'как работает',
      'различия', 'преимущества', 'недостатки', 'детально'
    ].some(keyword => 
      message.toLowerCase().includes(keyword)
    )

    // Рекомендуем глубокий режим для длинных или сложных запросов
    if (messageLength > 200 || hasComplexKeywords) {
      return 'deep'
    }

    return 'fast'
  }

  /**
   * Подготавливает сообщение для отправки (очистка, валидация)
   */
  static prepareMessage(rawMessage: string): string {
    return rawMessage
      .trim()
      .replace(/\s+/g, ' ') // Заменяем множественные пробелы одним
      .substring(0, 2000) // Ограничиваем длину
  }

  /**
   * Экспортирует чат в различных форматах
   */
  static exportChat(
    chatTitle: string,
    messages: Array<{ role: string, content: string, timestamp: Date }>,
    format: 'json' | 'txt' | 'md' = 'json'
  ): string {
    switch (format) {
      case 'txt':
        return `Чат: ${chatTitle}\n\n${messages
          .map(msg => `[${msg.timestamp.toLocaleString()}] ${msg.role}: ${msg.content}`)
          .join('\n\n')}`

      case 'md':
        return `# ${chatTitle}\n\n${messages
          .map(msg => `**${msg.role}** *(${msg.timestamp.toLocaleString()})*\n\n${msg.content}\n`)
          .join('\n---\n\n')}`

      case 'json':
      default:
        return JSON.stringify({
          title: chatTitle,
          exportDate: new Date().toISOString(),
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp.toISOString()
          }))
        }, null, 2)
    }
  }
}

// Типы для расширенной функциональности
export interface AIServiceConfig {
  provider: 'huggingface' | 'ollama' | 'openai' | 'mock'
  maxRetries: number
  retryDelay: number
  timeout: number
}

export interface ModelInfo {
  name: string
  provider: string
  parameters: string
  description: string
  supportsFast: boolean
  supportsDeep: boolean
}

// Константы для конфигурации
export const AI_CONFIG = {
  DEFAULT_PROVIDER: 'huggingface',
  MAX_MESSAGE_LENGTH: 2000,
  MAX_HISTORY_LENGTH: 10,
  FAST_MODE_TIMEOUT: 5000,
  DEEP_MODE_TIMEOUT: 30000,
} as const