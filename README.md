# Komair - Умный ИИ-ассистент

![Komair Logo](https://img.shields.io/badge/Komair-AI%20Assistant-blue?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue?style=flat-square&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-3.3-38B2AC?style=flat-square&logo=tailwind-css)

Современный ИИ-ассистент, сочетающий возможности быстрых диалогов с глубоким анализом. Создан с использованием Next.js 15, TypeScript и современных веб-технологий.

## ✨ Особенности

### 🤖 ИИ-возможности
- **Два режима работы**: быстрый ответ и глубокий анализ
- **Процесс мышления**: пошаговые рассуждения в глубоком режиме
- **Множественные провайдеры**: Hugging Face, Ollama, OpenAI
- **Контекстная память**: учет истории разговора
- **Оптимизация для RTX 5060 8GB**

### 💬 Интерфейс чата
- **Дизайн в стиле GigaChat**: знакомый и удобный интерфейс
- **История чатов**: сохранение и поиск по всем разговорам
- **Группировка по темам**: организация чатов по тегам
- **Темная/светлая темы**: автоматическое переключение
- **Адаптивный дизайн**: работает на всех устройствах

### 🔧 Технические возможности
- **Локальное хранение**: никаких внешних баз данных
- **Экспорт чатов**: JSON, TXT, Markdown форматы
- **Retry логика**: надежная обработка запросов
- **TypeScript**: полная типизация
- **Современный стек**: Next.js 15, Zustand, Tailwind CSS

## 🚀 Быстрый старт

### Требования
- Node.js 18+ 
- pnpm (рекомендуется)
- Git

### Установка

```bash
# Клонирование репозитория
git clone https://github.com/Komar635/komar_ai.git
cd komar_ai

# Установка зависимостей
pnpm install

# Копирование файла конфигурации
cp .env.example .env.local

# Запуск в режиме разработки
pnpm dev
```

Откройте [http://localhost:3000](http://localhost:3000) в браузере.

## ⚙️ Конфигурация

### Провайдеры ИИ

Создайте файл `.env.local` и настройте нужный провайдер:

```bash
# Выберите провайдера
AI_PROVIDER=huggingface  # huggingface | ollama | openai | mock

# Hugging Face (рекомендуется для начала)
HUGGINGFACE_TOKEN=your_token_here

# OpenAI (опционально)
OPENAI_API_KEY=your_api_key_here

# Ollama (для локального запуска)
OLLAMA_URL=http://localhost:11434
```

### Получение токена Hugging Face

1. Зарегистрируйтесь на [huggingface.co](https://huggingface.co)
2. Перейдите в Settings → Access Tokens
3. Создайте новый токен
4. Добавьте в `.env.local`

### Локальный запуск с Ollama

```bash
# Установка Ollama
# Скачайте с https://ollama.ai

# Загрузка модели (например, Llama 2)
ollama pull llama2:7b

# Запуск сервера (по умолчанию :11434)
ollama serve
```

## 📱 Использование

### Режимы работы

**🚀 Быстрый режим**
- Мгновенные ответы (1-5 сек)
- Краткие и точные ответы
- Идеально для простых вопросов

**🧠 Глубокий анализ**
- Детальная проработка (5-30 сек)
- Пошаговые рассуждения
- Анализ с разных точек зрения

### Управление чатами

- **Создание**: Кнопка "+" или начните печатать
- **Поиск**: Поле поиска в боковой панели
- **Теги**: Автоматическая группировка
- **Экспорт**: Кнопка "..." → Экспорт

## 🏗️ Архитектура

```
komair/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes
│   │   ├── globals.css     # Глобальные стили
│   │   └── layout.tsx      # Корневой лэйаут
│   ├── components/         # React компоненты
│   │   └── chat/          # Компоненты чата
│   └── lib/               # Утилиты и сервисы
├── docs/                  # Документация
├── PRD.md                 # Техническое задание
└── DEVELOPMENT_PLAN.md    # План разработки
```

### Технологический стек

**Frontend:**
- ⚡ Next.js 15 - React фреймворк
- 🎨 Tailwind CSS - Стилизация
- 🧠 Zustand - Управление состоянием
- 📝 TypeScript - Типизация

**AI/Backend:**
- 🤖 Hugging Face - Основной провайдер ИИ
- 🏠 Ollama - Локальные модели
- 🔄 Retry логика - Надежность
- 📊 API Routes - Serverless функции

## 🎯 Дорожная карта

### MVP ✅ (Завершено)
- [x] Базовый чат-интерфейс
- [x] Интеграция с ИИ
- [x] История и поиск
- [x] Два режима ответов
- [x] Темы и адаптивность

### v2.0 🚧 (В планах)
- [ ] Работа с изображениями
- [ ] Голосовые сообщения
- [ ] Плагины и расширения
- [ ] Мобильное приложение
- [ ] Облачная синхронизация

### v3.0 🔮 (Будущее)
- [ ] Fine-tuning моделей
- [ ] Многопользовательский режим
- [ ] API для разработчиков
- [ ] Интеграции с внешними сервисами

## 🤝 Участие в разработке

Мы приветствуем вклад сообщества! Пожалуйста:

1. Форкните репозиторий
2. Создайте ветку (`git checkout -b feature/amazing-feature`)
3. Зафиксируйте изменения (`git commit -m 'Add amazing feature'`)
4. Отправьте в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

### Правила разработки

- Следуйте TypeScript конвенциям
- Добавляйте тесты для новой функциональности
- Обновляйте документацию
- Соблюдайте code style (ESLint)

## 📄 Лицензия

MIT License - подробности в файле [LICENSE](LICENSE)

## 👥 Команда

- **Komar635** - Создатель и основной разработчик
- **Qoder AI** - ИИ-ассистент для разработки

## 📞 Поддержка

- 🐛 **Баги**: [GitHub Issues](https://github.com/Komar635/komar_ai/issues)
- 💡 **Идеи**: [GitHub Discussions](https://github.com/Komar635/komar_ai/discussions)
- 📧 **Email**: [создать issue](https://github.com/Komar635/komar_ai/issues/new)

---

**Komair** - Умный ИИ для умных людей 🚀