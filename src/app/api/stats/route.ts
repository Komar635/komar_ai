import { NextRequest, NextResponse } from 'next/server'
import { providerManager, type ProviderStatus } from '@/lib/provider-manager'
import { responseCache } from '@/lib/response-cache'

export async function GET() {
  try {
    const providersStatus = providerManager.getProvidersStatus()
    const cacheStats = responseCache.getStats()
    
    const stats = {
      providers: {
        current: providerManager.getBestAvailableProvider(),
        status: providersStatus,
        available: providersStatus.filter((p: ProviderStatus) => p.isHealthy).length,
        total: providersStatus.length
      },
      cache: {
        ...cacheStats,
        hitRateFormatted: `${cacheStats.hitRate.toFixed(1)}%`,
        totalSizeFormatted: formatBytes(cacheStats.totalSize)
      },
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json(
      { error: 'Не удалось получить статистику' },
      { status: 500 }
    )
  }
}

/**
 * Форматирует байты в читаемый вид
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}