# 🦙 Полное руководство по интеграции Llama моделей в Komair

## 🎯 Обзор доступных провайдеров

### 1. **Together AI** (Рекомендуется для начала)
- 💰 **$25 бесплатно** при регистрации
- 🦙 Llama 2 7B/13B модели
- ⚡ Быстрая скорость
- 🔗 https://api.together.xyz

### 2. **Groq** (Самые быстрые)
- 🆓 **6,000 токенов/минуту** бесплатно
- 🦙 Llama 3 8B/70B модели  
- ⚡ Сверхбыстрая обработка (до 500 токенов/сек)
- 🔗 https://console.groq.com

### 3. **Ollama** (Локально, полностью бесплатно)
- 🆓 **Полностью бесплатно**
- 🦙 Llama 3, Llama 2, Code Llama
- 💻 Работает на вашем компьютере
- 🔗 https://ollama.ai

### 4. **Cohere** (Альтернатива)
- 🆓 **Бесплатные кредиты** при регистрации
- 🤖 Command модели
- 🔗 https://dashboard.cohere.ai

## 🚀 Быстрая настройка

### Вариант 1: Together AI (Самый простой)

```bash
# 1. Зарегистрируйтесь на https://api.together.xyz
# 2. Получите $25 бесплатных кредитов
# 3. Скопируйте API ключ
# 4. Обновите .env.local:

AI_PROVIDER=together
TOGETHER_API_KEY=ваш_ключ_здесь
```

### Вариант 2: Groq (Самый быстрый)

```bash
# 1. Зарегистрируйтесь на https://console.groq.com
# 2. Получите бесплатный API ключ
# 3. Обновите .env.local:

AI_PROVIDER=groq
GROQ_API_KEY=ваш_ключ_здесь
```

### Вариант 3: Ollama (Локально)

```powershell
# 1. Скачайте и установите Ollama: https://ollama.ai
# 2. Запустите PowerShell и загрузите модель:

ollama pull llama3:8b     # Для быстрого режима (~4.7 GB)
ollama pull llama3:70b    # Для глубокого режима (~40 GB)

# 3. Обновите .env.local:
AI_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
```

## 📊 Сравнение провайдеров

| Провайдер | Цена | Скорость | Качество | Llama модели |
|-----------|------|----------|----------|--------------|
| **Together AI** | $25 бесплатно | ⭐⭐⭐ | ⭐⭐⭐⭐ | Llama 2 7B/13B |
| **Groq** | Бесплатно | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Llama 3 8B/70B |
| **Ollama** | Бесплатно | ⭐⭐ | ⭐⭐⭐⭐ | Llama 3 все размеры |
| **Cohere** | Кредиты | ⭐⭐⭐ | ⭐⭐⭐ | Command (не Llama) |

## 🛠️ Детальная настройка

### Together AI

```bash
# Регистрация
1. Перейдите на https://api.together.xyz
2. Нажмите "Sign Up" 
3. Подтвердите email
4. Получите $25 кредитов автоматически

# Получение API ключа
1. Перейдите в Settings → API Keys
2. Создайте новый ключ
3. Скопируйте ключ (начинается с "...")

# Настройка в проекте
AI_PROVIDER=together
TOGETHER_API_KEY=ваш_ключ_together
```

### Groq

```bash
# Регистрация  
1. Перейдите на https://console.groq.com
2. Войдите через Google/GitHub
3. Автоматически получите бесплатные лимиты

# API ключ
1. Перейдите в API Keys
2. Создайте новый ключ
3. Скопируйте ключ (начинается с "gsk_")

# Настройка
AI_PROVIDER=groq  
GROQ_API_KEY=gsk_ваш_ключ_groq
```

### Ollama (Локальный запуск)

```powershell
# Установка Ollama
# Скачайте с https://ollama.ai/download
# Запустите установщик

# Загрузка моделей Llama
ollama pull llama3:8b       # 4.7 GB - быстрая модель
ollama pull llama3:70b      # 40 GB - качественная модель  
ollama pull llama3:instruct # 4.7 GB - инструктированная
ollama pull codellama       # 3.8 GB - для кода

# Проверка установки
ollama list

# Тест модели
ollama run llama3:8b "Привет! Как дела?"

# Настройка в проекте
AI_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
```

## 🧪 Тестирование

### Быстрый тест API

```javascript
// Тест в браузере (DevTools Console)
fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Привет! Расскажи о себе",
    mode: "fast"
  })
}).then(r => r.json()).then(console.log)
```

### Тест через PowerShell

```powershell
# Тест Together AI
$body = @{
    message = "Какие достопримечательности в Москве?"
    mode = "fast"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/chat" -Method POST -Body $body -ContentType "application/json"
```

## 🔧 Устранение проблем

### Together AI
```
❌ Ошибка: "Invalid API key"
✅ Решение: Проверьте правильность ключа в .env.local

❌ Ошибка: "Insufficient credits"  
✅ Решение: Проверьте баланс на dashboard.together.xyz
```

### Groq
```
❌ Ошибка: "Rate limit exceeded"
✅ Решение: Подождите минуту или получите платный план

❌ Ошибка: "Model not found"
✅ Решение: Используйте llama3-8b-8192 или llama3-70b-8192
```

### Ollama  
```
❌ Ошибка: "Connection refused"
✅ Решение: Запустите "ollama serve" в PowerShell

❌ Ошибка: "Model not found"
✅ Решение: Загрузите модель "ollama pull llama3:8b"

❌ Медленная работа
✅ Решение: Используйте меньшую модель или добавьте GPU
```

## 📈 Оптимизация производительности

### Для быстрого режима
- **Together AI**: Llama-2-7b-chat-hf
- **Groq**: llama3-8b-8192  
- **Ollama**: llama3:8b

### Для глубокого режима
- **Together AI**: Llama-2-13b-chat-hf
- **Groq**: llama3-70b-8192
- **Ollama**: llama3:70b

## 💡 Рекомендации

### Для начинающих
1. **Начните с Groq** - быстро и бесплатно
2. **Попробуйте Together AI** - качественные ответы
3. **Изучите Ollama** - для полного контроля

### Для продакшена
1. **Groq** - для быстрых ответов
2. **Together AI** - для качественного контента  
3. **Ollama** - для приватности данных

### Системные требования для Ollama
- **8B модель**: 8+ GB RAM
- **70B модель**: 64+ GB RAM или GPU 24+ GB
- **SSD диск**: Для быстрой загрузки

---

🎉 **Готово!** Теперь ваш Komair работает с мощными Llama моделями!