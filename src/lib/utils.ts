export function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(date: Date | string): string {
  const dateObj = date instanceof Date ? date : new Date(date)
  
  // Проверяем валидность даты
  if (isNaN(dateObj.getTime())) {
    return 'Некорректная дата'
  }
  
  return dateObj.toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15)
}

// Функция для безопасной очистки localStorage при критических ошибках
export function clearStorageData(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem('komair-chats')
    localStorage.removeItem('komair-theme')
    console.log('✅ localStorage очищен')
  } catch (error) {
    console.error('❌ Ошибка очистки localStorage:', error)
  }
}

// Функция для проверки целостности данных в localStorage
export function validateStorageData(): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const stored = localStorage.getItem('komair-chats')
    if (!stored) return true // Пустое хранилище - это нормально
    
    const parsed = JSON.parse(stored)
    
    // Проверяем базовую структуру
    if (!parsed.chats || !Array.isArray(parsed.chats)) {
      return false
    }
    
    // Проверяем каждый чат
    for (const chat of parsed.chats) {
      if (!chat.id || !chat.title || !chat.messages || !Array.isArray(chat.messages)) {
        return false
      }
      
      // Проверяем даты
      const createdAt = new Date(chat.createdAt)
      const updatedAt = new Date(chat.updatedAt)
      
      if (isNaN(createdAt.getTime()) || isNaN(updatedAt.getTime())) {
        console.warn('⚠️ Обнаружены некорректные даты в чате:', chat.id)
        // Не критично, можем исправить при загрузке
      }
    }
    
    return true
  } catch (error) {
    console.error('❌ Ошибка валидации данных localStorage:', error)
    return false
  }
}