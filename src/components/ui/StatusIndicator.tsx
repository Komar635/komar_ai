'use client'

import React, { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export type ConnectionStatus = 'online' | 'offline' | 'connecting' | 'error'

interface ConnectionStatusProps {
  status?: ConnectionStatus
  className?: string
}

export function ConnectionStatus({ status, className }: ConnectionStatusProps) {
  const [currentStatus, setCurrentStatus] = useState<ConnectionStatus>('online')

  useEffect(() => {
    if (status) {
      setCurrentStatus(status)
      return
    }

    // Автоматическое определение статуса подключения
    const updateStatus = () => {
      setCurrentStatus(navigator.onLine ? 'online' : 'offline')
    }

    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)
    updateStatus()

    return () => {
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)
    }
  }, [status])

  const getStatusConfig = () => {
    switch (currentStatus) {
      case 'online':
        return {
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ),
          color: 'bg-green-500',
          text: 'Подключено',
          textColor: 'text-green-600 dark:text-green-400'
        }
      case 'offline':
        return {
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          ),
          color: 'bg-red-500',
          text: 'Не подключено',
          textColor: 'text-red-600 dark:text-red-400'
        }
      case 'connecting':
        return {
          icon: (
            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ),
          color: 'bg-yellow-500',
          text: 'Подключение...',
          textColor: 'text-yellow-600 dark:text-yellow-400'
        }
      case 'error':
        return {
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ),
          color: 'bg-red-500',
          text: 'Ошибка подключения',
          textColor: 'text-red-600 dark:text-red-400'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div 
      className={cn("flex items-center space-x-2", className)}
      role="status"
      aria-label={`Статус подключения: ${config.text}`}
    >
      <div className="relative">
        <div className={cn("w-2 h-2 rounded-full", config.color)} />
        {currentStatus === 'online' && (
          <div className={cn(
            "absolute inset-0 w-2 h-2 rounded-full animate-ping opacity-75",
            config.color
          )} />
        )}
      </div>
      <span className={cn("text-xs font-medium", config.textColor)}>
        {config.text}
      </span>
    </div>
  )
}

// Компонент для отображения статуса API
interface APIStatusProps {
  isLoading?: boolean
  hasError?: boolean
  className?: string
}

export function APIStatus({ isLoading = false, hasError = false, className }: APIStatusProps) {
  const getStatus = (): ConnectionStatus => {
    if (hasError) return 'error'
    if (isLoading) return 'connecting'
    return 'online'
  }

  const getStatusText = () => {
    if (hasError) return 'Ошибка API'
    if (isLoading) return 'Обработка запроса...'
    return 'API готов'
  }

  const status = getStatus()
  const config = getStatusConfig(status)

  return (
    <div 
      className={cn("flex items-center space-x-2", className)}
      role="status"
      aria-live="polite"
      aria-label={`Статус API: ${getStatusText()}`}
    >
      <div className="relative">
        <div className={cn("w-2 h-2 rounded-full", config.color)} />
        {status === 'connecting' && (
          <div className={cn(
            "absolute inset-0 w-2 h-2 rounded-full animate-pulse",
            config.color
          )} />
        )}
      </div>
      <span className={cn("text-xs font-medium", config.textColor)}>
        {getStatusText()}
      </span>
    </div>
  )
}

function getStatusConfig(status: ConnectionStatus) {
  switch (status) {
    case 'online':
      return {
        color: 'bg-green-500',
        textColor: 'text-green-600 dark:text-green-400'
      }
    case 'offline':
      return {
        color: 'bg-gray-500',
        textColor: 'text-gray-600 dark:text-gray-400'
      }
    case 'connecting':
      return {
        color: 'bg-blue-500',
        textColor: 'text-blue-600 dark:text-blue-400'
      }
    case 'error':
      return {
        color: 'bg-red-500',
        textColor: 'text-red-600 dark:text-red-400'
      }
  }
}