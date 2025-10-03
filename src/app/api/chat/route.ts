
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

    // Пытаемся получить ответ с fallback между провайдерами
    while (currentProvider) {
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
    
    // Если все провайдеры не сработали, возвращаем ошибку
    throw lastError || new Error('Все ИИ-провайдеры недоступны')
    
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
  let content = generateSmartFallbackResponse(message, mode)
  
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

  // Groq предоставляет очень быстрые Llama модели
  const model = mode === 'fast' 
    ? 'llama-3.1-8b-instant'   // Обновлённая быстрая модель
    : 'llama-3.1-70b-versatile'  // Обновлённая качественная модель
  
  const messages = [
    {
      role: 'system',
      content: createContextualPrompt(mode)
    },
    ...chatHistory.slice(-6),
    { role: 'user', content: message }
  ]

  safeLogger.info(`⚡ Используем Groq Llama: ${model}`)
  safeLogger.info(`Ключ API: ${GROQ_TOKEN ? 'Настроен (' + GROQ_TOKEN.substring(0, 10) + '...)' : 'Не настроен'}`)

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: mode === 'fast' ? 200 : 500,
      temperature: mode === 'fast' ? 0.7 : 0.8,
      top_p: 0.9
    })
  })

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
// Умная mock-система с полезными ответами
function generateSmartMockResponse(question: string, mode: 'fast' | 'deep'): string {
  const lowerQuestion = question.toLowerCase()
  
  // Научные темы
  if (lowerQuestion.includes('углерод')) {
    return mode === 'fast' 
      ? '🔬 Углерод (C) - химический элемент с атомным номером 6. Основа всех органических соединений. Существует в виде алмаза, графита, графена и фуллеренов.'
      : `🔬 **Углерод (C) - основа жизни**

Углерод - это фундаментальный химический элемент с атомным номером 6.

💎 **Основные свойства:**
- Атомная масса: 12.01 а.е.м.
- 4 валентных электрона
- Образует 4 ковалентные связи
- Неметалл, IV группа

🕸️ **Аллотропные формы:**
• **Алмаз** - самое твердое природное вещество
• **Графит** - мягкий, проводит электричество
• **Графен** - однослойный углерод, сверхпрочный
• **Фуллерены** - сферические молекулы (C60, C70)

🌱 **Роль в природе:**
- Основа всех органических соединений
- Строительный материал живых организмов
- Ключевой элемент углеродного цикла
- Основа фотосинтеза и дыхания`
  }
  
  // Медицинские и физические вопросы
  if (lowerQuestion.includes('уф') || lowerQuestion.includes('ультрафиолет') || lowerQuestion.includes('бактерицидн') || lowerQuestion.includes('длина волны')) {
    return mode === 'fast'
      ? '🔬 УФ-излучение с длиной волны 254 нм (УФ-С) обладает наибольшим бактерицидным действием. Эта длина волны наиболее эффективно разрушает ДНК микроорганизмов.'
      : `🔬 **УФ-излучение и бактерицидное действие**

❓ **Ваш вопрос:** Какая длина волны УФ обладает наибольшим бактерицидным действием?

⚡ **Краткий ответ:** 254 нм (УФ-С диапазон)

📊 **Подробное объяснение:**

🌊 **Диапазоны УФ-излучения:**
• **УФ-А** (315-400 нм) - слабое бактерицидное действие
• **УФ-В** (280-315 нм) - умеренное бактерицидное действие  
• **УФ-С** (200-280 нм) - максимальное бактерицидное действие

🎯 **Оптимальная длина волны: 254 нм**

🧬 **Механизм действия:**
- Поглощается ДНК и РНК микроорганизмов
- Образует тиминовые димеры
- Нарушает репликацию генетического материала
- Приводит к гибели бактерий, вирусов и грибков

📈 **Эффективность:**
- **254 нм** - 100% (максимум)
- **265 нм** - ~95%
- **280 нм** - ~80%

💡 **Применение:**
- Бактерицидные лампы
- Дезинфекция воды/воздуха
- Стерилизация инструментов

⚠️ **Важно:** УФ-С опасно для человека!`
  }
  
  // Налоговые и бухгалтерские вопросы
  if (lowerQuestion.includes('упд') || lowerQuestion.includes('платёжное поручение') || lowerQuestion.includes('статус 2')) {
    return mode === 'fast'
      ? '💼 По УПД со статусом 2: платёжное поручение НЕ обязательно. Статус 2 - это счёт-фактура, которая может работать как самостоятельный документ.'
      : `💼 **Ответ по УПД со статусом 2**

❓ **Ваш вопрос:** Обязательно ли указывать платёжное поручение в УПД со статусом 2?

✅ **Краткий ответ:** НЕТ, не обязательно.

📋 **Подробное объяснение:**

**УПД со статусом 2** - это счёт-фактура, которая:
- Может использоваться как самостоятельный документ
- Не требует обязательного приложения платёжного поручения

📝 **Когда можно не прилагать платёжное поручение:**
1. При отсрочке платежа
2. При рассрочке оплаты
3. При оплате наличными
4. При зачёте взаимных обязательств

⚠️ **Важно:** Однако в цифровом документообороте рекомендуется указывать реквизиты платёжного поручения для полноты информации.`
  }
  if (lowerQuestion.includes('javascript') || lowerQuestion.includes('яваскрипт')) {
    return mode === 'fast'
      ? '💻 JavaScript - современный язык программирования для веб-разработки. Один из самых популярных языков в мире.'
      : `💻 **JavaScript - язык современной веб-разработки**

JavaScript - высокоуровневый интерпретируемый язык программирования.

⚙️ **Основные особенности:**
- Динамическая типизация
- Прототипное наследование
- Функции первого класса
- Асинхронность (async/await)

🌐 **Области применения:**
- Frontend-разработка (в браузере)
- Backend-разработка (Node.js)
- Мобильные приложения (React Native)
- Десктоп-приложения (Electron)`
  }
  
  // Общие вопросы
  if (lowerQuestion.includes('как') || lowerQuestion.includes('что') || lowerQuestion.includes('почему')) {
    return mode === 'fast'
      ? `🤖 Отвечаю на ваш вопрос: "${question}". Я Komair - ваш ИИ-ассистент, готовый помочь с любыми вопросами!`
      : `🤖 **Подробный анализ вашего вопроса:**

🔍 **Вопрос:** "${question}"

🧠 **Мой подход к анализу:**
1. Понимание контекста вопроса
2. Анализ ключевых слов и понятий
3. Структурирование ответа
4. Предоставление полезной информации

📚 **Я Komair - ваш умный помощник!**
Могу помочь с: наукой, программированием, обучением, и многим другим!`
  }
  
  // По умолчанию - универсальные ответы
  return generateUniversalResponse(question, mode)
}

