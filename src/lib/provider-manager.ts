import { safeLogger } from './logger'

export interface ProviderConfig {
  name: string
  priority: number
  enabled: boolean
  maxRetries: number
  timeout: number
  healthCheck?: () => Promise<boolean>
}

export interface ProviderStatus {
  name: string
  isHealthy: boolean
  lastError?: string
  lastCheck: Date
  consecutiveFailures: number
}

class ProviderManager {
  private providers: Map<string, ProviderConfig> = new Map()
  private status: Map<string, ProviderStatus> = new Map()
  private fallbackOrder: string[] = []

  constructor() {
    this.initializeProviders()
  }

  private initializeProviders() {
    // Порядок приоритета провайдеров (от лучшего к худшему)
    const configs: ProviderConfig[] = [
      {
        name: 'groq',
        priority: 1,
        enabled: !!process.env.GROQ_API_KEY,
        maxRetries: 2,
        timeout: 30000
      },
      {
        name: 'huggingface',
        priority: 2,
        enabled: !!process.env.HUGGINGFACE_TOKEN,
        maxRetries: 3,
        timeout: 60000
      },
      {
        name: 'together',
        priority: 3,
        enabled: !!process.env.TOGETHER_API_KEY,
        maxRetries: 2,
        timeout: 45000
      },
      {
        name: 'cohere',
        priority: 4,
        enabled: !!process.env.COHERE_API_KEY,
        maxRetries: 2,
        timeout: 30000
      },
      {
        name: 'ollama',
        priority: 5,
        enabled: true, // Локальный провайдер всегда доступен как fallback
        maxRetries: 1,
        timeout: 120000
      },
      {
        name: 'mock',
        priority: 999,
        enabled: true, // Последний резерв
        maxRetries: 1,
        timeout: 5000
      }
    ]

    configs.forEach(config => {
      this.providers.set(config.name, config)
      this.status.set(config.name, {
        name: config.name,
        isHealthy: true,
        lastCheck: new Date(),
        consecutiveFailures: 0
      })
    })

    // Создаём порядок fallback на основе приоритета и доступности
    this.fallbackOrder = configs
      .filter(config => config.enabled)
      .sort((a, b) => a.priority - b.priority)
      .map(config => config.name)

    safeLogger.info(`🔄 Инициализированы провайдеры: ${this.fallbackOrder.join(' → ')}`)
  }

  /**
   * Получить лучший доступный провайдер
   */
  getBestAvailableProvider(): string {
    for (const providerName of this.fallbackOrder) {
      const status = this.status.get(providerName)
      const config = this.providers.get(providerName)
      
      if (status?.isHealthy && config?.enabled) {
        return providerName
      }
    }
    
    // Если ничего не доступно, возвращаем mock
    return 'mock'
  }

  /**
   * Получить следующий провайдер в порядке fallback
   */
  getNextProvider(currentProvider: string): string | null {
    const currentIndex = this.fallbackOrder.indexOf(currentProvider)
    if (currentIndex === -1 || currentIndex >= this.fallbackOrder.length - 1) {
      return null
    }

    for (let i = currentIndex + 1; i < this.fallbackOrder.length; i++) {
      const providerName = this.fallbackOrder[i]
      const status = this.status.get(providerName)
      const config = this.providers.get(providerName)
      
      if (status?.isHealthy && config?.enabled) {
        return providerName
      }
    }
    
    return null
  }

  /**
   * Отметить провайдер как недоступный
   */
  markProviderAsUnhealthy(providerName: string, error: string) {
    const status = this.status.get(providerName)
    if (status) {
      status.isHealthy = false
      status.lastError = error
      status.lastCheck = new Date()
      status.consecutiveFailures += 1
      
      safeLogger.error(`❌ Провайдер ${providerName} недоступен: ${error}`)
      
      // Автоматическое восстановление через некоторое время
      if (status.consecutiveFailures >= 3) {
        setTimeout(() => this.attemptProviderRecovery(providerName), 5 * 60 * 1000) // 5 минут
      } else {
        setTimeout(() => this.attemptProviderRecovery(providerName), 30 * 1000) // 30 секунд
      }
    }
  }

  /**
   * Отметить провайдер как доступный
   */
  markProviderAsHealthy(providerName: string) {
    const status = this.status.get(providerName)
    if (status) {
      const wasUnhealthy = !status.isHealthy
      status.isHealthy = true
      status.lastError = undefined
      status.lastCheck = new Date()
      status.consecutiveFailures = 0
      
      if (wasUnhealthy) {
        safeLogger.info(`✅ Провайдер ${providerName} восстановлен`)
      }
    }
  }

  /**
   * Попытка восстановления провайдера
   */
  private async attemptProviderRecovery(providerName: string) {
    const config = this.providers.get(providerName)
    if (!config?.enabled) return

    safeLogger.info(`🔄 Попытка восстановления провайдера ${providerName}`)
    
    try {
      // Простая проверка доступности
      if (config.healthCheck) {
        const isHealthy = await config.healthCheck()
        if (isHealthy) {
          this.markProviderAsHealthy(providerName)
        }
      } else {
        // Если нет специальной проверки, просто сбрасываем статус
        // Реальная проверка произойдёт при следующем запросе
        const status = this.status.get(providerName)
        if (status && status.consecutiveFailures > 0) {
          status.consecutiveFailures = Math.max(0, status.consecutiveFailures - 1)
          if (status.consecutiveFailures === 0) {
            this.markProviderAsHealthy(providerName)
          }
        }
      }
    } catch (error) {
      safeLogger.error(`🔄 Восстановление провайдера ${providerName} не удалось:`, error)
    }
  }

  /**
   * Получить статус всех провайдеров
   */
  getProvidersStatus(): ProviderStatus[] {
    return Array.from(this.status.values())
  }

  /**
   * Получить конфигурацию провайдера
   */
  getProviderConfig(providerName: string): ProviderConfig | undefined {
    return this.providers.get(providerName)
  }

  /**
   * Проверить, можно ли повторить запрос с текущим провайдером
   */
  canRetryWithProvider(providerName: string, attemptCount: number): boolean {
    const config = this.providers.get(providerName)
    return config ? attemptCount < config.maxRetries : false
  }
}

// Создаём глобальный экземпляр
export const providerManager = new ProviderManager()