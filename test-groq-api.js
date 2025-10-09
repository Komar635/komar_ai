// Тестовый скрипт для проверки работы Groq API
const https = require('https');

// Получаем API ключ из переменных окружения
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY не настроен!');
  console.log('Пожалуйста, установите переменную окружения GROQ_API_KEY');
  process.exit(1);
}

// Тестовый запрос к Groq API
const testData = {
  model: 'llama-3.1-8b-instant',
  messages: [
    {
      role: 'user',
      content: 'Привет! Это тестовое сообщение для проверки работы Groq API.'
    }
  ],
  max_tokens: 100,
  temperature: 0.7
};

const options = {
  hostname: 'api.groq.com',
  port: 443,
  path: '/openai/v1/chat/completions',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${GROQ_API_KEY}`,
    'Content-Type': 'application/json'
  }
};

console.log('🚀 Отправляем тестовый запрос к Groq API...');

const req = https.request(options, (res) => {
  let data = '';
  
  console.log(`📥 Статус ответа: ${res.statusCode}`);
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (response.error) {
        console.error('❌ Ошибка Groq API:', response.error);
        process.exit(1);
      }
      
      if (response.choices && response.choices[0] && response.choices[0].message) {
        console.log('✅ Groq API работает корректно!');
        console.log('Ответ:', response.choices[0].message.content);
        console.log('Модель:', response.model);
      } else {
        console.log('⚠️ Неожиданный формат ответа:', data);
      }
    } catch (error) {
      console.error('❌ Ошибка парсинга ответа:', error.message);
      console.log('Данные ответа:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Сетевая ошибка:', error.message);
  process.exit(1);
});

req.write(JSON.stringify(testData));
req.end();

console.log('⏳ Ожидаем ответ от Groq API...');