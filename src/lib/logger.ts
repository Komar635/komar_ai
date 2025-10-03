/**
 * Безопасная утилита для логирования в SSR/клиентской среде
 */

export const safeLogger = {
  /**
   * Безопасное логирование ошибок
   */
  error: (message: string, ...args: unknown[]) => {
    try {
      if (typeof window !== 'undefined') {
        // На клиенте используем console.warn чтобы избежать конфликтов
        console.warn(`[ERROR] ${message}`, ...args)
      } else {
        // На сервере можем использовать console.error
        console.error(`[ERROR] ${message}`, ...args)
      }
    } catch {
      // Игнорируем ошибки логирования
    }
  },

  /**
   * Безопасное логирование предупреждений
   */
  warn: (message: string, ...args: unknown[]) => {
    try {
      if (typeof window !== 'undefined' || typeof console !== 'undefined') {
        console.warn(`[WARN] ${message}`, ...args)
      }
    } catch {
      // Игнорируем ошибки логирования
    }
  },

  /**
   * Безопасное логирование информации
   */
  info: (message: string, ...args: unknown[]) => {
    try {
      if (typeof window !== 'undefined' || typeof console !== 'undefined') {
        console.log(`[INFO] ${message}`, ...args)
      }
    } catch {
      // Игнорируем ошибки логирования
    }
  },

  /**
   * Безопасное логирование отладочной информации
   */
  debug: (message: string, ...args: unknown[]) => {
    try {
      if (process.env.NODE_ENV === 'development') {
        if (typeof window !== 'undefined' || typeof console !== 'undefined') {
          console.log(`[DEBUG] ${message}`, ...args)
        }
      }
    } catch {
      // Игнорируем ошибки логирования
    }
  }
}