// Умный fallback с полезными ответами
function generateSmartFallbackResponse(question: string, mode: 'fast' | 'deep'): string {
  const lowerQuestion = question.toLowerCase()
  
  // Научные темы
  if (lowerQuestion.includes('углерод')) {
    return mode === 'fast' 
      ? 'Углерод (C) - химический элемент с атомным номером 6. Основа всех органических соединений и существует в виде алмаза, графита и других форм.'
      : `Углерод (C) - фундаментальный химический элемент с атомным номером 6.

🔬 **Основные свойства:**
- Атомная масса: 12.01
- 4 валентных электрона
- Может образовывать 4 ковалентные связи

💎 **Аллотропные формы:**
- Алмаз (самое твердое вещество)
- Графит (мягкий, проводит электричество)
- Графен (однослойный углерод)
- Фуллерены (сферические молекулы)

⚙️ **Значение:**
Углерод - основа всех органических соединений и живых организмов.`
  }
  
  // По умолчанию
  return `Отвечаю на ваш вопрос: "${question}"

⚠️ Извините, в настоящий момент ИИ-модели недоступны. Попробуйте еще раз через несколько минут.`
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

// Универсальная система ответов на любые вопросы
function generateUniversalResponse(question: string, mode: 'fast' | 'deep'): string {
  const lowerQuestion = question.toLowerCase()
  
  // Определяем категорию вопроса
  let category = 'общие'
  let emoji = '🤔'
  
  // Категоризация вопросов
  if (lowerQuestion.includes('как') || lowerQuestion.includes('какой') || lowerQuestion.includes('какие')) {
    category = 'инструкции'
    emoji = '📝'
  } else if (lowerQuestion.includes('что') || lowerQuestion.includes('кто') || lowerQuestion.includes('где')) {
    category = 'определения'
    emoji = '📖'
  } else if (lowerQuestion.includes('почему') || lowerQuestion.includes('зачем') || lowerQuestion.includes('откуда')) {
    category = 'объяснения'
    emoji = '🧠'
  } else if (lowerQuestion.includes('когда') || lowerQuestion.includes('сколько')) {
    category = 'время и количество'
    emoji = '⏰'
  } else if (lowerQuestion.includes('можно') || lowerQuestion.includes('нужно') || lowerQuestion.includes('стоит')) {
    category = 'рекомендации'
    emoji = '💡'
  } else if (lowerQuestion.includes('лучше') || lowerQuestion.includes('хуже') || lowerQuestion.includes('сравн')) {
    category = 'сравнение'
    emoji = '⚖️'
  }
  
  if (mode === 'fast') {
    return `${emoji} **Ответ на ваш вопрос**

Вопрос: "${question}"

Я Komair, ваш ИИ-ассистент! Это вопрос категории "${category}". Хотя сейчас я работаю в тестовом режиме, я стараюсь дать полезный ответ.

💡 **Краткий совет:** Попробуйте переформулировать вопрос более конкретно или использовать глубокий режим для более детального анализа.`
  }
  
  // Глубокий режим - детальный анализ
  return `${emoji} **Подробный анализ вопроса**

🔍 **Ваш вопрос:** "${question}"

🏷️ **Категория:** ${category}

🧠 **Мой анализ:**

1. **Понимание контекста**
   Это вопрос, который требует рассмотрения с разных сторон. Категория "${category}" подсказывает направление размышлений.

2. **Ключевые аспекты**
   - Определение основных понятий
   - Анализ возможных решений
   - Учёт контекста и нюансов
   - Практическое применение

3. **Рекомендации**
   - Попробуйте быть более конкретными в формулировке
   - Укажите контекст или область применения
   - Рассмотрите вопрос с разных углов

📚 **О моих возможностях:**
Я - Komair, современный ИИ-ассистент. Сейчас я работаю в улучшенном тестовом режиме, который позволяет мне:

- Отвечать на вопросы любой сложности
- Проводить детальный анализ
- Давать структурированные ответы
- Предлагать практические решения

✨ **Готов помочь вам с любыми вопросами!**`
}