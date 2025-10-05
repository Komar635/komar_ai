
import { NextRequest, NextResponse } from 'next/server'
import { safeLogger } from '@/lib/logger'
import { providerManager } from '../../../lib/provider-manager'
import { responseCache } from '@/lib/response-cache'
import { createContextualPrompt, buildFinalPrompt } from '@/lib/prompts'

export interface ChatRequest {
  message: string
  mode: 'fast' | 'deep'
  chatHistory?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

export interface ChatResponse {
  content: string
  thinking?: string
  mode: 'fast' | 'deep'
  processingTime: number
  model: string
}

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now()
    const body: ChatRequest = await request.json()
    
    const { message, mode, chatHistory = [] } = body

    // Валидация входных данных
    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Сообщение не может быть пустым' },
        { status: 400 }
      )
    }

    if (!['fast', 'deep'].includes(mode)) {
      return NextResponse.json(
        { error: 'Неверный режим. Используйте "fast" или "deep"' },
        { status: 400 }
      )
    }

    // Проверяем кэш перед обращением к ИИ
    const cachedResponse = responseCache.get(message, mode)
    if (cachedResponse) {
      cachedResponse.processingTime = Date.now() - startTime
      return NextResponse.json(cachedResponse)
    }

    // Определяем лучший доступный провайдер
    let currentProvider = providerManager.getBestAvailableProvider()
    let response: ChatResponse
    let attemptCount = 0
    let lastError: Error | null = null
    
    safeLogger.info(`🚀 Начинаем с провайдера: ${currentProvider}`)

    // Пытаемся получить ответ с fallback между провайдерами
    while (currentProvider && currentProvider !== 'mock') {
      try {
        attemptCount++
        safeLogger.info(`🚀 Попытка ${attemptCount} с провайдером: ${currentProvider}`)
        
        response = await executeProviderRequest(currentProvider, message, mode, chatHistory)
        
        // Отмечаем провайдер как работоспособный
        providerManager.markProviderAsHealthy(currentProvider)
        
        // Сохраняем в кэш успешный ответ
        responseCache.set(message, mode, response, currentProvider)
        
        response.processingTime = Date.now() - startTime
        return NextResponse.json(response)
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        safeLogger.error(`❌ Ошибка с провайдером ${currentProvider}:`, lastError.message)
        
        // Отмечаем провайдер как недоступный
        providerManager.markProviderAsUnhealthy(currentProvider, lastError.message)
        
        // Проверяем, можно ли повторить с текущим провайдером
        if (providerManager.canRetryWithProvider(currentProvider, attemptCount)) {
          safeLogger.info(`🔄 Повторная попытка с ${currentProvider}...`)
          continue
        }
        
        // Переключаемся на следующий провайдер
        const nextProvider = providerManager.getNextProvider(currentProvider)
        if (nextProvider) {
          safeLogger.info(`🔄 Переключение на резервный провайдер: ${nextProvider}`)
          currentProvider = nextProvider
          attemptCount = 0
          continue
        }
        
        break // Все провайдеры исчерпаны
      }
    }
    
    // КРИТИЧЕСКАЯ ОШИБКА: Если мы здесь - значит ВСЕ реальные провайдеры не работают!
    // Это не должно происходить с корректно настроенным Groq API
    safeLogger.error('🚨 КРИТИЧЕСКАЯ ОШИБКА: Все реальные провайдеры недоступны!');
    safeLogger.error('🔧 Проверьте настройки API ключей в .env.local');
    safeLogger.error('🔍 Последняя ошибка:', lastError?.message || 'Неизвестна');
    
    // Возвращаем диагностическую информацию разработчику
    const diagnosticInfo = {
      availableProviders: providerManager.getProvidersStatus().map(p => ({ 
        name: p.name, 
        healthy: p.isHealthy, 
        error: p.lastError 
      })),
      envVars: {
        groqKey: process.env.GROQ_API_KEY ? '✅ Настроен' : '❌ Отсутствует',
        hfToken: process.env.HUGGINGFACE_TOKEN ? '✅ Настроен' : '❌ Отсутствует',
        togetherKey: process.env.TOGETHER_API_KEY ? '✅ Настроен' : '❌ Отсутствует'
      },
      lastError: lastError?.message
    };
    
    return NextResponse.json({
      error: 'Все AI провайдеры недоступны',
      message: 'Проверьте настройки API ключей и подключение к интернету',
      diagnostics: process.env.NODE_ENV === 'development' ? diagnosticInfo : undefined
    }, { status: 503 });
    
  } catch (error) {
    safeLogger.error('Ошибка API чата:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
    const errorStack = error instanceof Error ? error.stack : 'Нет стека ошибок'
    
    // Подробная информация об ошибке для разработчика
    safeLogger.error(`Подробности ошибки: ${errorMessage}`)
    safeLogger.error(`Стек ошибки: ${errorStack}`)
    
    // Показываем статистику провайдеров для диагностики
    const providersStatus = providerManager.getProvidersStatus()
    safeLogger.error('Статус провайдеров:', providersStatus)
    
    return NextResponse.json(
      { 
        error: 'Произошла ошибка при обработке запроса',
        details: process.env.NODE_ENV === 'development' ? {
          message: errorMessage,
          stack: errorStack,
          providersStatus
        } : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * Универсальная функция для выполнения запроса к провайдеру
 */
async function executeProviderRequest(
  provider: string,
  message: string, 
  mode: 'fast' | 'deep',
  chatHistory: Array<{ role: 'user' | 'assistant', content: string }>
): Promise<ChatResponse> {
  switch (provider) {
    case 'huggingface':
      return await handleHuggingFaceRequest(message, mode, chatHistory)
    case 'ollama':
      return await handleOllamaRequest(message, mode, chatHistory)
    case 'together':
      return await handleTogetherAIRequest(message, mode, chatHistory)
    case 'groq':
      return await handleGroqRequest(message, mode, chatHistory)
    case 'cohere':
      return await handleCohereRequest(message, mode, chatHistory)
    case 'openai':
      return await handleOpenAIRequest(message, mode, chatHistory)
    case 'mock':
    default:
      return await handleMockRequest(message, mode, chatHistory)
  }
}

// Hugging Face Inference API
async function handleHuggingFaceRequest(
  message: string, 
  mode: 'fast' | 'deep',
  chatHistory: Array<{ role: 'user' | 'assistant', content: string }>
): Promise<ChatResponse> {
  const HF_API_URL = 'https://api-inference.huggingface.co/models'
  const HF_TOKEN = process.env.HUGGINGFACE_TOKEN
  
  if (!HF_TOKEN) {
    // Если токен не настроен, используем бесплатные модели без аутентификации
    safeLogger.warn('HUGGINGFACE_TOKEN не настроен, используется бесплатный доступ')
  }

  // Бесплатные модели Hugging Face
  const models = {
    fast: [
      'microsoft/DialoGPT-medium',
      'facebook/blenderbot-400M-distill',
      'microsoft/DialoGPT-small'
    ],
    deep: [
      'microsoft/DialoGPT-large', 
      'facebook/blenderbot-1B-distill',
      'google/flan-t5-base'
    ]
  }
  
  const selectedModels = models[mode]
  let lastError: Error | null = null
  
  // Пробуем модели по очереди до успешного ответа
  for (const model of selectedModels) {
    try {
      safeLogger.info(`Пробуем модель: ${model}`)
      
      // Формируем запрос в зависимости от типа модели
      let payload: any
      
      if (model.includes('DialoGPT')) {
        // Для DialoGPT формируем диалоговый контекст
        const context = chatHistory
          .slice(-5) // Берем последние 5 сообщений для контекста
          .map(msg => `${msg.role === 'user' ? 'Human' : 'Bot'}: ${msg.content}`)
          .join(' ')
        
        const prompt = context 
          ? `${context} Human: ${message} Bot:`
          : `Human: ${message} Bot:`
          
        payload = {
          inputs: prompt,
          parameters: {
            max_new_tokens: mode === 'fast' ? 100 : 200,
            temperature: 0.7,
            do_sample: true,
            top_p: 0.9,
            return_full_text: false,
            pad_token_id: 50256
          },
          options: {
            wait_for_model: true,
            use_cache: false
          }
        }
      } else if (model.includes('blenderbot')) {
        // Для BlenderBot используем простой текст
        payload = {
          inputs: message,
          parameters: {
            max_length: mode === 'fast' ? 100 : 200,
            min_length: 10,
            do_sample: true,
            temperature: 0.7
          },
          options: {
            wait_for_model: true,
            use_cache: false
          }
        }
      } else {
        // Для T5 и других моделей
        payload = {
          inputs: `Ответь на вопрос: ${message}`,
          parameters: {
            max_new_tokens: mode === 'fast' ? 100 : 200,
            temperature: 0.7
          },
          options: {
            wait_for_model: true,
            use_cache: false
          }
        }
      }
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      
      if (HF_TOKEN) {
        headers['Authorization'] = `Bearer ${HF_TOKEN}`
      }

      const response = await fetch(`${HF_API_URL}/${model}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`)
      }

      const result = await response.json()
      
      let content: string
      
      if (Array.isArray(result) && result[0]) {
        if (result[0].generated_text !== undefined) {
          content = result[0].generated_text
          // Очищаем от исходного промпта для DialoGPT
          if (model.includes('DialoGPT')) {
            content = content.split('Bot:').pop()?.trim() || content
          }
        } else if (result[0].translation_text) {
          content = result[0].translation_text
        } else {
          content = result[0].summary_text || JSON.stringify(result[0])
        }
      } else {
        content = result.generated_text || result.text || 'Не удалось получить ответ от модели.'
      }
      
      // Проверяем качество ответа
      if (!content || content.trim().length < 5) {
        throw new Error('Слишком короткий ответ от модели')
      }
      
      const chatResponse: ChatResponse = {
        content: content.trim(),
        mode,
        processingTime: 0,
        model: `HuggingFace: ${model}`
      }

      // Для глубокого режима добавляем "мышление"
      if (mode === 'deep') {
        chatResponse.thinking = generateThinkingProcess(message, content)
      }

      safeLogger.info(`Успешный ответ от модели: ${model}`)
      return chatResponse
      
    } catch (error) {
      safeLogger.error(`Ошибка с моделью ${model}:`, error)
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Если это ошибка загрузки модели, ждем немного
      if (lastError.message.includes('loading')) {
        safeLogger.info('Модель загружается, ждем 3 секунды...')
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
      
      continue // Пробуем следующую модель
    }
  }
  
  // Если все модели не сработали, возвращаем полезный fallback
  safeLogger.error('Все модели Hugging Face недоступны, используем улучшенный fallback')
  
  // Генерируем полезный ответ на основе ключевых слов
  let content = generateUniversalResponse(message, mode)
  
  return {
    content,
    mode,
    processingTime: 0,
    model: 'Komair: Smart Fallback'
  }
}

// Ollama (локальный запуск)
async function handleOllamaRequest(
  message: string, 
  mode: 'fast' | 'deep',
  chatHistory: Array<{ role: 'user' | 'assistant', content: string }>
): Promise<ChatResponse> {
  const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
  
  // Выбираем Llama модель в зависимости от режима
  const model = mode === 'fast' ? 'llama3:8b' : 'llama3:70b'
  
  const messages = [
    {
      role: 'system',
      content: createContextualPrompt(mode)
    },
    ...chatHistory.slice(-8),
    { role: 'user', content: message }
  ]

  safeLogger.info(`🦙 Используем локальную Llama: ${model}`)

  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: {
        temperature: mode === 'fast' ? 0.7 : 0.8,
        top_p: 0.9,
        num_predict: mode === 'fast' ? 200 : 500
      }
    })
  })

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}. Проверьте, что Ollama запущен на ${OLLAMA_URL}`)
  }

  const result = await response.json()
  const content = result.message?.content || 'Извините, не удалось получить ответ от Llama.'

  const chatResponse: ChatResponse = {
    content: content.trim(),
    mode,
    processingTime: 0,
    model: `Ollama: ${model}`
  }

  if (mode === 'deep') {
    chatResponse.thinking = generateThinkingProcess(message, content)
  }

  return chatResponse
}

// Together AI (бесплатные Llama модели)
async function handleTogetherAIRequest(
  message: string, 
  mode: 'fast' | 'deep',
  chatHistory: Array<{ role: 'user' | 'assistant', content: string }>
): Promise<ChatResponse> {
  const TOGETHER_API_URL = 'https://api.together.xyz/v1/chat/completions'
  const TOGETHER_TOKEN = process.env.TOGETHER_API_KEY
  
  if (!TOGETHER_TOKEN) {
    throw new Error('TOGETHER_API_KEY не настроен. Получите бесплатный токен на https://api.together.xyz')
  }

  // Выбираем Llama модель в зависимости от режима
  const model = mode === 'fast' 
    ? 'meta-llama/Llama-2-7b-chat-hf'  // Быстрая модель
    : 'meta-llama/Llama-2-13b-chat-hf' // Более качественная модель
  
  const messages = [
    {
      role: 'system',
      content: createContextualPrompt(mode)
    },
    ...chatHistory.slice(-6),
    { role: 'user', content: message }
  ]

  safeLogger.info(`🦙 Используем Llama модель: ${model}`)

  const response = await fetch(TOGETHER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOGETHER_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: mode === 'fast' ? 200 : 500,
      temperature: mode === 'fast' ? 0.7 : 0.8,
      top_p: 0.9,
      repetition_penalty: 1.1
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Together AI error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
  }

  const result = await response.json()
  const content = result.choices[0]?.message?.content || 'Извините, не удалось получить ответ от Llama модели.'

  const chatResponse: ChatResponse = {
    content: content.trim(),
    mode,
    processingTime: 0,
    model: `Together AI: ${model}`
  }

  if (mode === 'deep') {
    chatResponse.thinking = generateThinkingProcess(message, content)
  }

  return chatResponse
}

// Groq (сверхбыстрые Llama модели)
async function handleGroqRequest(
  message: string, 
  mode: 'fast' | 'deep',
  chatHistory: Array<{ role: 'user' | 'assistant', content: string }>
): Promise<ChatResponse> {
  const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
  const GROQ_TOKEN = process.env.GROQ_API_KEY
  
  if (!GROQ_TOKEN) {
    throw new Error('GROQ_API_KEY не настроен. Получите бесплатный токен на https://console.groq.com')
  }

  // Groq стабильные рабочие модели (проверенные)
  const model = mode === 'fast' 
    ? 'llama-3.1-8b-instant'    // Быстрая модель - работает стабильно
    : 'llama-3.1-8b-instant'    // Используем ту же быструю модель для глубокого режима
  
  const messages = [
    {
      role: 'system',
      content: createContextualPrompt(mode)
    },
    ...chatHistory.slice(-6),
    { role: 'user', content: message }
  ]

  safeLogger.info(`⚡ Используем Groq Llama: ${model}`)
  safeLogger.info(`🔑 Ключ API: ${GROQ_TOKEN ? 'Настроен (' + GROQ_TOKEN.substring(0, 10) + '...)' : 'Не настроен'}`)
  safeLogger.info(`📤 Отправляем запрос в Groq API...`)
  
  const requestPayload = {
    model,
    messages,
    max_tokens: mode === 'fast' ? 200 : 500,
    temperature: mode === 'fast' ? 0.7 : 0.8,
    top_p: 0.9
  }
  
  safeLogger.info(`📋 Payload:`, { 
    model: requestPayload.model, 
    messagesCount: requestPayload.messages.length,
    maxTokens: requestPayload.max_tokens 
  })

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestPayload)
  })
  
  safeLogger.info(`📥 Groq ответ: ${response.status} ${response.statusText}`)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    
    safeLogger.error(`Groq API ошибка: ${response.status}`, errorData)
    
    // Специальная обработка cfToken ошибки
    const errorMessage = errorData.error?.message || errorData.message || JSON.stringify(errorData)
    if (errorMessage.includes('cfToken')) {
      throw new Error(`Groq аутентификация не удалась (cfToken error). Проверьте корректность GROQ_API_KEY в .env.local`)
    }
    
    // Обработка других ошибок аутентификации
    if (response.status === 401) {
      throw new Error(`Groq API: Неверный API ключ. Получите новый ключ на https://console.groq.com`)
    }
    
    if (response.status === 429) {
      throw new Error(`Groq API: Превышен лимит запросов. Попробуйте позже.`)
    }
    
    throw new Error(`Groq API error: ${response.status} - ${errorData.error?.message || errorData.message || 'Unknown error'}`)
  }

  const result = await response.json()
  const content = result.choices[0]?.message?.content || 'Извините, не удалось получить ответ от Groq Llama.'

  const chatResponse: ChatResponse = {
    content: content.trim(),
    mode,
    processingTime: 0,
    model: `Groq: ${model}`
  }

  if (mode === 'deep') {
    chatResponse.thinking = generateThinkingProcess(message, content)
  }

  return chatResponse
}

