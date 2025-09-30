import { NextRequest, NextResponse } from 'next/server'

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

    // Определяем провайдера ИИ
    const aiProvider = process.env.AI_PROVIDER || 'huggingface'
    
    let response: ChatResponse

    switch (aiProvider) {
      case 'huggingface':
        response = await handleHuggingFaceRequest(message, mode, chatHistory)
        break
      case 'ollama':
        response = await handleOllamaRequest(message, mode, chatHistory)
        break
      case 'openai':
        response = await handleOpenAIRequest(message, mode, chatHistory)
        break
      default:
        response = await handleMockRequest(message, mode, chatHistory)
    }

    response.processingTime = Date.now() - startTime

    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Ошибка API чата:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
    
    return NextResponse.json(
      { 
        error: 'Произошла ошибка при обработке запроса',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
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
    throw new Error('HUGGINGFACE_TOKEN не настроен')
  }

  // Выбираем модель в зависимости от режима
  const model = mode === 'fast' 
    ? 'microsoft/DialoGPT-medium'
    : 'microsoft/DialoGPT-large'
  
  // Формируем контекст из истории
  const context = chatHistory
    .slice(-10) // Берем последние 10 сообщений
    .map(msg => `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
    .join('\n')
  
  const prompt = context 
    ? `${context}\nHuman: ${message}\nAssistant:`
    : `Human: ${message}\nAssistant:`

  const response = await fetch(`${HF_API_URL}/${model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: mode === 'fast' ? 150 : 500,
        temperature: mode === 'fast' ? 0.7 : 0.8,
        do_sample: true,
        top_p: 0.9,
        return_full_text: false
      }
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Hugging Face API error: ${response.status} - ${errorData.error || 'Unknown error'}`)
  }

  const result = await response.json()
  let content = result[0]?.generated_text || 'Извините, не удалось сгенерировать ответ.'
  
  // Очищаем ответ от промпта
  content = content.replace(prompt, '').trim()
  
  const chatResponse: ChatResponse = {
    content,
    mode,
    processingTime: 0, // Будет установлено в основной функции
    model: `HuggingFace: ${model}`
  }

  // Для глубокого режима добавляем "мышление"
  if (mode === 'deep') {
    chatResponse.thinking = generateThinkingProcess(message, content)
  }

  return chatResponse
}

// Ollama (локальный запуск)
async function handleOllamaRequest(
  message: string, 
  mode: 'fast' | 'deep',
  chatHistory: Array<{ role: 'user' | 'assistant', content: string }>
): Promise<ChatResponse> {
  const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
  
  // Выбираем модель в зависимости от режима
  const model = mode === 'fast' ? 'llama2:7b' : 'llama2:13b'
  
  const messages = [
    ...chatHistory.slice(-10),
    { role: 'user', content: message }
  ]

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
        max_tokens: mode === 'fast' ? 150 : 500
      }
    })
  })

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`)
  }

  const result = await response.json()
  const content = result.message?.content || 'Извините, не удалось сгенерировать ответ.'

  const chatResponse: ChatResponse = {
    content,
    mode,
    processingTime: 0,
    model: `Ollama: ${model}`
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
      content: mode === 'fast' 
        ? 'Ты полезный ИИ-ассистент Komair. Отвечай кратко и точно.'
        : 'Ты полезный ИИ-ассистент Komair. Проводи глубокий анализ вопросов и давай подробные, продуманные ответы.'
    },
    ...chatHistory.slice(-10),
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

// Тестовая реализация (fallback)
async function handleMockRequest(
  message: string, 
  mode: 'fast' | 'deep',
  chatHistory: Array<{ role: 'user' | 'assistant', content: string }>
): Promise<ChatResponse> {
  // Имитируем задержку
  await new Promise(resolve => setTimeout(resolve, mode === 'fast' ? 500 : 2000))

  const responses = {
    fast: [
      `Понял ваш вопрос о "${message}". Это быстрый ответ от Komair.`,
      `Отвечаю на ваш запрос: "${message}". В быстром режиме я даю краткие ответы.`,
      `Ваш вопрос о "${message}" обработан. Вот краткий ответ.`
    ],
    deep: [
      `После тщательного анализа вашего вопроса "${message}", могу предоставить подробное объяснение. В режиме глубокого анализа я рассматриваю проблему с разных сторон.`,
      `Проводя глубокий анализ вашего запроса "${message}", я рассмотрел несколько аспектов этой темы. Позвольте дать вам развернутый ответ.`,
      `Ваш вопрос "${message}" требует внимательного рассмотрения. В результате глубокого анализа я готов предоставить комплексный ответ.`
    ]
  }

  const content = responses[mode][Math.floor(Math.random() * responses[mode].length)]

  const chatResponse: ChatResponse = {
    content,
    mode,
    processingTime: 0,
    model: 'Mock API'
  }

  if (mode === 'deep') {
    chatResponse.thinking = generateThinkingProcess(message, content)
  }

  return chatResponse
}

// Генерация процесса мышления для глубокого режима
function generateThinkingProcess(question: string, answer: string): string {
  return `Анализ вопроса: "${question}"

🔍 Шаг 1: Понимание контекста
Пользователь спрашивает о конкретной теме, которая требует детального рассмотрения.

🧠 Шаг 2: Анализ ключевых аспектов
- Определяю основные компоненты вопроса
- Рассматриваю возможные интерпретации
- Учитываю контекст и нюансы

💡 Шаг 3: Формирование ответа
- Структурирую информацию логично
- Проверяю полноту и точность
- Адаптирую под уровень сложности

✅ Результат: Сформулирован развернутый ответ, учитывающий различные аспекты вопроса.`
}