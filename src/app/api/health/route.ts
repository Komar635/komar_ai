import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      provider: process.env.AI_PROVIDER || 'mock',
      version: '1.0.0'
    }

    return NextResponse.json(health)
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: 'Service unavailable' },
      { status: 503 }
    )
  }
}