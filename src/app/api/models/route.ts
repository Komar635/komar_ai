import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const provider = process.env.AI_PROVIDER || 'mock'
    
    const models = {
      huggingface: [
        'microsoft/DialoGPT-medium',
        'microsoft/DialoGPT-large',
        'microsoft/DialoGPT-small'
      ],
      ollama: [
        'llama2:7b',
        'llama2:13b',
        'mistral:7b'
      ],
      openai: [
        'gpt-3.5-turbo',
        'gpt-4',
        'gpt-4-turbo'
      ],
      mock: [
        'Mock Fast Model',
        'Mock Deep Model'
      ]
    }

    return NextResponse.json({
      provider,
      models: models[provider as keyof typeof models] || models.mock
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Не удалось получить список моделей' },
      { status: 500 }
    )
  }
}