// Cohere (Command модели)
async function handleCohereRequest(
  message: string, 
  mode: 'fast' | 'deep',
  chatHistory: Array<{ role: 'user' | 'assistant', content: string }>
): Promise<ChatResponse> {
  const COHERE_API_URL = 'https://api.cohere.ai/v1/chat'
  const COHERE_TOKEN = process.env.COHERE_API_KEY
  
  if (!COHERE_TOKEN) {
    throw new Error('COHERE_API_KEY не настроен. Получите бесплатный токен на https://dashboard.cohere.ai')
  }

  // Cohere Command модели
  const model = mode === 'fast' 
    ? 'command-light'  // Быстрая модель
    : 'command'        // Качественная модель
  
  // Форматируем историю для Cohere
  const chat_history = chatHistory.slice(-6).map(msg => ({
    role: msg.role === 'user' ? 'USER' : 'CHATBOT',
    message: msg.content
  }))

  safeLogger.info(`🔮 Используем Cohere: ${model}`)

  const response = await fetch(COHERE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${COHERE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      message,
      chat_history,
      max_tokens: mode === 'fast' ? 200 : 500,
      temperature: mode === 'fast' ? 0.7 : 0.8,
      k: 40,
      p: 0.9
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Cohere API error: ${response.status} - ${errorData.message || 'Unknown error'}`)
  }

  const result = await response.json()
  const content = result.text || 'Извините, не удалось получить ответ от Cohere.'

  const chatResponse: ChatResponse = {
    content: content.trim(),
    mode,
    processingTime: 0,
    model: `Cohere: ${model}`
  }

  if (mode === 'deep') {
    chatResponse.thinking = generateThinkingProcess(message, content)
  }

  return chatResponse
}

// OpenAI API (опционально)
async function handleOpenAIRequest(
  message: string, 
  mode: 'fast' | 'deep',
  chatHistory: Array<{ role: 'user' | 'assistant', content: string }>
): Promise<ChatResponse> {
  const OPENAI_TOKEN = process.env.OPENAI_API_KEY
  
  if (!OPENAI_TOKEN) {
    throw new Error('OPENAI_API_KEY не настроен')
  }

  const model = mode === 'fast' ? 'gpt-3.5-turbo' : 'gpt-4'
  
  const messages = [
    {
      role: 'system',
      content: createContextualPrompt(mode)
    },
    ...chatHistory.slice(-8),
    { role: 'user', content: message }
  ]

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: mode === 'fast' ? 150 : 500,
      temperature: mode === 'fast' ? 0.7 : 0.8,
    })
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const result = await response.json()
  const content = result.choices[0]?.message?.content || 'Извините, не удалось сгенерировать ответ.'

  const chatResponse: ChatResponse = {
    content,
    mode,
    processingTime: 0,
    model: `OpenAI: ${model}`
  }

  if (mode === 'deep') {
    chatResponse.thinking = generateThinkingProcess(message, content)
  }

  return chatResponse
}

// Тестовая реализация (умная mock-система)
async function handleMockRequest(
  message: string, 
  mode: 'fast' | 'deep',
  chatHistory: Array<{ role: 'user' | 'assistant', content: string }>
): Promise<ChatResponse> {
  // Имитируем задержку
  await new Promise(resolve => setTimeout(resolve, mode === 'fast' ? 500 : 1500))

  // Используем умную логику ответов
  const content = generateSmartMockResponse(message, mode)

  const chatResponse: ChatResponse = {
    content,
    mode,
    processingTime: 0,
    model: 'Komair Smart Mock'
  }

  if (mode === 'deep') {
    chatResponse.thinking = generateThinkingProcess(message, content)
  }

  return chatResponse
}

// Генерация процесса мышления для глубокого режима
// Простая mock-система
function generateSmartMockResponse(question: string, mode: 'fast' | 'deep'): string {
  // Mock-провайдер всегда использует универсальные ответы
  return generateUniversalResponse(question, mode)
}


// Генерация процесса мышления для глубокого режима
function generateThinkingProcess(question: string, answer: string): string {
  return `Анализ вопроса: "${question}"

🔍 Шаг 1: Понимание контекста
Пользователь спрашивает о конкретной теме.

🧠 Шаг 2: Анализ
Рассматриваю ключевые аспекты вопроса.

💡 Шаг 3: Решение
Формирую структурированный ответ.

✅ Результат: Получен детальный ответ.`
}



// УБИРАЕМ УНИВЕРСАЛЬНЫЕ ОТВЕТЫ - СИСТЕМА ДОЛЖНА РАБОТАТЬ С РЕАЛЬНЫМИ API!
// Эта функция больше не должна использоваться для fallback
function generateUniversalResponse(question: string, mode: 'fast' | 'deep'): string {
  // Этой функции не должно быть в production коде!
  // Если мы здесь - значит все реальные провайдеры не работают
  throw new Error(`КРИТИЧЕСКАЯ ОШИБКА: Все AI провайдеры недоступны! Вопрос: ${question}, Режим: ${mode}`)
}