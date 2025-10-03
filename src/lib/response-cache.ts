import { safeLogger } from './logger'

export interface CacheEntry {
  key: string
  data: any
  timestamp: number
  expiresAt: number
  accessCount: number
  lastAccessed: number
}

export interface CacheStats {
  totalEntries: number
  hitCount: number
  missCount: number
  hitRate: number
  totalSize: number
}

class ResponseCache {
  private cache: Map<string, CacheEntry> = new Map()
  private hitCount = 0
  private missCount = 0
  private maxEntries = 1000
  private defaultTTL = 30 * 60 * 1000 // 30 минут по умолчанию

  /**
   * Генерирует ключ кэша для запроса
   */
  private generateCacheKey(message: string, mode: 'fast' | 'deep', provider?: string): string {
    // Нормализуем сообщение для лучшего попадания в кэш
    const normalizedMessage = message.toLowerCase().trim()
    const keyData = {
      message: normalizedMessage,
      mode,
      provider: provider || 'any'
    }
    
    // Создаём хэш из данных, используя безопасное кодирование для Unicode
    const jsonString = JSON.stringify(keyData)
    const buffer = Buffer.from(jsonString, 'utf8')
    return buffer.toString('base64').replace(/[+/=]/g, '')
  }

  /**
   * Проверяет, стоит ли кэшировать запрос
   */
  private shouldCache(message: string, mode: 'fast' | 'deep'): boolean {
    // Не кэшируем очень короткие или очень длинные сообщения
    if (message.length < 3 || message.length > 1000) {
      return false
    }

    // Не кэшируем сообщения с временными метками или персональными данными
    const timePatterns = [
      /сейчас|сегодня|вчера|завтра|время|дата/i,
      /\d{2}:\d{2}|\d{2}\.\d{2}\.\d{4}|\d{4}-\d{2}-\d{2}/,
      /меня зовут|мое имя|я работаю|мой/i
    ]

    return !timePatterns.some(pattern => pattern.test(message))
  }

  /**
   * Получает данные из кэша
   */
  get(message: string, mode: 'fast' | 'deep', provider?: string): any | null {
    if (!this.shouldCache(message, mode)) {
      return null
    }

    const key = this.generateCacheKey(message, mode, provider)
    const entry = this.cache.get(key)

    if (!entry) {
      this.missCount++
      return null
    }

    // Проверяем, не истёк ли кэш
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      this.missCount++
      return null
    }

    // Обновляем статистику доступа
    entry.accessCount++
    entry.lastAccessed = Date.now()
    this.hitCount++

    safeLogger.info(`🎯 Кэш попадание для запроса: ${message.substring(0, 50)}...`)
    
    return entry.data
  }

  /**
   * Сохраняет данные в кэш
   */
  set(message: string, mode: 'fast' | 'deep', data: any, provider?: string, ttl?: number): void {
    if (!this.shouldCache(message, mode)) {
      return
    }

    // Очищаем кэш если достигли лимита
    if (this.cache.size >= this.maxEntries) {
      this.cleanup()
    }

    const key = this.generateCacheKey(message, mode, provider)
    const now = Date.now()
    const actualTTL = ttl || this.defaultTTL

    const entry: CacheEntry = {
      key,
      data,
      timestamp: now,
      expiresAt: now + actualTTL,
      accessCount: 1,
      lastAccessed: now
    }

    this.cache.set(key, entry)

    safeLogger.info(`💾 Сохранено в кэш: ${message.substring(0, 50)}... (TTL: ${actualTTL / 1000}s)`)
  }

  /**
   * Очистка устаревших записей
   */
  private cleanup(): void {
    const now = Date.now()
    let cleanedCount = 0

    // Удаляем истёкшие записи
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
        cleanedCount++
      }
    }

    // Если всё ещё слишком много записей, удаляем самые старые и редко используемые
    if (this.cache.size >= this.maxEntries * 0.9) {
      const entries = Array.from(this.cache.entries())
      
      // Сортируем по последнему доступу и количеству обращений
      entries.sort(([, a], [, b]) => {
        const scoreA = a.lastAccessed + (a.accessCount * 60000) // Бонус за частоту использования
        const scoreB = b.lastAccessed + (b.accessCount * 60000)
        return scoreA - scoreB
      })

      // Удаляем 25% самых неиспользуемых записей
      const toRemove = Math.floor(entries.length * 0.25)
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0])
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      safeLogger.info(`🧹 Очищено ${cleanedCount} записей из кэша`)
    }
  }

  /**
   * Получить статистику кэша
   */
  getStats(): CacheStats {
    const totalRequests = this.hitCount + this.missCount
    
    return {
      totalEntries: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0,
      totalSize: this.calculateCacheSize()
    }
  }

  /**
   * Приблизительный расчёт размера кэша в байтах
   */
  private calculateCacheSize(): number {
    let totalSize = 0
    
    for (const entry of this.cache.values()) {
      // Приблизительный размер JSON строки
      totalSize += JSON.stringify(entry).length * 2 // UTF-16, 2 байта на символ
    }
    
    return totalSize
  }

  /**
   * Очистить весь кэш
   */
  clear(): void {
    this.cache.clear()
    this.hitCount = 0
    this.missCount = 0
    safeLogger.info('🗑️ Кэш полностью очищен')
  }

  /**
   * Предварительный прогрев кэша часто задаваемыми вопросами
   */
  warmup(): void {
    const commonQueries = [
      { message: 'Привет', mode: 'fast' as const, response: 'Привет! Я Komair, ваш ИИ-ассистент. Как дела?' },
      { message: 'Как дела?', mode: 'fast' as const, response: 'У меня всё отлично! Готов помочь вам с любыми вопросами.' },
      { message: 'Что ты умеешь?', mode: 'fast' as const, response: 'Я могу отвечать на вопросы, помогать с анализом, объяснять сложные темы и многое другое!' },
      { message: 'Спасибо', mode: 'fast' as const, response: 'Пожалуйста! Всегда рад помочь.' }
    ]

    commonQueries.forEach(({ message, mode, response }) => {
      this.set(message, mode, {
        content: response,
        mode,
        processingTime: 100,
        model: 'Cache: Prewarmed'
      }, 'cache', 24 * 60 * 60 * 1000) // 24 часа для предзагруженных ответов
    })

    safeLogger.info(`🔥 Кэш прогрет ${commonQueries.length} часто используемыми запросами`)
  }
}

// Создаём глобальный экземпляр
export const responseCache = new ResponseCache()

// Прогреваем кэш при инициализации
responseCache.warmup()