'use client'

import { useCallback } from 'react'
import { useToast } from '@/components/ui/Toast'

export interface FeedbackOptions {
  showSuccess?: boolean
  showError?: boolean
  successMessage?: string
  errorMessage?: string
  duration?: number
}

export function useFeedback() {
  const { addToast } = useToast()

  const showSuccess = useCallback((message: string, duration?: number) => {
    addToast({
      type: 'success',
      title: 'Успешно',
      description: message,
      duration: duration || 3000
    })
  }, [addToast])

  const showError = useCallback((message: string, duration?: number) => {
    addToast({
      type: 'error',
      title: 'Ошибка',
      description: message,
      duration: duration || 5000
    })
  }, [addToast])

  const showWarning = useCallback((message: string, duration?: number) => {
    addToast({
      type: 'warning',
      title: 'Предупреждение',
      description: message,
      duration: duration || 4000
    })
  }, [addToast])

  const showInfo = useCallback((message: string, duration?: number) => {
    addToast({
      type: 'info',
      title: 'Информация',
      description: message,
      duration: duration || 4000
    })
  }, [addToast])

  const handleAction = useCallback(async <T>(
    action: () => Promise<T>,
    options: FeedbackOptions = {}
  ): Promise<T | null> => {
    const {
      showSuccess: shouldShowSuccess = true,
      showError: shouldShowError = true,
      successMessage = 'Операция выполнена успешно',
      errorMessage = 'Произошла ошибка при выполнении операции',
      duration
    } = options

    try {
      const result = await action()
      
      if (shouldShowSuccess) {
        showSuccess(successMessage, duration)
      }
      
      return result
    } catch (error) {
      if (shouldShowError) {
        const message = error instanceof Error ? error.message : errorMessage
        showError(message, duration)
      }
      
      return null
    }
  }, [showSuccess, showError])

  const copyToClipboard = useCallback(async (text: string) => {
    return handleAction(
      async () => {
        await navigator.clipboard.writeText(text)
        return true
      },
      {
        successMessage: 'Текст скопирован в буфер обмена',
        errorMessage: 'Не удалось скопировать текст'
      }
    )
  }, [handleAction])

  const downloadFile = useCallback(async (blob: Blob, filename: string) => {
    return handleAction(
      async () => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        return true
      },
      {
        successMessage: `Файл "${filename}" загружен`,
        errorMessage: 'Не удалось загрузить файл'
      }
    )
  }, [handleAction])

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    handleAction,
    copyToClipboard,
    downloadFile
  }
}

// Hook для обработки состояния загрузки с обратной связью
export function useLoadingFeedback() {
  const { showError, showInfo } = useFeedback()

  const withLoading = useCallback(async <T>(
    action: () => Promise<T>,
    options: {
      loadingMessage?: string
      successMessage?: string
      errorMessage?: string
      onStart?: () => void
      onSuccess?: (result: T) => void
      onError?: (error: Error) => void
      onFinally?: () => void
    } = {}
  ): Promise<T | null> => {
    const {
      loadingMessage = 'Загрузка...',
      successMessage,
      errorMessage = 'Произошла ошибка',
      onStart,
      onSuccess,
      onError,
      onFinally
    } = options

    try {
      onStart?.()
      
      if (loadingMessage) {
        showInfo(loadingMessage, 0) // Не автозакрывающееся уведомление
      }

      const result = await action()
      
      if (successMessage) {
        showInfo(successMessage)
      }
      
      onSuccess?.(result)
      return result
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(errorMessage)
      showError(err.message)
      onError?.(err)
      return null
      
    } finally {
      onFinally?.()
    }
  }, [showError, showInfo])

  return { withLoading }
}