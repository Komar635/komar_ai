# 🚀 Развёртывание Komair AI в сетевом окружении

## 📋 Проблема
При развертывании приложения в сетевом окружении (не localhost) пользователи сталкиваются с ошибкой:
> "Ошибка: Все AI провайдеры недоступны"

## 🔍 Причина
В сетевом окружении переменные окружения из `.env.local` не передаются автоматически, поэтому API ключи становятся недоступны.

## 🛠️ Решение

### Вариант 1: Использование переменных окружения сервера
Настройте переменные окружения на сервере развертывания:

```bash
# Для Linux/macOS
export GROQ_API_KEY="ваш_ключ_groq"
export HUGGINGFACE_TOKEN="ваш_токен_huggingface"
export TOGETHER_API_KEY="ваш_ключ_together"
export COHERE_API_KEY="ваш_ключ_cohere"

# Для Windows (PowerShell)
$env:GROQ_API_KEY="ваш_ключ_groq"
$env:HUGGINGFACE_TOKEN="ваш_токен_huggingface"
$env:TOGETHER_API_KEY="ваш_ключ_together"
$env:COHERE_API_KEY="ваш_ключ_cohere"
```

### Вариант 2: Использование файла .env на сервере
Создайте файл `.env` в корне проекта на сервере:

```env
GROQ_API_KEY=ваш_ключ_groq
HUGGINGFACE_TOKEN=ваш_токен_huggingface
TOGETHER_API_KEY=ваш_ключ_together
COHERE_API_KEY=ваш_ключ_cohere
NODE_ENV=production
```

### Вариант 3: Использование платформы развертывания
Если вы используете платформы типа Vercel, Netlify, Heroku и т.д., настройте переменные окружения в их интерфейсе:

#### Vercel:
1. Перейдите в настройки проекта
2. Выберите "Environment Variables"
3. Добавьте переменные:
   - `GROQ_API_KEY`
   - `HUGGINGFACE_TOKEN`
   - `TOGETHER_API_KEY`
   - `COHERE_API_KEY`

#### Heroku:
```bash
heroku config:set GROQ_API_KEY=ваш_ключ_groq
heroku config:set HUGGINGFACE_TOKEN=ваш_токен_huggingface
heroku config:set TOGETHER_API_KEY=ваш_ключ_together
heroku config:set COHERE_API_KEY=ваш_ключ_cohere
```

## 🧪 Проверка развертывания

### 1. Локальная проверка
Перед развертыванием проверьте локально:

```bash
# Убедитесь, что переменные установлены
echo $GROQ_API_KEY  # Linux/macOS
echo $env:GROQ_API_KEY  # Windows PowerShell

# Запустите приложение
npm run dev
```

### 2. Проверка после развертывания
После развертывания проверьте логи сервера на наличие сообщений:
- `🔑 Статус API ключей`
- `🔄 Инициализированы провайдеры`
- `📊 Доступные провайдеры`

## 🔐 Безопасность

### Не храните ключи в коде:
❌ НЕПРАВИЛЬНО:
```javascript
const GROQ_API_KEY = "sk-...";
```

✅ ПРАВИЛЬНО:
```javascript
const GROQ_API_KEY = process.env.GROQ_API_KEY;
```

### Используйте скрытые файлы:
- Добавьте `.env` в `.gitignore`
- Используйте `.env.example` для примера конфигурации

## 📊 Поддерживаемые провайдеры

### 1. Groq (рекомендуется)
- Быстрые Llama модели
- Бесплатно с ограничениями
- Получите ключ: https://console.groq.com

### 2. Hugging Face
- Множество бесплатных моделей
- Работает без токена (с ограничениями)
- Получите токен: https://huggingface.co/settings/tokens

### 3. Together AI
- Мощные Llama модели
- $25 кредит при регистрации
- Получите ключ: https://api.together.xyz

### 4. Cohere
- Command модели
- Бесплатные кредиты
- Получите ключ: https://dashboard.cohere.ai

## 🆘 Диагностика проблем

### Если всё ещё "Все AI провайдеры недоступны":

1. **Проверьте логи сервера** на наличие:
   - `🔑 Статус API ключей: {"groqKey":"❌ Отсутствует",...}`
   - `🚨 НЕТ ДОСТУПНЫХ ПРОВАЙДЕРОВ!`
   - `📊 Доступные провайдеры: ...`

2. **Убедитесь, что переменные окружения установлены**:
   ```bash
   # Linux/macOS
   printenv | grep -E "(GROQ|HUGGING|TOGETHER|COHERE)"
   
   # Windows PowerShell
   Get-ChildItem Env: | Where-Object {$_.Name -match "(GROQ|HUGGING|TOGETHER|COHERE)"}
   ```

3. **Проверьте доступ к интернету** с сервера:
   ```bash
   ping api.groq.com
   ```

4. **Проверьте брандмауэр** - порты 443 и 80 должны быть открыты

## 🔄 Поведение по умолчанию

Если не настроены API ключи:
- Приложение автоматически использует HuggingFace как основной провайдер
- HuggingFace работает без токена (с ограничениями)
- Пользователи получают базовую функциональность без дополнительной настройки

## 📞 Поддержка

Если проблема сохраняется:
1. Создайте issue в репозитории
2. Приложите логи сервера
3. Укажите платформу развертывания
4. Опишите шаги воспроизведения